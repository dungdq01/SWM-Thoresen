import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer');

export const OcrFileUploadInterceptor = FileInterceptor('file', {
  storage: multer.diskStorage({
    destination: './uploads/ocr',
    filename: (_req: any, file: any, cb: any) => {
      const ext = extname(file.originalname);
      cb(null, `OCR-${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});
