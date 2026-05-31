export const getBaseUrl = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = process.env.PORT || '5005';
  
  let baseUrl = nodeEnv === 'production' ? process.env.PROD_URL : process.env.DEV_URL;

  if (!baseUrl) {
    return `http://localhost:${port}`;
  }

  const parts = baseUrl.split(':');
  if (parts.length > 2) {
    return baseUrl;
  }

  return `${baseUrl}:${port}`;
};
