export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:4200').split(','),
  mongodbUri:
    process.env.MONGODB_URI ?? 'mongodb://localhost:27017/work_mgmt',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  upload: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10),
  },
});

/** Kiểm tra biến môi trường bắt buộc khi khởi động. */
export function validateEnv(config: Record<string, unknown>) {
  const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((k) => !config[k]);
  if (missing.length) {
    throw new Error(`Thiếu biến môi trường: ${missing.join(', ')}`);
  }
  return config;
}
