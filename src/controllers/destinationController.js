import Destination from "../models/Destination.js";
import catchAsync from "../utils/catchAsync.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

// Fonction utilitaire pour parser les données
const parseData = (data) => {
  try {
    // Si c'est déjà un objet/tableau, on le retourne tel quel
    if (typeof data === "object" && data !== null) {
      return data;
    }
    // Si c'est une chaîne, on essaye de la parser
    if (typeof data === "string" && data.trim() !== "") {
      return JSON.parse(data);
    }
    // Pour les autres cas (undefined, null, empty string)
    return data;
  } catch (error) {
    console.error("Erreur parsing:", error.message, "Data:", data);
    // En cas d'erreur, retourner un tableau vide pour les arrays
    if (Array.isArray(data)) {
      return data;
    }
    return data;
  }
};

// CREATE
export const createDestination = catchAsync(async (req, res) => {
  const {
    titre,
    description,
    descriptionLongue,
    prix,
    localisation,
    pays,
    region,
    datesDisponibles,
    categorie,
    featured,
    placesDisponibles,
    // Nouveaux champs
    climat,
    temperatureMin,
    temperatureMax,
    devise,
    langues,
    aeroport,
    fuseauHoraire,
    meilleurePeriode,
    budgetJournalier,
    sitesVisiter,
    experiencesCulturelles,
    gastronomie,
    informationsPratiques,
    metaDescription,
    motsCles,
  } = req.body;

  const images = [];

  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const result = await uploadToCloudinary(file, "even-travel/destinations");
      images.push({
        url: result.url,
        public_id: result.public_id,
      });
    }
  }

  // ✅ CORRECTION : Utiliser parseData au lieu de JSON.parse direct
  const destinationData = {
    titre,
    description,
    descriptionLongue: descriptionLongue || description,
    prix: Number(prix) || 0,
    localisation,
    pays: pays || "Bénin",
    region: region || "",
    datesDisponibles: parseData(datesDisponibles) || [], // ✅ CORRIGÉ
    images,
    categorie: categorie || "culture",
    featured: featured === "true" || featured === true,
    placesDisponibles: Number(placesDisponibles) || 20,
    // Nouveaux champs
    climat: climat || "Tropical",
    temperatureMin: Number(temperatureMin) || 25,
    temperatureMax: Number(temperatureMax) || 32,
    devise: devise || "Franc CFA (XOF)",
    langues: parseData(langues) || ["Français"], // ✅ CORRIGÉ
    aeroport: aeroport || "",
    fuseauHoraire: fuseauHoraire || "GMT+1",
    meilleurePeriode: meilleurePeriode || "Novembre - Mars",
    budgetJournalier: budgetJournalier || "50-100€",
    sitesVisiter: parseData(sitesVisiter) || [], // ✅ CORRIGÉ
    experiencesCulturelles: experiencesCulturelles || "",
    gastronomie: parseData(gastronomie) || [], // ✅ CORRIGÉ
    informationsPratiques: informationsPratiques || "",
    metaDescription:
      metaDescription || (description ? description.substring(0, 160) : ""),
    motsCles: parseData(motsCles) || [], // ✅ CORRIGÉ
  };

  const destination = await Destination.create(destinationData);

  res.status(201).json({
    status: "success",
    data: { destination },
  });
});

// READ ALL + Filtres
export const getAllDestinations = catchAsync(async (req, res) => {
  const { prixMax, categorie, localisation, featured } = req.query;

  let query = {};

  if (prixMax) query.prix = { $lte: Number(prixMax) };
  if (categorie) query.categorie = categorie;
  if (localisation)
    query.localisation = { $regex: localisation, $options: "i" };
  if (featured === "true") query.featured = true;

  const destinations = await Destination.find(query).sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: destinations.length,
    data: { destinations },
  });
});

// READ ONE
export const getDestination = catchAsync(async (req, res) => {
  const destination = await Destination.findById(req.params.id);
  if (!destination) {
    return res.status(404).json({
      status: "fail",
      message: "Destination non trouvée",
    });
  }
  res.status(200).json({
    status: "success",
    data: { destination },
  });
});

// UPDATE
export const updateDestination = catchAsync(async (req, res) => {
  const updates = { ...req.body };

  // Gestion des nouvelles images
  if (req.files && req.files.length > 0) {
    const oldDestination = await Destination.findById(req.params.id);
    if (oldDestination && oldDestination.images.length > 0) {
      for (const img of oldDestination.images) {
        await deleteFromCloudinary(img.public_id);
      }
    }

    const images = [];
    for (const file of req.files) {
      try {
        const result = await uploadToCloudinary(
          file,
          "even-travel/destinations",
        );
        images.push({
          url: result.url,
          public_id: result.public_id,
        });
        await new Promise((resolve) => setTimeout(resolve, 800));
      } catch (err) {
        console.error("Erreur upload image:", err.message);
      }
    }
    updates.images = images;
  }

  // ✅ CORRECTION : Utiliser parseData pour tous les champs
  const arrayFields = [
    "datesDisponibles",
    "langues",
    "sitesVisiter",
    "gastronomie",
    "motsCles",
  ];

  arrayFields.forEach((field) => {
    if (updates[field] !== undefined) {
      updates[field] = parseData(updates[field]);
    }
  });

  // Conversion des nombres
  if (updates.prix) updates.prix = Number(updates.prix);
  if (updates.placesDisponibles)
    updates.placesDisponibles = Number(updates.placesDisponibles);
  if (updates.temperatureMin)
    updates.temperatureMin = Number(updates.temperatureMin);
  if (updates.temperatureMax)
    updates.temperatureMax = Number(updates.temperatureMax);

  // Conversion boolean
  if (updates.featured !== undefined) {
    updates.featured = updates.featured === "true" || updates.featured === true;
  }

  // Mise à jour
  const destination = await Destination.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true },
  );

  if (!destination) {
    return res.status(404).json({
      status: "fail",
      message: "Destination non trouvée",
    });
  }

  res.status(200).json({
    status: "success",
    data: { destination },
  });
});

// DELETE – Propre et sûr
export const deleteDestination = catchAsync(async (req, res) => {
  const destination = await Destination.findById(req.params.id);
  if (!destination) {
    return res.status(404).json({
      status: "fail",
      message: "Destination non trouvée",
    });
  }

  // Supprimer toutes les images de Cloudinary
  if (destination.images.length > 0) {
    for (const img of destination.images) {
      await deleteFromCloudinary(img.public_id);
    }
  }

  await destination.deleteOne();

  res.status(204).json({
    status: "success",
    data: null,
  });
});
