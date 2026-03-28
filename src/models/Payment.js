import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: true,
    },
    reference: { type: String, unique: true },
    monerooId: { type: String, unique: true },
    montant: { type: Number, required: true },
    methodePaiement: {
      type: String,
      enum: ["carte", "paypal", "mtn", "moov", "autre"],
      default: "autre",
    },
    statut: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "refunded"],
      default: "pending",
    },
    details: {
      transactionId: String,
      payerEmail: String,
      payerName: String,
    },
    metadata: { type: Map, of: String },
  },
  { timestamps: true },
);

paymentSchema.pre("save", async function () {
  if (!this.reference) {
    const date = new Date();
    const timestamp = date.getTime();
    const random = Math.floor(Math.random() * 1000);
    this.reference = `PAY-${timestamp}-${random}`;
  }
});

export default mongoose.model("Payment", paymentSchema);
