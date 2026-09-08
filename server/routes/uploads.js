import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';
import { getFirebaseStorageBucket } from '../db.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure upload directory exists if local disk is writable
if (!process.env.VERCEL) {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn("Could not create local uploads directory:", e.message);
  }
}

// Memory storage engine to hold buffer for Firebase / local / Base64 upload
const storage = multer.memoryStorage();

// File validation filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, WEBP, GIF, SVG images and PDF documents are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload endpoint (Protected)
router.post('/', authenticateToken, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file was uploaded.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const name = path.basename(req.file.originalname, ext)
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const filename = `${name}_${Date.now()}${ext}`;

    // 1. Try Firebase Storage Bucket if available
    const bucket = getFirebaseStorageBucket();
    if (bucket) {
      try {
        const fileRef = bucket.file(`uploads/${filename}`);
        await fileRef.save(req.file.buffer, {
          metadata: { contentType: req.file.mimetype },
          public: true,
        });
        
        // Construct public Firebase Storage URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/uploads/${filename}`;
        return res.json({
          message: 'File uploaded to Firebase Storage successfully.',
          url: publicUrl,
          filename: filename,
          mimetype: req.file.mimetype
        });
      } catch (fbErr) {
        console.warn("Firebase Storage upload failed, trying local fallback:", fbErr.message);
      }
    }

    // 2. Try Local File Storage if not on Vercel and directory is writable
    if (!process.env.VERCEL) {
      try {
        if (!fs.existsSync(UPLOADS_DIR)) {
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        const filePath = path.join(UPLOADS_DIR, filename);
        await fs.promises.writeFile(filePath, req.file.buffer);
        const fileUrl = `/uploads/${filename}`;
        return res.json({
          message: 'File uploaded locally successfully.',
          url: fileUrl,
          filename: filename,
          mimetype: req.file.mimetype
        });
      } catch (localErr) {
        console.warn("Local file save failed, trying Base64 fallback:", localErr.message);
      }
    }

    // 3. Fallback: Base64 Data URL (guarantees success on serverless without Cloud Storage)
    const base64Str = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64Str}`;
    return res.json({
      message: 'File processed as Base64 Data URL successfully.',
      url: dataUrl,
      filename: filename,
      mimetype: req.file.mimetype
    });
  });
});

export default router;
