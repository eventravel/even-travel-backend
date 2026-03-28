// routes/destinations.js
import express from "express";
import {
  createDestination,
  getAllDestinations,
  getDestination,
  updateDestination,
  deleteDestination,
} from "../controllers/destinationController.js";
import { protect } from "../middlewares/protect.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

// Routes publiques
router.get("/", getAllDestinations);
router.get("/:id", getDestination);

// Routes admin seulement
router.use(protect);

// 🔥 CORRECTION : Utiliser upload.array() au lieu de upload.single()
router.post("/", upload.array("images", 5), createDestination); // 'images' est le nom du champ dans FormData

router
  .route("/:id")
  .patch(upload.array("images", 5), updateDestination)
  .delete(deleteDestination);

export default router;
