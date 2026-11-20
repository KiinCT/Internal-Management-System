export const environment = {
  production: false,
  /** Dev: proxy.conf.json chuyển /api sang http://localhost:3000 */
  apiUrl: '/api/v1',
  /** Chu kỳ kiểm tra thông báo mới (ms) */
  notificationPollMs: 30_000,
};
