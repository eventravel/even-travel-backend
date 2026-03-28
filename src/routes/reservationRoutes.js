import express from "express";
import {
  getAllReservations,
  getReservationById,
  updateReservationStatus,
  deleteReservation,
  getReservationStats,
  createReservation, // Nouvelle fonction
  initPayment, // Nouvelle fonction
} from "../controllers/reservationController.js";

import { protect } from "../middlewares/protect.js";

const router = express.Router();

// Route publique pour créer une réservation (pas besoin de protection)
router.post("/", createReservation);
router.post("/initier", initPayment);

// Protéger les routes suivantes (pour admin uniquement)
router.use(protect);

router.get("/", getAllReservations);
router.get("/stats", getReservationStats);
router.get("/:id", getReservationById);
router.delete("/:id", deleteReservation);
router.patch("/:id/status", updateReservationStatus);

export default router;
