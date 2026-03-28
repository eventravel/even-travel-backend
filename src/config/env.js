// src/config/env.js
import dotenv from 'dotenv';
dotenv.config();

// Debug immédiat
console.log('Variables Cloudinary chargées :');
console.log('CLOUD_NAME →', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API_KEY    →', process.env.CLOUDINARY_API_KEY ? 'OK' : 'MANQUANT !');
console.log('API_SECRET →', process.env.CLOUDINARY_API_SECRET ? 'OK' : 'MANQUANT !');

export default process.env;