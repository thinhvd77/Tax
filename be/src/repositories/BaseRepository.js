const { In, IsNull, Not } = require('typeorm');

/**
 * Base repository class providing common database operations
 * This class implements the Repository pattern for TypeORM entities
 */
class BaseRepository {
  constructor(dataSource, entityName) {
    this.dataSource = dataSource;
    this.entityName = entityName;
    this._repository = null;
  }

  /**
   * Get the TypeORM repository instance
   * @returns {Repository} TypeORM repository
   */
  get repository() {
    if (!this._repository) {
      this._repository = this.dataSource.getRepository(this.entityName);
    }
    return this._repository;
  }

  /**
   * Find entity by primary key
   * @param {string|number} id - Primary key value
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Entity or null
   */
  async findById(id, options = {}) {
    const { relations = [], select } = options;
    return this.repository.findOne({
      where: { [this.getPrimaryKey()]: id },
      relations,
      select
    });
  }

  /**
   * Find all entities matching criteria
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of entities
   */
  async findAll(options = {}) {
    const { where = {}, relations = [], order = {}, limit, offset, select } = options;

    const queryOptions = {
      where: this.buildWhereClause(where),
      relations,
      order,
      select
    };

    if (limit) queryOptions.take = limit;
    if (offset) queryOptions.skip = offset;

    return this.repository.find(queryOptions);
  }

  /**
   * Find one entity matching criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Entity or null
   */
  async findOne(options = {}) {
    const { where = {}, relations = [], order = {}, select } = options;

    return this.repository.findOne({
      where: this.buildWhereClause(where),
      relations,
      order,
      select
    });
  }

  /**
   * Count entities matching criteria
   * @param {Object} where - Where conditions
   * @returns {Promise<number>} Count of entities
   */
  async count(where = {}) {
    return this.repository.count({
      where: this.buildWhereClause(where)
    });
  }

  /**
   * Create new entity
   * @param {Object} data - Entity data
   * @returns {Promise<Object>} Created entity
   */
  async create(data) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  /**
   * Create multiple entities
   * @param {Array} dataArray - Array of entity data
   * @returns {Promise<Array>} Array of created entities
   */
  async createMany(dataArray) {
    const entities = this.repository.create(dataArray);
    return this.repository.save(entities);
  }

  /**
   * Update entity by ID
   * @param {string|number} id - Primary key value
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated entity
   */
  async updateById(id, data) {
    await this.repository.update({ [this.getPrimaryKey()]: id }, data);
    return this.findById(id);
  }

  /**
   * Update entities matching criteria
   * @param {Object} where - Where conditions
   * @param {Object} data - Update data
   * @returns {Promise<UpdateResult>} Update result
   */
  async updateMany(where, data) {
    return this.repository.update(this.buildWhereClause(where), data);
  }

  /**
   * Delete entity by ID
   * @param {string|number} id - Primary key value
   * @returns {Promise<boolean>} Success status
   */
  async deleteById(id) {
    const result = await this.repository.delete({ [this.getPrimaryKey()]: id });
    return result.affected > 0;
  }

  /**
   * Delete entities matching criteria
   * @param {Object} where - Where conditions
   * @returns {Promise<DeleteResult>} Delete result
   */
  async deleteMany(where) {
    return this.repository.delete(this.buildWhereClause(where));
  }

  /**
   * Check if entity exists
   * @param {Object} where - Where conditions
   * @returns {Promise<boolean>} Existence status
   */
  async exists(where) {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Find entities with pagination
   * @param {Object} options - Query options with pagination
   * @returns {Promise<Object>} Paginated result
   */
  async findAndCount(options = {}) {
    const { where = {}, relations = [], order = {}, limit = 10, offset = 0, select } = options;

    const [items, total] = await this.repository.findAndCount({
      where: this.buildWhereClause(where),
      relations,
      order,
      take: limit,
      skip: offset,
      select
    });

    return {
      items,
      total,
      limit,
      offset,
      hasNext: offset + limit < total,
      hasPrev: offset > 0
    };
  }

  /**
   * Execute raw query
   * @param {string} query - SQL query
   * @param {Array} parameters - Query parameters
   * @returns {Promise<any>} Query result
   */
  async query(query, parameters = []) {
    return this.dataSource.query(query, parameters);
  }

  /**
   * Build TypeORM where clause from simple object
   * @param {Object} where - Simple where conditions
   * @returns {Object} TypeORM where clause
   */
  buildWhereClause(where) {
    if (!where || typeof where !== 'object') return where;

    const result = {};

    for (const [key, value] of Object.entries(where)) {
      if (value === null) {
        result[key] = IsNull();
      } else if (value === undefined) {
        // Skip undefined values
        continue;
      } else if (Array.isArray(value)) {
        result[key] = In(value);
      } else if (typeof value === 'object' && value.not !== undefined) {
        result[key] = Not(value.not);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get primary key field name - should be overridden in child classes
   * @returns {string} Primary key field name
   */
  getPrimaryKey() {
    return 'id';
  }

  /**
   * Start a transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    return this.dataSource.transaction(callback);
  }
}

module.exports = BaseRepository;
