const AUTH_CONSTANTS = require('../constants/auth.constants');

class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.status = AUTH_CONSTANTS.STATUS_CODES.BAD_REQUEST;
  }
}

const validators = {
  /**
   * Validate user ID
   * @param {string} userId - User ID to validate
   * @throws {ValidationError} If validation fails
   */
  validateUserId(userId) {
    if (!userId) {
      throw new ValidationError(AUTH_CONSTANTS.ERRORS.USER_ID_REQUIRED, 'userId');
    }

    if (typeof userId !== 'string') {
      throw new ValidationError('User ID must be a string', 'userId');
    }

    if (userId.trim().length === 0) {
      throw new ValidationError('User ID cannot be empty', 'userId');
    }

    if (userId.length > 50) {
      throw new ValidationError('User ID cannot exceed 50 characters', 'userId');
    }
  },

  /**
   * Validate password
   * @param {string} password - Password to validate
   * @throws {ValidationError} If validation fails
   */
  validatePassword(password) {
    if (!password) {
      throw new ValidationError(AUTH_CONSTANTS.ERRORS.PASSWORD_REQUIRED, 'password');
    }

    if (typeof password !== 'string') {
      throw new ValidationError('Password must be a string', 'password');
    }
  },

  /**
   * Validate authorization header
   * @param {string} authHeader - Authorization header to validate
   * @throws {ValidationError} If validation fails
   */
  validateAuthHeader(authHeader) {
    if (!authHeader) {
      throw new ValidationError(AUTH_CONSTANTS.ERRORS.ACCESS_TOKEN_REQUIRED, 'authorization');
    }

    if (typeof authHeader !== 'string') {
      throw new ValidationError('Authorization header must be a string', 'authorization');
    }

    if (!authHeader.startsWith(AUTH_CONSTANTS.TOKEN.BEARER_PREFIX)) {
      throw new ValidationError('Authorization header must start with "Bearer "', 'authorization');
    }
  },

  /**
   * Validate login request
   * @param {Object} credentials - Login credentials
   * @throws {ValidationError} If validation fails
   */
  validateLoginRequest(credentials) {
    if (!credentials || typeof credentials !== 'object') {
      throw new ValidationError('Invalid request body');
    }

    this.validateUserId(credentials.userId);
    this.validatePassword(credentials.password);
  }
};

module.exports = {
  ValidationError,
  validators
};
