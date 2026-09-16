import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { db, IMAGES_BUCKET, q } from '../config/supabase.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { HttpError } from '../utils/helpers.js';

const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED[file.mimetype]) cb(null, true);
    else cb(new HttpError(400, 'Only JPG, PNG, WEBP or GIF images are allowed'));
  },
});

const router = Router();

// Preview images go to the public Supabase Storage bucket
router.post('/', protect, adminOnly, upload.array('images', 8), async (req, res) => {
  if (!req.files?.length) throw new HttpError(400, 'No images uploaded');
  const month = new Date().toISOString().slice(0, 7);
  const bucket = db.storage.from(IMAGES_BUCKET);
  const urls = await Promise.all(
    req.files.map(async (f) => {
      const filePath = `${month}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ALLOWED[f.mimetype]}`;
      await q(bucket.upload(filePath, f.buffer, { contentType: f.mimetype, cacheControl: '31536000' }));
      return bucket.getPublicUrl(filePath).data.publicUrl;
    })
  );
  res.status(201).json({ urls });
});

export default router;
