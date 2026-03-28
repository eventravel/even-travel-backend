import Article from "../models/Article.js";
import Comment from "../models/Comment.js";
import catchAsync from "../utils/catchAsync.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

// CREATE ARTICLE
export const createArticle = catchAsync(async (req, res) => {
  const { titre, contenu, auteur, published, categorie } = req.body;

  const images = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const result = await uploadToCloudinary(file, "even-travel/blog");
      images.push({
        url: result.url,
        public_id: result.public_id,
      });
    }
  }

  // Conversion robuste
  let isPublished = false;
  if (published === true || published === "true") {
    isPublished = true;
  }

  const article = await Article.create({
    titre,
    contenu,
    auteur,
    categorie,
    images,
    published: isPublished,
  });

  res.status(201).json({
    status: "success",
    data: { article },
  });
});

// GET ALL ARTICLES (public, seulement publiés)
export const getAllArticles = catchAsync(async (req, res) => {
  const articles = await Article.find({ published: true }).sort({
    publishedAt: -1,
  });

  res.status(200).json({
    status: "success",
    results: articles.length,
    data: { articles },
  });
});

// ADMIN: GET ALL ARTICLES (inclut brouillons)
export const getAllArticlesAdmin = catchAsync(async (req, res) => {
  const articles = await Article.find().sort({
    createdAt: -1,
  });

  res.status(200).json({
    status: "success",
    results: articles.length,
    data: { articles },
  });
});

// ADMIN : GET ARTICLE BY ID
export const getArticleAdmin = catchAsync(async (req, res) => {
  const article = await Article.findById(req.params.id);

  if (!article) {
    return res.status(404).json({
      status: "fail",
      message: "Article non trouvé",
    });
  }

  res.status(200).json({
    status: "success",
    data: { article },
  });
});

// GET ARTICLE + commentaires approuvés
export const getArticle = catchAsync(async (req, res) => {
  const article = await Article.findOne({
    slug: req.params.slug,
    published: true,
  });
  if (!article) {
    return res
      .status(404)
      .json({ status: "fail", message: "Article non trouvé" });
  }

  const comments = await Comment.find({
    article: article._id,
    approved: true,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    data: { article, comments },
  });
});

// UPDATE ARTICLE (admin)
export const updateArticle = catchAsync(async (req, res) => {
  const updates = req.body;

  if (req.files && req.files.length > 0) {
    const oldArticle = await Article.findById(req.params.id);
    if (oldArticle && oldArticle.images.length > 0) {
      for (const img of oldArticle.images) {
        await deleteFromCloudinary(img.public_id);
      }
    }

    const images = [];
    for (const file of req.files) {
      const result = await uploadToCloudinary(file, "even-travel/blog");
      images.push({
        url: result.url,
        public_id: result.public_id,
      });
    }
    updates.images = images;
  }

  const article = await Article.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!article) {
    return res
      .status(404)
      .json({ status: "fail", message: "Article non trouvé" });
  }

  res.status(200).json({
    status: "success",
    data: { article },
  });
});

// DELETE ARTICLE
export const deleteArticle = catchAsync(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) {
    return res
      .status(404)
      .json({ status: "fail", message: "Article non trouvé" });
  }

  if (article.images.length > 0) {
    for (const img of article.images) {
      await deleteFromCloudinary(img.public_id);
    }
  }

  await Comment.deleteMany({ article: article._id });
  await article.deleteOne();

  res.status(204).json({ status: "success", data: null });
});

// POST COMMENTAIRE (public + honeypot anti-spam)
export const createComment = catchAsync(async (req, res) => {
  const { nom, message, email_honeypot } = req.body; // honeypot field
  const article = await Article.findOne({
    slug: req.params.slug,
    published: true,
  });

  if (!article) {
    return res
      .status(404)
      .json({ status: "fail", message: "Article non trouvé" });
  }

  // Anti-spam honeypot : si le champ caché est rempli → bot
  if (email_honeypot) {
    return res.status(400).json({ status: "fail", message: "Spam détecté" });
  }

  const comment = await Comment.create({
    article: article._id,
    nom,
    message,
    approved: false, // Modération manuelle
  });

  res.status(201).json({
    status: "success",
    message: "Commentaire envoyé, en attente de modération",
    data: { comment },
  });
});

// ADMIN : Approuver commentaire
export const approveComment = catchAsync(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.commentId,
    { approved: true },
    { new: true },
  );

  if (!comment) {
    return res
      .status(404)
      .json({ status: "fail", message: "Commentaire non trouvé" });
  }

  res.status(200).json({ status: "success", data: { comment } });
});

// ADMIN : Supprimer commentaire
export const deleteComment = catchAsync(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) {
    return res
      .status(404)
      .json({ status: "fail", message: "Commentaire non trouvé" });
  }

  await comment.deleteOne();
  res.status(204).json({ status: "success", data: null });
});

// ADMIN : Liste tous les commentaires (pour modération)
export const getAllCommentsAdmin = catchAsync(async (req, res) => {
  const comments = await Comment.find()
    .populate("article", "titre slug")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: comments.length,
    data: { comments },
  });
});

// GET COMMENTS FOR PUBLIC (seulement commentaires approuvés)
export const getArticleComments = catchAsync(async (req, res) => {
  const article = await Article.findOne({
    slug: req.params.slug,
    published: true,
  });

  if (!article) {
    return res
      .status(404)
      .json({ status: "fail", message: "Article non trouvé" });
  }

  const comments = await Comment.find({
    article: article._id,
    approved: true,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: comments.length,
    data: { comments },
  });
});
