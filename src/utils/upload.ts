import multer from "multer";
import path from "path";
import fs from "fs";

export const createUploadMiddleware = (role: string) => {
  const dir = path.join(__dirname, `../../public/${role}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `${Date.now()}-${file.fieldname}-${role}-${ext}`;
      cb(null, filename);
    },
  });

  return multer({ storage });
};
