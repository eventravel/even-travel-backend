import Reservation from "../models/Reservation.js";
import Event from "../models/Event.js";
import Destination from "../models/Destination.js";
import catchAsync from "../utils/catchAsync.js";
import Payment from "../models/Payment.js";
import axios from "axios";

//
// =======================
// GET ALL RESERVATIONS
// =======================
//
export const getAllReservations = catchAsync(async (req, res) => {
  const reservations = await Reservation.find().sort({ createdAt: -1 }).lean();
  const populatedReservations = [];
  for (const reservation of reservations) {
    let itemDetails = null;
    if (reservation.type === "event") {
      itemDetails = await Event.findById(reservation.itemId)
        .select("nom lieu prix")
        .lean();
    } else if (reservation.type === "destination") {
      itemDetails = await Destination.findById(reservation.itemId)
        .select("titre localisation prix")
        .lean();
    }
    populatedReservations.push({
      ...reservation,
      itemDetails,
    });
  }
  res.status(200).json({
    status: "success",
    results: populatedReservations.length,
    data: { reservations: populatedReservations },
  });
});

//
// =======================
// GET ONE RESERVATION
// =======================
//
export const getReservationById = catchAsync(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id)
    .populate("itemId", "nom titre lieu localisation prix description")
    .lean();
  if (!reservation) {
    return res.status(404).json({
      status: "fail",
      message: "Réservation non trouvée",
    });
  }
  res.status(200).json({
    status: "success",
    data: { reservation },
  });
});

//
// =======================
// UPDATE STATUS
// =======================
//
export const updateReservationStatus = catchAsync(async (req, res) => {
  const { statutPaiement } = req.body;
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) {
    return res.status(404).json({
      status: "fail",
      message: "Réservation non trouvée",
    });
  }
  const ancienStatut = reservation.statutPaiement;
  reservation.statutPaiement = statutPaiement;

  if (statutPaiement === "paye" && reservation.type === "event") {
    await Event.findByIdAndUpdate(reservation.itemId, {
      $inc: { placesRestantes: -reservation.nombrePlaces },
    });
  }

  if (
    statutPaiement === "annule" &&
    ancienStatut === "paye" &&
    reservation.type === "event"
  ) {
    await Event.findByIdAndUpdate(reservation.itemId, {
      $inc: { placesRestantes: reservation.nombrePlaces },
    });
  }

  await reservation.save();
  res.status(200).json({
    status: "success",
    data: { reservation },
  });
});

//
// =======================
// DELETE RESERVATION
// =======================
//
export const deleteReservation = catchAsync(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) {
    return res.status(404).json({
      status: "fail",
      message: "Réservation non trouvée",
    });
  }

  if (reservation.statutPaiement === "paye" && reservation.type === "event") {
    await Event.findByIdAndUpdate(reservation.itemId, {
      $inc: { placesRestantes: reservation.nombrePlaces },
    });
  }

  await reservation.deleteOne();
  res.status(204).json({
    status: "success",
    data: null,
  });
});

