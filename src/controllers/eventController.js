import Event from "../models/Event.js";
import catchAsync from "../utils/catchAsync.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

// CREATE
export const createEvent = catchAsync(async (req, res) => {
  const data = req.body.data ? JSON.parse(req.body.data) : req.body;

  const {
    nom,
    date,
    dateFin,
    lieu,
    description,
    descriptionLongue,
    prix,
    placesTotales,
    duree,
    tailleGroupeMin,
    tailleGroupeMax,
    difficulte,
    langues,
    categorie,
    featured,
    servicesInclus,
    servicesNonInclus,
    informationsPratiques,
    itineraire,
    momentsForts,
    recommandations,
  } = data;

  const images = [];

  if (req.file) {
    const result = await uploadToCloudinary(req.file, "even-travel/events");
    images.push({
      url: result.url,
      public_id: result.public_id,
    });
  }

  // Gérer les tableaux
  const languesArray = langues
    ? Array.isArray(langues)
      ? langues
      : [langues]
    : ["Français"];
  const servicesInclusArray = servicesInclus
    ? Array.isArray(servicesInclus)
      ? servicesInclus
      : JSON.parse(servicesInclus || "[]")
    : [];
  const servicesNonInclusArray = servicesNonInclus
    ? Array.isArray(servicesNonInclus)
      ? servicesNonInclus
      : JSON.parse(servicesNonInclus || "[]")
    : [];
  const momentsFortsArray = momentsForts
    ? Array.isArray(momentsForts)
      ? momentsForts
      : JSON.parse(momentsForts || "[]")
    : [];
  const itineraireArray = itineraire
    ? Array.isArray(itineraire)
      ? itineraire
      : JSON.parse(itineraire || "[]")
    : [];

  const event = await Event.create({
    nom,
    date,
    dateFin,
    lieu,
    description,
    descriptionLongue: descriptionLongue || description,
    prix: Number(prix),
    placesTotales: Number(placesTotales),
    placesRestantes: Number(placesTotales),
    duree: Number(duree) || 1,
    tailleGroupeMin: Number(tailleGroupeMin) || 1,
    tailleGroupeMax: Number(tailleGroupeMax) || 20,
    difficulte: difficulte || "Modérée",
    langues: languesArray,
    images,
    categorie: categorie || "autre",
    featured: featured === "true" || featured === true,
    servicesInclus: servicesInclusArray,
    servicesNonInclus: servicesNonInclusArray,
    informationsPratiques,
    itineraire: itineraireArray,
    momentsForts: momentsFortsArray,
    recommandations,
  });

  res.status(201).json({
    status: "success",
    data: { event },
  });
});

// READ ALL + filtre upcoming
export const getAllEvents = catchAsync(async (req, res) => {
  const { upcoming, categorie, featured } = req.query;

  let query = {};

  if (upcoming === "true") {
    query.date = { $gte: new Date() };
  }
  if (categorie) {
    query.categorie = categorie;
  }
  if (featured === "true") {
    query.featured = true;
  }

  const events = await Event.find(query).sort({ date: 1 });

  res.status(200).json({
    status: "success",
    results: events.length,
    data: { events },
  });
});

// READ ONE
export const getEvent = catchAsync(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    return res
      .status(404)
      .json({ status: "fail", message: "Événement non trouvé" });
  }
  res.status(200).json({
    status: "success",
    data: { event },
  });
});

// UPDATE
export const updateEvent = catchAsync(async (req, res) => {
  const updates = req.body.data ? JSON.parse(req.body.data) : req.body;

  // Gérer les tableaux
  if (updates.langues && !Array.isArray(updates.langues)) {
    updates.langues = [updates.langues];
  }
  if (updates.servicesInclus && typeof updates.servicesInclus === "string") {
    updates.servicesInclus = JSON.parse(updates.servicesInclus);
  }
  if (
    updates.servicesNonInclus &&
    typeof updates.servicesNonInclus === "string"
  ) {
    updates.servicesNonInclus = JSON.parse(updates.servicesNonInclus);
  }
  if (updates.itineraire && typeof updates.itineraire === "string") {
    updates.itineraire = JSON.parse(updates.itineraire);
  }
  if (updates.momentsForts && typeof updates.momentsForts === "string") {
    updates.momentsForts = JSON.parse(updates.momentsForts);
  }

  // Gérer les images
  if (req.file) {
    const oldEvent = await Event.findById(req.params.id);

    if (oldEvent?.images?.length) {
      for (const img of oldEvent.images) {
        await deleteFromCloudinary(img.public_id);
      }
    }

    const result = await uploadToCloudinary(req.file, "even-travel/events");
    updates.images = [
      {
        url: result.url,
        public_id: result.public_id,
      },
    ];
  }

  const event = await Event.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!event) {
    return res
      .status(404)
      .json({ status: "fail", message: "Événement non trouvé" });
  }

  res.status(200).json({
    status: "success",
    data: { event },
  });
});

// DELETE
export const deleteEvent = catchAsync(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    return res
      .status(404)
      .json({ status: "fail", message: "Événement non trouvé" });
  }

  if (event.images.length > 0) {
    for (const img of event.images) {
      await deleteFromCloudinary(img.public_id);
    }
  }

  await event.deleteOne();

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Mettre à jour les places restantes après une réservation
export const updatePlaces = catchAsync(async (req, res) => {
  const { places } = req.body;

  const event = await Event.findById(req.params.id);
  if (!event) {
    return res.status(404).json({
      status: "fail",
      message: "Événement non trouvé",
    });
  }

  if (places > event.placesRestantes) {
    return res.status(400).json({
      status: "fail",
      message: `Il ne reste que ${event.placesRestantes} places disponibles`,
    });
  }

  event.placesRestantes -= places;
  await event.save();

  res.status(200).json({
    status: "success",
    data: { event },
  });
});
