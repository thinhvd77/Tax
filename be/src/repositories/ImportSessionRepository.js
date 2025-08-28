const BaseRepository = require('./BaseRepository');

/**
 * ImportSession repository with business-specific methods
 */
class ImportSessionRepository extends BaseRepository {
  constructor(dataSource) {
    super(dataSource, 'ImportSession');
  }

  /**
   * Find session with files
   * @param {number} sessionId - Session ID
   * @returns {Promise<Object|null>} Session with files
   */
  async findWithFiles(sessionId) {
    return this.findById(sessionId, {
      relations: ['files']
    });
  }

  /**
   * Find sessions by month and year
   * @param {string} month - Month
   * @param {number} year - Year
   * @returns {Promise<Array>} Import sessions
   */
  async findByMonthYear(month, year) {
    return this.findAll({
      where: { month, year },
      relations: ['files'],
      order: { created_at: 'DESC' }
    });
  }

  /**
   * Find sessions by status
   * @param {string} status - Session status
   * @returns {Promise<Array>} Import sessions
   */
  async findByStatus(status) {
    return this.findAll({
      where: { status },
      relations: ['files'],
      order: { created_at: 'DESC' }
    });
  }

  /**
   * Update session status
   * @param {number} sessionId - Session ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated session
   */
  async updateStatus(sessionId, status) {
    return this.updateById(sessionId, { status });
  }

  /**
   * Set result file path
   * @param {number} sessionId - Session ID
   * @param {string} filePath - Result file path
   * @returns {Promise<Object>} Updated session
   */
  async setResultFile(sessionId, filePath) {
    return this.updateById(sessionId, {
      result_file_path: filePath,
      status: 'completed'
    });
  }
}

module.exports = ImportSessionRepository;
