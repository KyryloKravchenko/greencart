import multer from 'multer';
import path from 'path';

// Хранилище файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Папка, в которую сохраняются файлы
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // .jpg / .png и т.п.
    const name = file.fieldname + '-' + Date.now() + ext;
    cb(null, name);
  }
});

export const upload = multer({ storage });
