import Payment from "../models/Payment.js";
import Reservation from "../models/Reservation.js";
import catchAsync from "../utils/catchAsync.js";
import crypto from "crypto";
import axios from "axios";

// =========================
// Initialiser un paiement
// =========================
export const initializePayment = catchAsync(async (req, res) => {
  const { reservationId } = req.body;
  if (!reservationId)
    return res
      .status(400)
      .json({ status: "fail", message: "Reservation ID manquant" });

  const reservation = await Reservation.findById(reservationId);
  if (!reservation)
    return res
      .status(404)
      .json({ status: "fail", message: "Réservation introuvable" });

  const montantRestant = reservation.montantTotal - reservation.montantPaye;
  if (montantRestant <= 0)
    return res.status(400).json({
      status: "fail",
      code: "already_paid",
      message: "Réservation déjà payée",
    });

  // Calcul du montant à payer
  let montantAEnvoyer =
    reservation.planPaiement === "deux_tranches"
      ? reservation.montantPaye === 0
        ? Math.ceil(reservation.montantTotal / 2)
        : montantRestant
      : montantRestant;

  if (montantAEnvoyer <= 0)
    return res
      .status(400)
      .json({ status: "fail", message: "Montant invalide" });

  const description = `Paiement réservation #${reservation._id}`;
  const returnUrl = `${process.env.BASE_URL}/paiement-success`; // ← BASE_URL pas dans ton .env → à définir !

  // Préparer la requête Moneroo Standard
  const data = {
    amount: montantAEnvoyer,
    currency: "XOF",
    description,
    customer: {
      email: reservation.client.email,
      first_name: reservation.client.prenom,
      last_name: reservation.client.nom,
      phone: reservation.client.telephone || "",
    },
    return_url: returnUrl,
    metadata: {
      reservation_id: reservation._id.toString(),
      client_id: reservation.client._id.toString(),
    },
  };

  const MONEROO_SECRET_KEY = "pvk_sandbox_67q2p|01KJ5CFKT2V0N494XA0JTDBRJY";

  const options = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MONEROO_SECRET_KEY}`,
      Accept: "application/json",
    },
  };

  const response = await axios.post(
    "https://api.moneroo.io/v1/payments/initialize",
    data,
    options,
  );

  // Enregistrer le paiement dans la base
  const payment = await Payment.create({
    reservation: reservation._id,
    montant: montantAEnvoyer,
    monerooId: response.data.data.id,
    statut: "pending",
  });

  reservation.transactionId = response.data.data.id;
  await reservation.save();

  res.status(200).json({
    status: "success",
    data: {
      paymentUrl: response.data.data.checkout_url,
      montant: montantAEnvoyer,
      paymentId: payment._id,
    },
  });
});

// =========================
// Webhook Moneroo
// =========================
export const paymentWebhook = async (req, res) => {
  const signature = req.headers["x-moneroo-signature"];
  const payload = req.body; // Buffer brut

  const MONEROO_WEBHOOK_SECRET =
    "ih_01KJ57X9W01Y5SK7QWBKYZZHGV_fjeg3e9ttp6i_huuDhwGCwVny";

  const expectedSignature = crypto
    .createHmac("sha256", MONEROO_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  if (signature !== expectedSignature)
    return res.status(403).send("Signature invalide");

  const event = JSON.parse(payload.toString());

  if (event.event === "payment.success") {
    const payment = await Payment.findOne({ monerooId: event.data.id });
    if (!payment || payment.statut === "paid")
      return res.status(200).send("OK");

    payment.statut = "paid";
    await payment.save();

    const reservation = await Reservation.findById(payment.reservation);
    if (reservation) {
      reservation.montantPaye += payment.montant;
      reservation.statutPaiement =
        reservation.montantPaye >= reservation.montantTotal
          ? "paye"
          : "acompte";
      await reservation.save();
    }
  }

  res.status(200).send("OK");
};

// =========================
// Vérifier un paiement Moneroo
// =========================
export const verifyPayment = async (monerooId) => {
  const token = "pvk_sandbox_67q2p|01KJ5CFKT2V0N494XA0JTDBRJY";

  const response = await axios.get(
    `https://api.moneroo.io/v1/payments/${monerooId}/verify`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    },
  );

  if (response.status !== 200)
    throw new Error(`Erreur de vérification: ${response.status}`);

  const transaction = response.data.data;
  if (transaction.status !== "success")
    throw new Error("Le paiement n'est pas réussi");

  return transaction;
};

