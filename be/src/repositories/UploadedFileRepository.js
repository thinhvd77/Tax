const BaseRepository = require('./BaseRepository');

/**
 * UploadedFile repository with business-specific methods
 */
class UploadedFileRepository extends BaseRepository {
  constructor(dataSource) {
    super(dataSource, 'UploadedFile');
  }

  /**
   * Get primary key field name for UploadedFile entity
   * @returns {string} Primary key field name
   */
  getPrimaryKey() {
    return 'fileId';
  }

  /**
   * Find files by period ID
   * @param {string} periodId - Period ID
   * @returns {Promise<Array>} Uploaded files
   */
  async findByPeriodId(periodId) {
    return this.findAll({
      where: { periodId },
      relations: ['uploader'],
      order: { uploadedAt: 'DESC' }
    });
  }

  /**
   * Find files by uploader
   * @param {string} uploadedBy - Uploader employee code
   * @returns {Promise<Array>} Uploaded files
   */
  async findByUploader(uploadedBy) {
    return this.findAll({
      where: { uploadedBy },
      relations: ['period', 'uploader'],
      order: { uploadedAt: 'DESC' }
    });
  }

  /**
   * Find file with all relations
   * @param {string} fileId - File ID
   * @returns {Promise<Object|null>} File with relations
   */
  async findWithRelations(fileId) {
    return this.findById(fileId, {
      relations: ['period', 'uploader']
    });
  }

  /**
   * Get total file size for a period
   * @param {string} periodId - Period ID
   * @returns {Promise<number>} Total file size in bytes
   */
  async getTotalSizeByPeriod(periodId) {
    const result = await this.query(
      'SELECT COALESCE(SUM(file_size), 0) as total_size FROM uploaded_files WHERE period_id = $1',
      [periodId]
    );
    return parseInt(result[0]?.total_size || 0);
  }

  /**
   * Delete files by period ID
   * @param {string} periodId - Period ID
   * @returns {Promise<DeleteResult>} Delete result
   */
  async deleteByPeriodId(periodId) {
    return this.deleteMany({ periodId });
  }

  /**
   * Get file statistics by content type
   * @returns {Promise<Array>} File statistics
   */
  async getStatsByContentType() {
    return this.query(`
      SELECT 
        content_type,
        COUNT(*) as file_count,
        SUM(file_size) as total_size
      FROM uploaded_files 
      GROUP BY content_type 
      ORDER BY file_count DESC
    `);
  }

  /**
   * Find files uploaded in date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Files in date range
   */
  async findByDateRange(startDate, endDate) {
    return this.query(
      `SELECT * FROM uploaded_files 
       WHERE uploaded_at >= $1 AND uploaded_at <= $2 
       ORDER BY uploaded_at DESC`,
      [startDate, endDate]
    );
  }
}

module.exports = UploadedFileRepository;
