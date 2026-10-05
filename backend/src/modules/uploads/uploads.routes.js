const { Router } = require('express');
const multer = require('multer');
const UploadsService = require('./uploads.service');

const router = Router();

// Multer memory storage with 5MB file limit and image-only filter
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      const err = new Error('Invalid file type: Only image files are allowed');
      err.statusCode = 400;
      err.code = 'INVALID_FILE_TYPE';
      return cb(err, false);
    }
    cb(null, true);
  },
});

// Middleware to handle both 'file' and 'image' field names with custom error catching
function multerImageUpload(req, res, next) {
  const handler = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]);

  handler(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds maximum allowed limit of 5MB',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error',
      });
    }

    // Attach single uploaded file to req.file
    const uploadedFile = (req.files?.file && req.files.file[0]) || (req.files?.image && req.files.image[0]);
    if (uploadedFile) {
      req.file = uploadedFile;
    }

    return next();
  });
}

/**
 * POST /api/v1/uploads
 * Uploads an image (max 5MB) to S3 or local backend/uploads/
 */
router.post('/', multerImageUpload, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded. Please provide a valid image.',
      });
    }

    const productId = req.body.productId || req.body.vendorProductId || req.body.vendor_product_id;
    const result = await UploadsService.uploadFile(req.file, { productId });

    return res.status(201).json({
      success: true,
      data: result,
      url: result.url,
      filename: result.filename,
      mimetype: result.mimetype,
      size: result.size,
      storage: result.storage,
      message: 'Image uploaded successfully',
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
  }
});

module.exports = router;
