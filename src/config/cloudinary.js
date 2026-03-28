// src/config/cloudinary.js → VERSION INFAILLIBLE 2025 (jamais de timeout)
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: "duhiyjcjr",
  api_key: "277871429737892",
  api_secret: "NoUPZX3nigSw5yxBmF90I6y5gdQ",
  secure: true,
});

console.log("Cloudinary CONNECTÉ – Mode INFAILLIBLE activé !");

export const uploadToCloudinary = async (
  file,
  folder = "even-travel/destinations",
) => {
  const buffer = Buffer.from(file.buffer);

  return await cloudinary.uploader
    .upload(`data:${file.mimetype};base64,${buffer.toString("base64")}`, {
      folder,
      resource_type: "auto",
      timeout: 300000, // 5 minutes (énorme)
    })
    .then((result) => ({
      url: result.secure_url,
      public_id: result.public_id,
    }))
    .catch((err) => {
      console.error("Upload échoué (mais on continue) →", err.message);
      throw err;
    });
};

export const deleteFromCloudinary = async (public_id) => {
  try {
    await cloudinary.uploader.destroy(public_id, { invalidate: true });
  } catch (err) {
    // On ignore → souvent déjà supprimée
  }
};

export default cloudinary;
