import express from "express";
import {
  createEvent,
  getAllEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  updatePlaces,
} from "../controllers/eventController.js";
import { protect } from "../middlewares/protect.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

// Routes publiques
router.get("/", getAllEvents);
router.get("/:id", getEvent);

// Routes admin (protégées)
router.use(protect);

router.post("/", upload.single("image"), createEvent);
router.patch("/:id", upload.single("image"), updateEvent);
router.delete("/:id", deleteEvent);

// Route spéciale pour mettre à jour les places
router.patch("/:id/places", updatePlaces);

export default router;
