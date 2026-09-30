const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Sanitize and preserve only safe lowercase extension
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, 'exam-doc-' + uniqueSuffix + ext);
  },
});

const allowedExtensions = ['.pdf', '.docx', '.doc'];
const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/octet-stream',
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();

  // Strict Security: File extension MUST be explicitly allowed (.pdf, .docx, .doc)
  // AND MIME type must match permitted document formats
  const hasValidExt = allowedExtensions.includes(ext);
  const hasValidMime = allowedMimeTypes.includes(file.mimetype);

  if (hasValidExt && hasValidMime) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only authentic PDF and Word (.docx, .doc) documents are permitted.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

module.exports = upload;
