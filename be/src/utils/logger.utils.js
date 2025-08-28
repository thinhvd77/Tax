const fs = require('fs');
const path = require('path');

/**
 * Simple logger utility for enterprise logging
 * In production, consider using winston, bunyan, or similar
 */
class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Get current timestamp in ISO format
   * @returns {string} ISO timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @returns {string} Formatted log message
   */
  formatMessage(level, message, meta = {}) {
    const logObject = {
      timestamp: this.getTimestamp(),
      level: level.toUpperCase(),
      message,
      ...meta
    };
    return JSON.stringify(logObject);
  }

  /**
   * Write log to file
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  writeLog(level, message, meta = {}) {
    try {
      const logMessage = this.formatMessage(level, message, meta);
      const logFile = path.join(this.logDir, `${level}.log`);

      fs.appendFileSync(logFile, logMessage + '\n');

      // Also write to general log file
      const generalLogFile = path.join(this.logDir, 'app.log');
      fs.appendFileSync(generalLogFile, logMessage + '\n');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  /**
   * Log info level message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    console.log(`[INFO] ${message}`, meta);
    this.writeLog('info', message, meta);
  }

  /**
   * Log warning level message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    console.warn(`[WARN] ${message}`, meta);
    this.writeLog('warn', message, meta);
  }

  /**
   * Log error level message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    console.error(`[ERROR] ${message}`, meta);
    this.writeLog('error', message, meta);
  }

  /**
   * Log debug level message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, meta);
      this.writeLog('debug', message, meta);
    }
  }

  /**
   * Log authentication events
   * @param {string} event - Authentication event type
   * @param {string} userId - User ID
   * @param {Object} details - Event details
   */
  authEvent(event, userId, details = {}) {
    const meta = {
      event,
      userId,
      userAgent: details.userAgent,
      ip: details.ip,
      timestamp: this.getTimestamp(),
      ...details
    };

    this.info(`Auth event: ${event}`, meta);

    // Write to security log
    try {
      const securityLogFile = path.join(this.logDir, 'security.log');
      fs.appendFileSync(securityLogFile, this.formatMessage('security', `Auth: ${event}`, meta) + '\n');
    } catch (error) {
      console.error('Failed to write security log:', error);
    }
  }
}

// Export singleton instance
module.exports = new Logger();
