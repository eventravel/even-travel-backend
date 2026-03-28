import express from "express";
import { protect } from "../middlewares/protect.js";
import {
  getAllPayments,
  getPaymentById,
  updatePaymentStatus,
  deletePayment,
  getPaymentStats,
  initializePayment,
  paymentWebhook,
} from "../controllers/paiementController.js";

const router = express.Router();
// webhook public, pas de protection JWT
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentWebhook,
);

router.post("/init", initializePayment);
router.use(protect);
router.get("/", getAllPayments);
router.get("/stats", getPaymentStats);
router.get("/:id", getPaymentById);
router.delete("/:id", deletePayment);
router.patch("/:id/status", updatePaymentStatus);

export default router;
