const databaseManager = require('../config/DatabaseManager');
const passwordService = require('./password.service');
const tokenService = require('./token.service');
const { validators, ValidationError } = require('../utils/validation.utils');
const { 
  AuthenticationError,
  InvalidCredentialsError,
  UserNotFoundError,
  InvalidTokenError,
  ServiceError // Keep for backwards compatibility
} = require('../errors/auth.errors');
const AUTH_CONSTANTS = require('../constants/auth.constants');

/**
 * Authentication service implementing enterprise patterns
 * Handles user authentication, token management, and user retrieval
 */
class AuthenticationService {
  constructor(passwordSvc = passwordService, tokenSvc = tokenService) {
    this.passwordService = passwordSvc;
    this.tokenService = tokenSvc;
  }

  /**
   * Get user repository
   * @returns {UserRepository} User repository
   */
  get userRepository() {
    return databaseManager.getRepository('users');
  }

  /**
   * Find user by ID or throw appropriate error
   * @param {string} userId - User ID to find
   * @param {number} notFoundStatus - HTTP status for not found error
   * @returns {Promise<Object>} User entity
   * @throws {UserNotFoundError|AuthenticationError} If user not found
   */
  async findUserOrThrow(userId, notFoundStatus = AUTH_CONSTANTS.STATUS_CODES.NOT_FOUND) {
    try {
      const user = await this.userRepository.findByEmployeeCode(userId);
      if (!user) {
        const errorClass = notFoundStatus === AUTH_CONSTANTS.STATUS_CODES.UNAUTHORIZED ? 
          InvalidTokenError : UserNotFoundError;
        throw new errorClass();
      }
      return user;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Database error occurred', AUTH_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Authenticate user with credentials
   * @param {string} userId - User ID
   * @param {string} password - User password
   * @returns {Promise<Object>} Authentication result with user info and token
   * @throws {ValidationError|InvalidCredentialsError|UserNotFoundError} For various auth failures
   */
  async login(userId, password) {
    try {
      // Validate input
      validators.validateLoginRequest({ userId, password });

      // Find user
      const user = await this.findUserOrThrow(userId);

      // Validate credentials
      const isValidPassword = await this.passwordService.validateCredentials(
        userId, 
        password, 
        user.password
      );

      if (!isValidPassword) {
        throw new InvalidCredentialsError();
      }

      // Generate token with user info
      const tokenPayload = {
        role: user.role,
        department: user.department,
        branch: user.branch
      };
      const token = this.tokenService.generateMockToken(userId, tokenPayload);

      // Return standardized user info
      return {
        user: this.formatUserResponse(user),
        token,
        expiresIn: AUTH_CONSTANTS.TOKEN.EXPIRY
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Login failed', AUTH_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get current user from authorization header
   * @param {string} authHeader - Authorization header
   * @returns {Promise<Object>} User information
   * @throws {ValidationError|InvalidTokenError|UserNotFoundError} For various auth failures
   */
  async getCurrentUserFromHeader(authHeader) {
    try {
      // Validate header format
      validators.validateAuthHeader(authHeader);

      // Extract and verify token
      const token = authHeader.replace('Bearer ', '');
      const decoded = this.tokenService.verifyMockToken(token);

      // Find and return user
      const user = await this.findUserOrThrow(decoded.userId, AUTH_CONSTANTS.STATUS_CODES.UNAUTHORIZED);
      return this.formatUserResponse(user);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new InvalidTokenError();
    }
  }

  /**
   * Verify token from authorization header
   * @param {string} authHeader - Authorization header
   * @returns {Promise<Object>} User information
   * @throws {ValidationError|InvalidTokenError|UserNotFoundError} For various auth failures
   */
  async verifyTokenFromHeader(authHeader) {
    return this.getCurrentUserFromHeader(authHeader);
  }

  /**
   * Format user response (remove sensitive data)
   * @param {Object} user - User entity
   * @returns {Object} Formatted user response
   */
  formatUserResponse(user) {
    const { password, ...userResponse } = user;
    return userResponse;
  }
}

// Create singleton instance
const authService = new AuthenticationService();

// Export both class and instance for flexibility
module.exports = {
  AuthenticationService,
  login: (userId, password) => authService.login(userId, password),
  getCurrentUserFromHeader: (authHeader) => authService.getCurrentUserFromHeader(authHeader),
  verifyTokenFromHeader: (authHeader) => authService.verifyTokenFromHeader(authHeader),
  ServiceError // Keep for backwards compatibility
};
