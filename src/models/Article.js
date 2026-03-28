// src/models/Article.js
import mongoose from "mongoose";
import slugify from "slugify";

const articleSchema = mongoose.Schema(
  {
    titre: {
      type: String,
      required: [true, "Le titre est obligatoire"],
      trim: true,
    },
    slug: String,
    contenu: {
      type: String,
      required: [true, "Le contenu est obligatoire"],
    },
    auteur: {
      type: String,
      required: true,
      default: "Admin Even Travel",
    },
    categorie: {
      type: String,
      required: [true, "La catégorie est obligatoire"],
      trim: true,
    },
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    published: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Créer slug avant sauvegarde
articleSchema.pre("save", function () {
  this.slug = slugify(this.titre, { lower: true });
});

export default mongoose.model("Article", articleSchema);
