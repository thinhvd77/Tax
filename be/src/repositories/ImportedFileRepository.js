const BaseRepository = require('./BaseRepository');

/**
 * ImportedFile repository with business-specific methods
 */
class ImportedFileRepository extends BaseRepository {
  constructor(dataSource) {
    super(dataSource, 'ImportedFile');
  }

  /**
   * Find files by session ID
   * @param {number} sessionId - Session ID
   * @returns {Promise<Array>} Imported files
   */
  async findBySessionId(sessionId) {
    return this.findAll({
      where: { session_id: sessionId },
      relations: ['session'],
      order: { uploaded_at: 'DESC' }
    });
  }

  /**
   * Find files by type
   * @param {string} fileType - File type (salary, bonus, dependent)
   * @returns {Promise<Array>} Imported files
   */
  async findByType(fileType) {
    return this.findAll({
      where: { file_type: fileType },
      relations: ['session'],
      order: { uploaded_at: 'DESC' }
    });
  }

  /**
   * Delete files by session ID
   * @param {number} sessionId - Session ID
   * @returns {Promise<DeleteResult>} Delete result
   */
  async deleteBySessionId(sessionId) {
    return this.deleteMany({ session_id: sessionId });
  }

  /**
   * Get file statistics by type
   * @returns {Promise<Array>} File statistics
   */
  async getStatsByType() {
    return this.query(`
      SELECT 
        file_type,
        COUNT(*) as file_count,
        SUM(file_size) as total_size
      FROM imported_files 
      GROUP BY file_type 
      ORDER BY file_count DESC
    `);
  }
}

module.exports = ImportedFileRepository;
