import express from "express";
import {
  createArticle,
  getAllArticles,
  getArticle,
  updateArticle,
  deleteArticle,
  createComment,
  getArticleComments,
  approveComment,
  deleteComment,
  getAllCommentsAdmin,
  getAllArticlesAdmin,
} from "../controllers/blogController.js";
import { protect } from "../middlewares/protect.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

// Routes publiques
router.get("/", getAllArticles);
router.get("/:slug", getArticle);
router.get("/:slug/comments", getArticleComments); // Nouvelle route publique
router.post("/:slug/comments", createComment);

// Routes admin
// router.use(protect);

// router.get("/admin/articles", getAllArticlesAdmin);
// router.post("/", upload.array("images", 6), createArticle);
// router.patch("/:id", upload.array("images", 6), updateArticle);
// router.delete("/:id", deleteArticle);
// router.patch("/comments/:commentId/approve", approveComment);
// router.delete("/comments/:commentId", deleteComment);
// router.get("/admin/comments", getAllCommentsAdmin);

export default router;
