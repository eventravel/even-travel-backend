import Admin from "../models/Admin.js";
import jwt from "jsonwebtoken";
import catchAsync from "../utils/catchAsync.js";

// Génération du web Token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const createSendToken = (admin, statusCode, res) => {
  const token = signToken(admin._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res.cookie("jwt", token, cookieOptions);

  admin.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { admin },
  });
};

// @desc    Créer le premier admin (seulement si aucun n'existe)
export const registerAdmin = catchAsync(async (req, res, next) => {
  const { nom, email, password } = req.body;

  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) {
    return res.status(400).json({
      status: "fail",
      message: "Un admin avec cet email existe déjà",
    });
  }

  const admin = await Admin.create({ nom, email, password });

  createSendToken(admin, 201, res);
});

// @desc    Login admin
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: "fail",
      message: "Veuillez fournir email et mot de passe",
    });
  }

  const admin = await Admin.findOne({ email }).select("+password");
  if (!admin || !(await admin.matchPassword(password))) {
    return res.status(401).json({
      status: "fail",
      message: "Email ou mot de passe incorrect",
    });
  }

  createSendToken(admin, 200, res);
});

// @desc    Logout (clear cookie)
export const logout = (req, res) => {
  res.clearCookie("jwt");
  res.status(200).json({
    status: "success",
    message: "Déconnexion réussie",
  });
};

// @desc    Get current admin (protected)
export const getMe = catchAsync(async (req, res, next) => {
  const admin = await Admin.findById(req.admin.id);

  res.status(200).json({
    status: "success",
    data: { admin },
  });
});

// @desc    Update current admin (nom, email)
export const updateMe = catchAsync(async (req, res, next) => {
  const { nom, email } = req.body;

  // Sécurité : empêcher update du mot de passe ici
  if (req.body.password || req.body.passwordConfirm) {
    return res.status(400).json({
      status: "fail",
      message: "Utilisez la route de mise à jour du mot de passe",
    });
  }

  const updatedAdmin = await Admin.findByIdAndUpdate(
    req.admin.id,
    { nom, email },
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).json({
    status: "success",
    data: { admin: updatedAdmin },
  });
});

// @desc    Update admin password
export const updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      status: "fail",
      message: "Veuillez fournir les deux mots de passe",
    });
  }

  // Récupérer l’admin avec le password
  const admin = await Admin.findById(req.admin.id).select("+password");

  // Vérifier l’ancien mot de passe
  if (!(await admin.matchPassword(currentPassword))) {
    return res.status(401).json({
      status: "fail",
      message: "Mot de passe actuel incorrect",
    });
  }

  // Mettre à jour
  admin.password = newPassword;
  await admin.save();

  // Renvoi d’un nouveau token
  createSendToken(admin, 200, res);
});
