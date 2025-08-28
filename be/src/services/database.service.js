const dataSource = require('../config/dataSource');
const UserRepository = require('../repositories/UserRepository');
const TaxPeriodRepository = require('../repositories/TaxPeriodRepository');
const UploadedFileRepository = require('../repositories/UploadedFileRepository');
const ImportSessionRepository = require('../repositories/ImportSessionRepository');
const ImportedFileRepository = require('../repositories/ImportedFileRepository');

/**
 * Database service providing access to all repositories and database operations
 * This replaces the old Sequelize-style wrapper with pure TypeORM
 */
class DatabaseService {
  constructor() {
    this.dataSource = dataSource;
    this.repositories = {};
    this.isInitialized = false;
  }

  /**
   * Initialize database connection and repositories
   */
  async initialize() {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
        console.log('✅ TypeORM: Database connection established successfully.');
      }

      // Initialize repositories
      this.repositories = {
        user: new UserRepository(this.dataSource),
        taxPeriod: new TaxPeriodRepository(this.dataSource),
        uploadedFile: new UploadedFileRepository(this.dataSource),
        importSession: new ImportSessionRepository(this.dataSource),
        importedFile: new ImportedFileRepository(this.dataSource)
      };

      // Run migrations and seeding
      await this.migrateStatusEnumToVarchar();
      await this.seedUsers();

      this.isInitialized = true;
      console.log('✅ TypeORM: Database service ready.');
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    }
  }

  /**
   * Get repository by name
   * @param {string} name - Repository name
   * @returns {BaseRepository} Repository instance
   */
  getRepository(name) {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }

    const repo = this.repositories[name];
    if (!repo) {
      throw new Error(`Repository '${name}' not found`);
    }

    return repo;
  }

  /**
   * Get user repository
   * @returns {UserRepository} User repository
   */
  get users() {
    return this.getRepository('user');
  }

  /**
   * Get tax period repository
   * @returns {TaxPeriodRepository} Tax period repository
   */
  get taxPeriods() {
    return this.getRepository('taxPeriod');
  }

  /**
   * Get uploaded file repository
   * @returns {UploadedFileRepository} Uploaded file repository
   */
  get uploadedFiles() {
    return this.getRepository('uploadedFile');
  }

  /**
   * Get import session repository
   * @returns {ImportSessionRepository} Import session repository
   */
  get importSessions() {
    return this.getRepository('importSession');
  }

  /**
   * Get imported file repository
   * @returns {ImportedFileRepository} Imported file repository
   */
  get importedFiles() {
    return this.getRepository('importedFile');
  }

  /**
   * Execute a transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    return this.dataSource.transaction(callback);
  }

  /**
   * Execute raw SQL query
   * @param {string} query - SQL query
   * @param {Array} parameters - Query parameters
   * @returns {Promise<any>} Query result
   */
  async query(query, parameters = []) {
    return this.dataSource.query(query, parameters);
  }

  /**
   * Migrate status enum to varchar (legacy migration)
   * @private
   */
  async migrateStatusEnumToVarchar() {
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      try {
        const enumTypeName = 'tax_period_status_enum';
        const tableName = 'tax_periods';
        const columnName = 'status';

        const colInfo = await queryRunner.query(
          `SELECT data_type, udt_name FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
          [tableName, columnName]
        );

        if (colInfo.length) {
          const { data_type, udt_name } = colInfo[0];
          if (String(udt_name) === enumTypeName || String(data_type).toUpperCase() === 'USER-DEFINED') {
            console.log('🔧 In-app migration: status enum -> varchar');
            await queryRunner.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" DROP DEFAULT`);
            await queryRunner.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE varchar USING "${columnName}"::text`);
            await queryRunner.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" SET DEFAULT 'IN_PROGRESS'`);
            await queryRunner.query(`DROP TYPE IF EXISTS "${enumTypeName}"`);
            console.log('✅ In-app migration applied.');
          }
        }
      } catch (e) {
        console.warn('⚠️ In-app migration skipped or failed:', e.message || e);
      } finally {
        await queryRunner.release();
      }
    } catch (e) {
      console.warn('⚠️ Could not create query runner for migration:', e.message || e);
    }
  }

  /**
   * Seed initial admin user
   * @private
   */
  async seedUsers() {
    try {
      const employeeCode = process.env.ADMIN_CODE || 'admin';
      const fullName = process.env.ADMIN_FULL_NAME || 'System Administrator';
      const department = process.env.ADMIN_DEPARTMENT || 'IT';
      const branch = process.env.ADMIN_BRANCH || 'HQ';
      const password = process.env.ADMIN_PASSWORD || 'admin';

      const existing = await this.users.findByEmployeeCode(employeeCode);
      if (!existing) {
        await this.users.create({ employeeCode, fullName, department, branch, password });
        console.log(`✅ Admin user initialized (employeeCode="${employeeCode}")`);
      } else {
        const updates = {};
        if (process.env.ADMIN_FULL_NAME) updates.fullName = fullName;
        if (process.env.ADMIN_DEPARTMENT) updates.department = department;
        if (process.env.ADMIN_BRANCH) updates.branch = branch;
        if (process.env.ADMIN_PASSWORD) updates.password = password;

        if (Object.keys(updates).length) {
          await this.users.updateById(employeeCode, updates);
          console.log(`🔄 Admin user updated from env (employeeCode="${employeeCode}")`);
        } else {
          console.log(`ℹ️ Admin user already exists (employeeCode="${employeeCode}")`);
        }
      }
    } catch (error) {
      console.error('Error initializing admin user:', error);
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.isInitialized = false;
      console.log('✅ Database connection closed.');
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
