/**
 * Menghasilkan base URL aplikasi berdasarkan environment.
 * Menambahkan port jika belum ada di URL.
 */
export const getBaseUrl = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = process.env.PORT || '5005';
  
  // Ambil URL sesuai environment
  let baseUrl = nodeEnv === 'production' ? process.env.PROD_URL : process.env.DEV_URL;

  // Jika tidak ada URL di env, fallback ke localhost
  if (!baseUrl) {
    return `http://localhost:${port}`;
  }

  // Cek apakah URL sudah mengandung port (format http://host:port)
  // Menghitung jumlah titik dua (:) - minimal 2 untuk http://host:port
  const parts = baseUrl.split(':');
  if (parts.length > 2) {
    return baseUrl;
  }

  // Jika tidak ada port, tambahkan port dari environment
  return `${baseUrl}:${port}`;
};
