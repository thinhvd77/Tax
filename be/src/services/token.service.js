const authConfig = require('../config/auth.config');
const AUTH_CONSTANTS = require('../constants/auth.constants');
const { InvalidTokenError, TokenExpiredError } = require('../errors/auth.errors');

class TokenService {
  constructor() {
    this.config = authConfig.jwt;
    this.mockTokenPrefix = AUTH_CONSTANTS.TOKEN.MOCK_PREFIX;
    this.bearerPrefix = AUTH_CONSTANTS.TOKEN.BEARER_PREFIX;
  }

  /**
   * Generate a mock JWT token for development
   * @param {string} userId - User ID
   * @param {Object} payload - Additional payload data
   * @returns {string} Mock token
   */
  generateMockToken(userId, payload = {}) {
    const tokenData = {
      userId,
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      iss: this.config.issuer,
      aud: this.config.audience
    };

    // In a real implementation, this would use JWT library
    return `${this.mockTokenPrefix}${Buffer.from(JSON.stringify(tokenData)).toString('base64')}`;
  }

  /**
   * Extract token from authorization header
   * @param {string} authHeader - Authorization header
   * @returns {string} Extracted token
   * @throws {InvalidTokenError} If token is invalid or missing
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      throw new InvalidTokenError(AUTH_CONSTANTS.ERRORS.ACCESS_TOKEN_REQUIRED);
    }

    if (!authHeader.startsWith(this.bearerPrefix)) {
      throw new InvalidTokenError('Invalid authorization header format');
    }

    const token = authHeader.replace(this.bearerPrefix, '').trim();

    if (!token) {
      throw new InvalidTokenError('Token is required');
    }

    return token;
  }

  /**
   * Verify and decode mock token
   * @param {string} token - Token to verify
   * @returns {Object} Decoded token payload
   * @throws {InvalidTokenError|TokenExpiredError} If token is invalid or expired
   */
  verifyMockToken(token) {
    if (!token.startsWith(this.mockTokenPrefix)) {
      throw new InvalidTokenError('Invalid token format');
    }

    try {
      const base64Data = token.replace(this.mockTokenPrefix, '');
      const tokenData = JSON.parse(Buffer.from(base64Data, 'base64').toString());

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (tokenData.exp && tokenData.exp < now) {
        throw new TokenExpiredError();
      }

      // Verify issuer and audience if configured
      if (this.config.issuer && tokenData.iss !== this.config.issuer) {
        throw new InvalidTokenError('Invalid token issuer');
      }

      if (this.config.audience && tokenData.aud !== this.config.audience) {
        throw new InvalidTokenError('Invalid token audience');
      }

      return tokenData;
    } catch (error) {
      if (error instanceof InvalidTokenError || error instanceof TokenExpiredError) {
        throw error;
      }
      throw new InvalidTokenError('Failed to decode token');
    }
  }

  /**
   * Get user ID from token
   * @param {string} token - Token
   * @returns {string} User ID
   */
  getUserIdFromToken(token) {
    const tokenData = this.verifyMockToken(token);
    return tokenData.userId;
  }

  /**
   * Generate refresh token (placeholder for future implementation)
   * @param {string} userId - User ID
   * @returns {string} Refresh token
   */
  generateRefreshToken(userId) {
    // This is a placeholder for future JWT refresh token implementation
    return `refresh-${this.generateMockToken(userId, { type: 'refresh' })}`;
  }

  /**
   * Revoke token (placeholder for blacklist implementation)
   * @param {string} token - Token to revoke
   * @returns {Promise<void>}
   */
  async revokeToken(token) {
    // This would implement token blacklisting in a real application
    console.log(`Token revoked: ${token.substring(0, 20)}...`);
  }
}

module.exports = new TokenService();
