import mongoose from "mongoose";

const eventSchema = mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, "Le nom de l'événement est obligatoire"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "La date est obligatoire"],
    },
    dateFin: {
      type: Date,
      required: false,
    },
    lieu: {
      type: String,
      required: [true, "Le lieu est obligatoire"],
    },
    description: {
      type: String,
      required: [true, "La description est obligatoire"],
    },
    descriptionLongue: {
      type: String,
      default: "",
    },
    prix: {
      type: Number,
      required: [true, "Le prix est obligatoire"],
    },
    placesTotales: {
      type: Number,
      required: [true, "Le nombre total de places est obligatoire"],
    },
    placesRestantes: {
      type: Number,
      required: true,
    },
    duree: {
      type: Number,
      required: false,
      default: 1,
      min: 1,
    },
    tailleGroupeMin: {
      type: Number,
      default: 1,
    },
    tailleGroupeMax: {
      type: Number,
      default: 20,
    },
    difficulte: {
      type: String,
      enum: ["Très facile", "Facile", "Modérée", "Difficile", "Très difficile"],
      default: "Modérée",
    },
    langues: {
      type: [String],
      default: ["Français"],
    },
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    categorie: {
      type: String,
      enum: [
        "concert",
        "excursion",
        "formation",
        "soiree",
        "culture",
        "festival",
        "sport",
        "autre",
      ],
      default: "autre",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    // Pour la page de détail
    servicesInclus: {
      type: [String],
      default: [],
    },
    servicesNonInclus: {
      type: [String],
      default: [],
    },
    informationsPratiques: {
      type: String,
      default: "",
    },
    itineraire: [
      {
        jour: Number,
        titre: String,
        description: String,
        activites: [String],
      },
    ],
    momentsForts: {
      type: [String],
      default: [],
    },
    recommandations: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Initialiser placesRestantes = placesTotales à la création
eventSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();

  if (update.dateFin && update.date) {
    const dateFin = new Date(update.dateFin);
    const date = new Date(update.date);
    const diffTime = Math.abs(dateFin - date);
    update.duree = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
});

// Middleware pour calculer la durée avant la mise à jour
eventSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  if (update.dateFin && update.date) {
    const dateFin = new Date(update.dateFin);
    const date = new Date(update.date);
    const diffTime = Math.abs(dateFin - date);
    update.duree = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  next();
});

export default mongoose.model("Event", eventSchema);