//
// =======================
// STATS
// =======================
//
export const getReservationStats = catchAsync(async (req, res) => {
  const stats = await Reservation.aggregate([
    {
      $group: {
        _id: null,
        totalReservations: { $sum: 1 },
        totalRevenue: { $sum: "$montantTotal" },
        totalPaid: { $sum: "$montantPaye" },
        pendingCount: {
          $sum: { $cond: [{ $eq: ["$statutPaiement", "en_attente"] }, 1, 0] },
        },
        paidCount: {
          $sum: { $cond: [{ $eq: ["$statutPaiement", "paye"] }, 1, 0] },
        },
        depositCount: {
          $sum: { $cond: [{ $eq: ["$statutPaiement", "acompte"] }, 1, 0] },
        },
        cancelledCount: {
          $sum: { $cond: [{ $eq: ["$statutPaiement", "annule"] }, 1, 0] },
        },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      stats: stats[0] || {
        totalReservations: 0,
        totalRevenue: 0,
        totalPaid: 0,
        pendingCount: 0,
        paidCount: 0,
        depositCount: 0,
        cancelledCount: 0,
      },
    },
  });
});

//
// =======================
// CREATE RESERVATION (sans paiement)
// =======================
//
export const createReservation = catchAsync(async (req, res) => {
  const {
    client,
    type,
    itemId,
    date,
    nombrePlaces,
    message,
    tranche = "unique",
  } = req.body;

  let typeModel;
  let item;
  let prixUnitaire;

  if (type === "event") {
    typeModel = "Event";
    item = await Event.findById(itemId);
    if (!item)
      return res
        .status(404)
        .json({ status: "fail", message: "Événement non trouvé" });
    prixUnitaire = item.prix || 0;

    if (
      item.placesRestantes !== undefined &&
      item.placesRestantes < nombrePlaces
    ) {
      return res.status(400).json({
        status: "fail",
        message: `Il ne reste que ${item.placesRestantes} places disponibles`,
      });
    }
  } else if (type === "destination") {
    typeModel = "Destination";
    item = await Destination.findById(itemId);
    if (!item)
      return res
        .status(404)
        .json({ status: "fail", message: "Destination non trouvée" });
    prixUnitaire = item.prix || 0;
  } else {
    return res.status(400).json({
      status: "fail",
      message: "Type de réservation invalide",
    });
  }

  const montantTotal = prixUnitaire * nombrePlaces;
  const montantPaye =
    tranche === "deux" ? Math.ceil(montantTotal / 2) : montantTotal;

  const reservation = await Reservation.create({
    client,
    type,
    typeModel,
    itemId,
    date: new Date(date),
    nombrePlaces,
    message,
    tranche,
    montantTotal,
    montantPaye,
    statutPaiement: "en_attente",
  });

  res.status(201).json({
    status: "success",
    data: { reservation },
  });
});

//
// =======================
// INIT PAYMENT (avec Moneroo) – Version corrigée et complète
// =======================
export const initPayment = catchAsync(async (req, res) => {
  const {
    client,
    type,
    itemId,
    date,
    nombrePlaces,
    message,
    planPaiement = "unique",
    methodePaiement = "mtn",
    methods = [],
    metadata = {},
  } = req.body;

  if (!client || !type || !itemId || !date || !nombrePlaces) {
    return res.status(400).json({
      status: "fail",
      message: "Données de réservation incomplètes",
    });
  }

  let item, prixUnitaire, itemName, itemLocation, placesRestantes;
  if (type === "event") {
    item = await Event.findById(itemId);
    if (!item)
      return res
        .status(404)
        .json({ status: "fail", message: "Événement non trouvé" });
    prixUnitaire = item.prix || 0;
    itemName = item.nom;
    itemLocation = item.lieu;
    placesRestantes = item.placesRestantes ?? Infinity;
  } else if (type === "destination") {
    item = await Destination.findById(itemId);
    if (!item)
      return res
        .status(404)
        .json({ status: "fail", message: "Destination non trouvée" });
    prixUnitaire = item.prix || 0;
    itemName = item.titre;
    itemLocation = item.localisation;
    placesRestantes = item.placesDisponibles ?? Infinity;
  } else {
    return res
      .status(400)
      .json({ status: "fail", message: "Type de réservation invalide" });
  }

  if (nombrePlaces > placesRestantes) {
    return res.status(400).json({
      status: "fail",
      message: `Il ne reste que ${placesRestantes} place(s) disponible(s)`,
    });
  }

  const montantTotal = prixUnitaire * nombrePlaces;
  if (montantTotal <= 0) {
    return res
      .status(400)
      .json({ status: "fail", message: "Montant invalide" });
  }

  const reservation = await Reservation.create({
    client,
    type,
    typeModel: type === "event" ? "Event" : "Destination",
    itemId,
    date: new Date(date),
    nombrePlaces,
    message,
    planPaiement,
    montantTotal,
    montantPaye: 0,
    statutPaiement: "en_attente",
  });

  let montantAEnvoyer = montantTotal;
  if (planPaiement === "deux_tranches") {
    montantAEnvoyer = Math.ceil(montantTotal / 2);
  }

  let monerooMethods = ["mtn_bj", "moov_bj"];
  if (methodePaiement) {
    switch (methodePaiement.toLowerCase()) {
      case "mtn":
        monerooMethods = ["mtn_bj"];
        break;
      case "moov":
        monerooMethods = ["moov_bj"];
        break;
      case "carte":
        monerooMethods = ["card_xof"];
        break;
      case "paypal":
        monerooMethods = ["paypal"];
        break;
      default:
        monerooMethods = ["mtn_bj", "moov_bj"];
    }
  }

  const monerooPayload = {
    amount: montantAEnvoyer,
    currency: "XOF",
    description: `Réservation ${type} - ${itemName}`,
    customer: {
      email: client.email,
      first_name: client.prenom,
      last_name: client.nom,
      phone: client.telephone || "",
    },
    return_url: `http://localhost:5000/paiement-success?reservationId=${reservation._id}`, // ← EN DUR ICI
    metadata: {
      reservationId: reservation._id.toString(),
      clientEmail: client.email, // ← corrigé
      ...metadata,
    },
    methods: monerooMethods,
  };

  const MONEROO_SECRET_KEY = "pvk_sandbox_ui6f2x|01KJD97QRCDY26QAGSBRD23T80";

  try {
    const response = await axios.post(
      "https://api.moneroo.io/v1/payments/initialize",
      monerooPayload,
      {
        headers: {
          Authorization: `Bearer ${MONEROO_SECRET_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 15000,
      },
    );

    console.log("Moneroo succès:", response.data);

    const { id: monerooId, checkout_url } = response.data.data;

    const payment = await Payment.create({
      reservation: reservation._id,
      montant: montantAEnvoyer,
      methodePaiement,
      statut: "pending",
      details: {
        transactionId: monerooId,
        payerName: `${client.prenom} ${client.nom}`,
        payerEmail: client.email,
      },
      metadata: monerooPayload.metadata,
    });

    reservation.transactionId = monerooId;
    await reservation.save();

    res.status(200).json({
      status: "success",
      data: {
        reservation: {
          _id: reservation._id,
          montantTotal: reservation.montantTotal,
          montantPaye: reservation.montantPaye,
          planPaiement,
          checkout_url,
          itemName,
          itemLocation,
          date: reservation.date,
          nombrePlaces,
        },
        payment: {
          _id: payment._id,
          montant: payment.montant,
          methodePaiement: payment.methodePaiement,
          statut: payment.statut,
          checkout_url,
        },
      },
    });
  } catch (error) {
    console.error("Erreur Moneroo:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    res.status(error.response?.status || 500).json({
      status: "fail",
      message: "Erreur lors de l’initialisation du paiement Moneroo",
      details: error.response?.data?.message || error.message,
    });
  }
});
