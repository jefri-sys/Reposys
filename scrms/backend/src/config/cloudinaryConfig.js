const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    return {
      folder: 'reposys-chat',
      resource_type: isImage ? 'image' : 'raw',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
      public_id: `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`
    };
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: 'reposys/voice-messages',
      resource_type: 'video',
      allowed_formats: ['webm', 'mp3', 'wav', 'ogg', 'm4a', 'aac'],
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    };
  }
});

const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

module.exports = { upload, uploadAudio, cloudinary };
