const bcrypt = require('bcrypt');
const authConfig = require('../config/auth.config');
const { InvalidCredentialsError } = require('../errors/auth.errors');

class PasswordService {
  constructor() {
    this.saltRounds = authConfig.password.saltRounds;
    this.demoCredentials = authConfig.demoCredentials;
  }

  /**
   * Hash a password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Compare a plain text password with a hashed password
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password
   * @returns {Promise<boolean>} True if passwords match
   */
  async comparePassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate credentials (with demo fallback for development)
   * @param {string} userId - User ID
   * @param {string} password - Plain text password
   * @param {string|null} hashedPassword - Hashed password from database (if exists)
   * @returns {Promise<boolean>} True if credentials are valid
   */
  async validateCredentials(userId, password, hashedPassword = null) {
    // If we have a hashed password from database, use it
    if (hashedPassword) {
      return await this.comparePassword(password, hashedPassword);
    }

    // Fallback to demo credentials for development/testing
    if (this.demoCredentials.enabled && this.demoCredentials.users[userId]) {
      return this.demoCredentials.users[userId] === password;
    }

    // No valid credentials found
    throw new InvalidCredentialsError();
  }

  /**
   * Generate a random password
   * @param {number} length - Password length
   * @returns {string} Generated password
   */
  generateRandomPassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  validatePasswordStrength(password) {
    const minLength = authConfig.password.minLength;
    const maxLength = authConfig.password.maxLength;

    const result = {
      isValid: true,
      errors: [],
      strength: 'weak'
    };

    if (password.length < minLength) {
      result.isValid = false;
      result.errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (password.length > maxLength) {
      result.isValid = false;
      result.errors.push(`Password cannot exceed ${maxLength} characters`);
    }

    // Check for various character types
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    let strengthScore = 0;
    if (hasUpperCase) strengthScore++;
    if (hasLowerCase) strengthScore++;
    if (hasNumbers) strengthScore++;
    if (hasSpecialChar) strengthScore++;

    if (strengthScore >= 3) result.strength = 'strong';
    else if (strengthScore >= 2) result.strength = 'medium';

    return result;
  }
}

module.exports = new PasswordService();
