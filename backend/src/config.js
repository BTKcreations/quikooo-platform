require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  jwt: {
    secret: process.env.JWT_SECRET || 'quikooo_super_secret_jwt_key_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  db: {
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'quikooo_db',
    user: process.env.DB_USER || 'quikooo_user',
    password: process.env.DB_PASSWORD || 'quikooo_pass',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_MAX_CONNECTIONS, 10) || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  },

  // CRITICAL OFFICIAL BUSINESS MODEL CONSTANTS
  pricing: {
    restaurantMenuAdjustmentPercent: parseFloat(process.env.RESTAURANT_MENU_ADJUSTMENT_PERCENT || '5'),
    restaurantPlatformCommissionPercent: parseFloat(process.env.RESTAURANT_PLATFORM_COMMISSION_PERCENT || '10'),
    customerPlatformFee: parseFloat(process.env.CUSTOMER_PLATFORM_FEE || '5'),
    customerDeliveryFee: parseFloat(process.env.CUSTOMER_DELIVERY_FEE || '25'),
    deliveryPartnerPayout: parseFloat(process.env.DELIVERY_PARTNER_PAYOUT || '25'),
    agentSharePercent: parseFloat(process.env.AGENT_SHARE_PERCENT || '60'),
    quikoooSharePercent: parseFloat(process.env.QUIKOOO_SHARE_PERCENT || '40'),
  },

  zones: {
    defaultRadiusKm: parseFloat(process.env.DEFAULT_RADIUS_KM || '2'),
    ruralCutoff: process.env.RURAL_CUTOFF || '21:00',
    ruralDeliveryWindowStart: process.env.RURAL_DELIVERY_WINDOW_START || '05:00',
    ruralDeliveryWindowEnd: process.env.RURAL_DELIVERY_WINDOW_END || '08:00',
    timezone: process.env.TIMEZONE || 'Asia/Kolkata',
  },

  tax: {
    defaultRate: parseFloat(process.env.TAX_RATE || '0.18'),
  },

  roles: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    AGENT: 'AGENT',
    VENDOR: 'VENDOR',
    DELIVERY_PARTNER: 'DELIVERY_PARTNER',
    CUSTOMER: 'CUSTOMER',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'quikooo_webhook_secret_key',
  },

  redis: {
    url: process.env.REDIS_URL || '',
  },

  s3: {
    bucket: process.env.AWS_S3_BUCKET || '',
    region: process.env.AWS_REGION || process.env.AWS_S3_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.AWS_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_S3_SECRET_ACCESS_KEY || '',
    endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  },

  notifications: {
    fcmKey: process.env.FCM_KEY || process.env.FCM_SERVER_KEY || '',
    msg91AuthKey: process.env.MSG91_AUTH_KEY || '',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },
};

module.exports = config;
