module.exports = {
  accessToken: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
};
