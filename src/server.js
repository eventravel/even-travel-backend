import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import connectDB from "./config/db.js";
import colors from "colors";

connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `🚀 Serveur lancé sur le port ${PORT} en mode ${process.env.NODE_ENV}`
      .yellow.bold,
  );
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Fermeture...");
  console.log(err.name, err.message);
  server.close(() => process.exit(1));
});
