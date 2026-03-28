import express from "express";
import { protect } from "../middlewares/protect.js";
import upload from "../middlewares/upload.js";
import {
  createArticle,
  updateArticle,
  deleteArticle,
  approveComment,
  deleteComment,
  getAllCommentsAdmin,
  getAllArticlesAdmin,
  getArticleAdmin,
} from "../controllers/blogController.js";

const router = express.Router();

// Toutes les routes admin sont protégées
router.use(protect);

// Routes admin pour les articles
router.get("/articles", getAllArticlesAdmin);
router.get("/articles/:id", getArticleAdmin);
router.post("/articles", upload.array("images", 6), createArticle);
router.patch("/articles/:id", upload.array("images", 6), updateArticle);
router.delete("/articles/:id", deleteArticle);

// Routes admin pour les commentaires
router.get("/comments", getAllCommentsAdmin);
router.patch("/comments/:commentId/approve", approveComment);
router.delete("/comments/:commentId", deleteComment);

export default router;