// =========================
// Confirmer un paiement après retour utilisateur
// =========================
export const handlePaymentVerification = async (monerooId) => {
  const transaction = await verifyPayment(monerooId);
  const payment = await Payment.findOne({ monerooId: transaction.id });
  if (!payment) throw new Error("Paiement introuvable");

  if (payment.statut === "paid") return payment;

  payment.statut = "paid";
  await payment.save();

  const reservation = await Reservation.findById(payment.reservation);
  if (reservation) {
    reservation.montantPaye += transaction.amount;
    reservation.statutPaiement =
      reservation.montantPaye >= reservation.montantTotal ? "paye" : "acompte";
    await reservation.save();
  }

  return payment;
};

// =========================
// Récupérer tous les paiements
// =========================
export const getAllPayments = catchAsync(async (req, res) => {
  const payments = await Payment.find()
    .sort({ createdAt: -1 })
    .populate({
      path: "reservation",
      populate: { path: "itemId", select: "nom titre lieu localisation prix" },
    })
    .lean();

  res.status(200).json({
    status: "success",
    results: payments.length,
    data: { payments },
  });
});

// =========================
// Récupérer un paiement par ID
// =========================
export const getPaymentById = catchAsync(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate({
      path: "reservation",
      populate: {
        path: "itemId",
        select: "nom titre lieu localisation prix description",
      },
    })
    .lean();

  if (!payment)
    return res
      .status(404)
      .json({ status: "fail", message: "Paiement non trouvé" });

  res.status(200).json({ status: "success", data: { payment } });
});

// =========================
// Mettre à jour le statut d'un paiement
// =========================
export const updatePaymentStatus = catchAsync(async (req, res) => {
  const { statut } = req.body;
  const payment = await Payment.findById(req.params.id);

  if (!payment)
    return res
      .status(404)
      .json({ status: "fail", message: "Paiement non trouvé" });

  payment.statut = statut;
  await payment.save();

  if (statut === "paid" && payment.reservation) {
    const reservation = await Reservation.findById(payment.reservation);
    if (reservation) {
      reservation.montantPaye += payment.montant;
      reservation.statutPaiement =
        reservation.montantPaye >= reservation.montantTotal
          ? "paye"
          : "acompte";
      await reservation.save();
    }
  }

  res.status(200).json({ status: "success", data: { payment } });
});

// =========================
// Supprimer un paiement
// =========================
export const deletePayment = catchAsync(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment)
    return res
      .status(404)
      .json({ status: "fail", message: "Paiement non trouvé" });

  await payment.deleteOne();
  res.status(204).json({ status: "success", data: null });
});

// =========================
// Statistiques des paiements
// =========================
export const getPaymentStats = catchAsync(async (req, res) => {
  const stats = await Payment.aggregate([
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: "$montant" },
        pendingAmount: {
          $sum: { $cond: [{ $eq: ["$statut", "pending"] }, "$montant", 0] },
        },
        paidAmount: {
          $sum: { $cond: [{ $eq: ["$statut", "paid"] }, "$montant", 0] },
        },
        cancelledAmount: {
          $sum: { $cond: [{ $eq: ["$statut", "cancelled"] }, "$montant", 0] },
        },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      stats: stats[0] || {
        totalPayments: 0,
        totalAmount: 0,
        pendingAmount: 0,
        paidAmount: 0,
        cancelledAmount: 0,
      },
    },
  });
});
