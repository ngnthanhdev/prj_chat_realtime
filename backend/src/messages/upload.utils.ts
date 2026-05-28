import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'node:fs';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function ensureDir(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export const imageUploadOptions = {
  storage: diskStorage({
    destination: (request, _file, callback) => {
      const sessionIdParam = request.params.sessionId;
      const sessionId = Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam;
      const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
      const destination = join(process.cwd(), uploadDir, 'chat-images', sessionId);
      ensureDir(destination);
      callback(null, destination);
    },
    filename: (_request, file, callback) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      callback(null, `${Date.now()}-${safeName}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_request: unknown, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new BadRequestException('Only jpeg, png, and webp images are allowed'), false);
      return;
    }
    callback(null, true);
  },
};

export function buildImageUrl(sessionId: string, filename: string) {
  const baseUrl = process.env.APP_PUBLIC_BASE_URL ?? 'http://localhost:4000';
  return `${baseUrl}/uploads/chat-images/${sessionId}/${filename}`;
}

export function inferImageExtension(file: Express.Multer.File) {
  return extname(file.originalname) || '.jpg';
}
