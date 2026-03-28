import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

console.log("Cloudinary CONNECTÉ");

export const uploadToCloudinary = async (
  file,
  folder = process.env.CLOUDINARY_FOLDER,
) => {
  const buffer = Buffer.from(file.buffer);

  return await cloudinary.uploader
    .upload(`data:${file.mimetype};base64,${buffer.toString("base64")}`, {
      folder,
      resource_type: "auto",
      timeout: 300000,
    })
    .then((result) => ({
      url: result.secure_url,
      public_id: result.public_id,
    }))
    .catch((err) => {
      console.error("Upload échoué →", err.message);
      throw err;
    });
};

export const deleteFromCloudinary = async (public_id) => {
  try {
    await cloudinary.uploader.destroy(public_id, { invalidate: true });
  } catch (err) {
    // ignore
  }
};

export default cloudinary;
