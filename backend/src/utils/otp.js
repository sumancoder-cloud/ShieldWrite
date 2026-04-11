const crypto = require('crypto');

const generateOtp = (length = 6) => {
  const max = 10 ** length;
  const value = crypto.randomInt(0, max);
  return String(value).padStart(length, '0');
};

module.exports = {
  generateOtp,
};
