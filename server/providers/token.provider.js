const jwt = require('jsonwebtoken');

const secretKey = require('../config/config').secretKey;

/**
 * Generate a signed JWT token for the given payload.
 * Uses HS256 algorithm (HMAC with SHA-256) for string secrets.
 *
 * BUG FIX: Changed from RS256 to HS256.
 * RS256 requires RSA public/private key pairs, but a simple string secret is used.
 */
function generateToken(payload, options = {}) {
  const defaults = { algorithm: 'HS256', expiresIn: '1h' };
  return jwt.sign(payload, secretKey, { ...defaults, ...options });
}

module.exports = { generateToken };
