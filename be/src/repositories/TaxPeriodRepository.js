const BaseRepository = require('./BaseRepository');

/**
 * TaxPeriod repository with business-specific methods
 */
class TaxPeriodRepository extends BaseRepository {
  constructor(dataSource) {
    super(dataSource, 'TaxPeriod');
  }

  /**
   * Get primary key field name for TaxPeriod entity
   * @returns {string} Primary key field name
   */
  getPrimaryKey() {
    return 'periodId';
  }

  /**
   * Find tax period with files and creator
   * @param {string} periodId - Period ID
   * @returns {Promise<Object|null>} Tax period with relations
   */
  async findWithRelations(periodId) {
    return this.findById(periodId, {
      relations: ['creator', 'files', 'files.uploader']
    });
  }

  /**
   * Find all tax periods with creator information
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Tax periods with creator
   */
  async findAllWithCreator(options = {}) {
    return this.findAll({
      relations: ['creator'],
      order: { createdAt: 'DESC' },
      ...options
    });
  }

  /**
   * Find tax periods by status
   * @param {string} status - Period status
   * @returns {Promise<Array>} Tax periods
   */
  async findByStatus(status) {
    return this.findAll({
      where: { status },
      relations: ['creator'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Find tax periods by creator
   * @param {string} createdBy - Creator employee code
   * @returns {Promise<Array>} Tax periods
   */
  async findByCreator(createdBy) {
    return this.findAll({
      where: { createdBy },
      relations: ['creator'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Check if period name exists
   * @param {string} name - Period name
   * @param {string} excludeId - Period ID to exclude from check
   * @returns {Promise<boolean>} Existence status
   */
  async nameExists(name, excludeId = null) {
    const where = { name };
    if (excludeId) {
      where.periodId = { not: excludeId };
    }
    return this.exists(where);
  }

  /**
   * Update file count for a period
   * @param {string} periodId - Period ID
   * @param {number} increment - Increment amount (can be negative)
   * @returns {Promise<Object>} Updated period
   */
  async updateFileCount(periodId, increment) {
    await this.query(
      'UPDATE tax_periods SET "fileCount" = "fileCount" + $1 WHERE "periodId" = $2',
      [increment, periodId]
    );
    return this.findById(periodId);
  }

  /**
   * Update period status
   * @param {string} periodId - Period ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated period
   */
  async updateStatus(periodId, status) {
    return this.updateById(periodId, { status });
  }

  /**
   * Set result file path
   * @param {string} periodId - Period ID
   * @param {string} filePath - Result file path
   * @returns {Promise<Object>} Updated period
   */
  async setResultFile(periodId, filePath) {
    return this.updateById(periodId, {
      resultFilePath: filePath,
      status: 'COMPLETED'
    });
  }

  /**
   * Get periods with pagination and filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated result
   */
  async findPeriodsWithPagination(options = {}) {
    const { status, createdBy, ...paginationOptions } = options;

    const where = {};
    if (status) where.status = status;
    if (createdBy) where.createdBy = createdBy;

    return this.findAndCount({
      where,
      relations: ['creator'],
      order: { createdAt: 'DESC' },
      ...paginationOptions
    });
  }

  /**
   * Get period statistics
   * @returns {Promise<Object>} Period statistics
   */
  async getStatistics() {
    const stats = await this.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM tax_periods 
      GROUP BY status
    `);

    const total = await this.count();

    return {
      total,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.count);
        return acc;
      }, {})
    };
  }
}

module.exports = TaxPeriodRepository;
