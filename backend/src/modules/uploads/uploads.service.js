const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../../config');
const db = require('../../db');

class UploadsService {
  /**
   * Upload file to AWS S3 if credentials configured, otherwise save locally to backend/uploads/
   * @param {object} file - multer file object with buffer, originalname, mimetype, size
   * @param {object} [options]
   * @param {string} [options.productId] - optional vendor product ID to update
   */
  static async uploadFile(file, options = {}) {
    if (!file || !file.buffer) {
      const err = new Error('No file buffer provided for upload');
      err.statusCode = 400;
      throw err;
    }

    const bucket = config.s3?.bucket || process.env.AWS_S3_BUCKET;
    const accessKeyId = config.s3?.accessKeyId || process.env.AWS_ACCESS_KEY_ID || process.env.AWS_S3_ACCESS_KEY_ID;
    const secretAccessKey = config.s3?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_S3_SECRET_ACCESS_KEY;
    const region = config.s3?.region || process.env.AWS_REGION || process.env.AWS_S3_REGION || 'ap-south-1';

    const cleanOriginalName = (file.originalname || 'image.png').replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${cleanOriginalName}`;

    let fileUrl = '';
    let storageType = 'local';

    // 1. AWS S3 Upload if credentials present
    if (bucket && accessKeyId && secretAccessKey) {
      try {
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3 = new S3Client({
          region,
          credentials: { accessKeyId, secretAccessKey },
          endpoint: config.s3?.endpoint || process.env.AWS_S3_ENDPOINT || undefined,
        });

        const s3Key = `uploads/${uniqueFilename}`;
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
        );

        fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
        storageType = 's3';
        console.log(`[UploadsService] Uploaded ${uniqueFilename} to S3 bucket ${bucket}`);
      } catch (err) {
        console.warn(`[UploadsService] S3 upload failed, falling back to local storage: ${err.message}`);
        // Fall back to local storage
      }
    }

    // 2. Local backend/uploads/ storage fallback
    if (!fileUrl) {
      const uploadsDir = path.resolve(__dirname, '../../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, uniqueFilename);
      await fs.promises.writeFile(filePath, file.buffer);
      fileUrl = `/uploads/${uniqueFilename}`;
      storageType = 'local';
      console.log(`[UploadsService] Saved ${uniqueFilename} locally to ${filePath}`);
    }

    // 3. Store URL in vendor_products.image_url if productId is provided
    const targetProductId = options.productId || options.vendorProductId || options.vendor_product_id;
    if (targetProductId) {
      await this.updateVendorProductImage(targetProductId, fileUrl);
    }

    return {
      url: fileUrl,
      filename: uniqueFilename,
      mimetype: file.mimetype,
      size: file.size,
      storage: storageType,
      productId: targetProductId || null,
    };
  }

  /**
   * Update vendor_products.image_url in DB and product memory store
   * @param {string} productId
   * @param {string} imageUrl
   */
  static async updateVendorProductImage(productId, imageUrl) {
    if (!productId || !imageUrl) return null;

    try {
      if (db.isConnected()) {
        await db.query(
          'UPDATE vendor_products SET image_url = $1, updated_at = NOW() WHERE id = $2',
          [imageUrl, productId]
        );
      }

      // Also update in products service catalog if loaded
      try {
        const ProductsService = require('../products/products.service');
        if (typeof ProductsService.updateProductImage === 'function') {
          ProductsService.updateProductImage(productId, imageUrl);
        }
      } catch (e) {
        // Ignore if module not ready
      }

      return { productId, imageUrl, updated: true };
    } catch (err) {
      console.warn(`[UploadsService] Could not update vendor_products.image_url for ${productId}: ${err.message}`);
      return { productId, imageUrl, updated: false, error: err.message };
    }
  }
}

module.exports = UploadsService;
