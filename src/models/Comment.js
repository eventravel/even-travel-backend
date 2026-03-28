// src/models/Comment.js
import mongoose from "mongoose";

const commentSchema = mongoose.Schema(
  {
    article: {
      type: mongoose.Schema.ObjectId,
      ref: "Article",
      required: true,
    },
    nom: {
      type: String,
      required: [true, "Le nom est obligatoire"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Le message est obligatoire"],
    },
    approved: {
      type: Boolean,
      default: false, // Modération manuelle
    },
  },
  { timestamps: true },
);

export default mongoose.model("Comment", commentSchema);
