import multer from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(AppError.badRequest(`Unsupported file type: ${file.mimetype}. Allowed: PDF, JPEG, PNG.`));
      return;
    }
    callback(null, true);
  },
});
