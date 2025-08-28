const AUTH_CONSTANTS = {
  ERRORS: {
    USER_ID_REQUIRED: 'User ID is required',
    PASSWORD_REQUIRED: 'Password is required',
    INVALID_CREDENTIALS: 'Invalid credentials',
    USER_NOT_FOUND: 'User not found',
    ACCESS_TOKEN_REQUIRED: 'Access token required',
    INVALID_TOKEN: 'Invalid token',
    TOKEN_EXPIRED: 'Token expired',
    AUTHENTICATION_REQUIRED: 'Authentication required',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions'
  },
  STATUS_CODES: {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
  },
  TOKEN: {
    BEARER_PREFIX: 'Bearer ',
    MOCK_PREFIX: 'mock-jwt-token-',
    EXPIRY: '24h'
  },
  ROLES: {
    ADMIN: 'ADMIN',
    REVIEWER: 'REVIEWER',
    UPLOADER: 'UPLOADER'
  }
};

module.exports = AUTH_CONSTANTS;
