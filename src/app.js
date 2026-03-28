import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import destinationRoutes from "./routes/destinationRoutes.js";
import enventRoutes from "./routes/eventRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import paymentRoutes from "./routes/paymentsRoutes.js";

const app = express();

// Middleware pour parser le JSON et les cookies
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Sécurité
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));

// Limiteur de requêtes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
});
app.use("/api", limiter);

// Logger en développement
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Routes

// Authentication
app.use("/api/v1/auth", authRoutes);

//Routes pour la destination
app.use("/api/v1/destinations", destinationRoutes);

//Routes pour les événements
app.use("/api/v1/events", enventRoutes);

//Routes pour le blog
app.use("/api/v1/blog", blogRoutes);

//Routes pour les réservations
app.use("/api/v1/reservations", reservationRoutes);

//Routes pour les payments
app.use("/api/v1/payments", paymentRoutes);

//Routes de l'admin
import adminRoutes from "./routes/adminRoutes.js";
app.use("/api/v1/admin", adminRoutes);

// Route 404
app.all(/.*/, (req, res) => {
  res.status(404).json({
    status: "fail",
    message: `Route ${req.originalUrl} non trouvée`,
  });
});

export default app;
