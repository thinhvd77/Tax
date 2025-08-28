const AUTH_CONSTANTS = require('../constants/auth.constants');

/**
 * Base authentication error class
 */
class AuthenticationError extends Error {
  constructor(message, status = AUTH_CONSTANTS.STATUS_CODES.UNAUTHORIZED, code = null) {
    super(message);
    this.name = 'AuthenticationError';
    this.status = status;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Invalid credentials error
 */
class InvalidCredentialsError extends AuthenticationError {
  constructor(message = AUTH_CONSTANTS.ERRORS.INVALID_CREDENTIALS) {
    super(message, AUTH_CONSTANTS.STATUS_CODES.UNAUTHORIZED, 'INVALID_CREDENTIALS');
    this.name = 'InvalidCredentialsError';
  }
}

/**
 * User not found error
 */
class UserNotFoundError extends AuthenticationError {
  constructor(message = AUTH_CONSTANTS.ERRORS.USER_NOT_FOUND) {
    super(message, AUTH_CONSTANTS.STATUS_CODES.NOT_FOUND, 'USER_NOT_FOUND');
    this.name = 'UserNotFoundError';
  }
}

/**
 * Invalid token error
 */
class InvalidTokenError extends AuthenticationError {
  constructor(message = AUTH_CONSTANTS.ERRORS.INVALID_TOKEN) {
    super(message, AUTH_CONSTANTS.STATUS_CODES.UNAUTHORIZED, 'INVALID_TOKEN');
    this.name = 'InvalidTokenError';
  }
}

/**
 * Token expired error
 */
class TokenExpiredError extends AuthenticationError {
  constructor(message = AUTH_CONSTANTS.ERRORS.TOKEN_EXPIRED) {
    super(message, AUTH_CONSTANTS.STATUS_CODES.UNAUTHORIZED, 'TOKEN_EXPIRED');
    this.name = 'TokenExpiredError';
  }
}

/**
 * Access denied error
 */
class AccessDeniedError extends AuthenticationError {
  constructor(message = AUTH_CONSTANTS.ERRORS.INSUFFICIENT_PERMISSIONS) {
    super(message, AUTH_CONSTANTS.STATUS_CODES.FORBIDDEN, 'ACCESS_DENIED');
    this.name = 'AccessDeniedError';
  }
}

/**
 * Service error (backwards compatibility)
 */
class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
    this.timestamp = new Date().toISOString();
  }
}

module.exports = {
  AuthenticationError,
  InvalidCredentialsError,
  UserNotFoundError,
  InvalidTokenError,
  TokenExpiredError,
  AccessDeniedError,
  ServiceError
};
