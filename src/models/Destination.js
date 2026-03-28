import mongoose from "mongoose";

const destinationSchema = new mongoose.Schema(
  {
    titre: {
      type: String,
      required: [true, "Le titre de la destination est requis"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "La description de la destination est requise"],
    },
    descriptionLongue: {
      type: String,
      default: "",
    },
    prix: {
      type: Number,
      required: [true, "Le prix de la destination est requis"],
      min: [0, "Le prix ne peut pas être négatif"],
    },
    localisation: {
      type: String,
      required: [true, "La localisation est requise"],
    },
    pays: {
      type: String,
      required: [true, "Le pays est requis"],
    },
    region: {
      type: String,
      default: "",
    },
    datesDisponibles: [
      {
        debut: {
          type: Date,
          required: true,
        },
        fin: {
          type: Date,
          required: true,
        },
        _id: false,
      },
    ],
    images: [
      {
        url: String,
        public_id: String,
      },
    ],
    categorie: {
      type: String,
      enum: [
        "weekend",
        "culture",
        "nature",
        "aventure",
        "plage",
        "montagne",
        "urbain",
        "historique",
      ],
      default: "culture",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    placesDisponibles: {
      type: Number,
      required: [true, "Le nombre de places disponibles est requis"],
      min: [0, "Le nombre de places ne peut pas être négatif"],
    },
    // Nouveaux champs pour la page de détail
    climat: {
      type: String,
      default: "Tropical",
    },
    temperatureMin: {
      type: Number,
      default: 25,
    },
    temperatureMax: {
      type: Number,
      default: 32,
    },
    devise: {
      type: String,
      default: "Franc CFA (XOF)",
    },
    langues: {
      type: [String],
      default: ["Français"],
    },
    aeroport: {
      type: String,
      default: "",
    },
    fuseauHoraire: {
      type: String,
      default: "GMT+1",
    },
    meilleurePeriode: {
      type: String,
      default: "Novembre - Mars",
    },
    budgetJournalier: {
      type: String,
      default: "50-100€",
    },
    // Informations détaillées
    sitesVisiter: {
      type: [String],
      default: [],
    },
    experiencesCulturelles: {
      type: String,
      default: "",
    },
    gastronomie: {
      type: [String],
      default: [],
    },
    informationsPratiques: {
      type: String,
      default: "",
    },
    // Meta-données pour SEO
    metaDescription: {
      type: String,
      default: "",
    },
    motsCles: {
      type: [String],
      default: [],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

destinationSchema.pre("save", async function () {
  if (this.titre && (!this.slug || this.isModified("titre"))) {
    this.slug = this.titre
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-");
  }
});

const Destination = mongoose.model("Destination", destinationSchema);

export default Destination;
