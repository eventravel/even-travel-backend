import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    client: {
      nom: { type: String, required: true },
      prenom: { type: String, required: true },
      email: { type: String, required: true },
      telephone: { type: String, required: true },
    },
    type: {
      type: String,
      enum: ["event", "destination"],
      required: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "typeModel",
    },
    typeModel: {
      type: String,
      enum: ["Event", "Destination"],
      required: true,
    },
    date: { type: Date, required: true },
    nombrePlaces: { type: Number, required: true, min: 1 },
    message: String,
    planPaiement: {
      type: String,
      enum: ["unique", "deux_tranches"],
      default: "unique",
    },
    montantTotal: { type: Number, required: true },
    montantPaye: { type: Number, default: 0 },
    statutPaiement: {
      type: String,
      enum: ["en_attente", "acompte", "paye", "annule"],
      default: "en_attente",
    },
    transactionId: String,
    paymentUrl: String,
  },
  {
    timestamps: true,
  },
);

reservationSchema.virtual("item", {
  ref: function () {
    return this.typeModel;
  },
  localField: "itemId",
  foreignField: "_id",
  justOne: true,
});

export default mongoose.model("Reservation", reservationSchema);
