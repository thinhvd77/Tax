const dataSource = require('../config/dataSource');
const passwordService = require('../services/password.service');
const UserRepository = require('../repositories/UserRepository');
const TaxPeriodRepository = require('../repositories/TaxPeriodRepository');
const UploadedFileRepository = require('../repositories/UploadedFileRepository');
const ImportSessionRepository = require('../repositories/ImportSessionRepository');
const ImportedFileRepository = require('../repositories/ImportedFileRepository');

/**
 * Database manager - centralized database access without legacy wrapper
 */
class DatabaseManager {
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
        users: new UserRepository(this.dataSource),
        taxPeriods: new TaxPeriodRepository(this.dataSource),
        uploadedFiles: new UploadedFileRepository(this.dataSource),
        importSessions: new ImportSessionRepository(this.dataSource),
        importedFiles: new ImportedFileRepository(this.dataSource)
      };

      // Run migrations and seeding
      await this.migrateStatusEnumToVarchar();
      await this.seedUsers();

      this.isInitialized = true;
      console.log('✅ Database manager ready.');
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    }
  }

  /**
   * Get repository by name
   */
  getRepository(name) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    const repo = this.repositories[name];
    if (!repo) {
      throw new Error(`Repository '${name}' not found`);
    }

    return repo;
  }

  /**
   * Get all repositories
   */
  getRepositories() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.repositories;
  }

  /**
   * Execute a transaction
   */
  async transaction(callback) {
    return this.dataSource.transaction(callback);
  }

  /**
   * Execute raw SQL query
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

      const existing = await this.repositories.users.findByEmployeeCode(employeeCode);
      if (!existing) {
        // Hash password using bcrypt before creating user
        const hashedPassword = await passwordService.hashPassword(password);
        await this.repositories.users.create({
          employeeCode,
          fullName,
          department,
          branch,
          role: 'ADMIN',
          password: hashedPassword
        });
        console.log(`✅ Admin user initialized (employeeCode="${employeeCode}")`);
      } else {
        const updates = {};
        if (process.env.ADMIN_FULL_NAME) updates.fullName = fullName;
        if (process.env.ADMIN_DEPARTMENT) updates.department = department;
        if (process.env.ADMIN_BRANCH) updates.branch = branch;
        if (process.env.ADMIN_PASSWORD) {
          // Hash password using bcrypt when updating
          updates.password = await passwordService.hashPassword(password);
        }

        if (Object.keys(updates).length) {
          await this.repositories.users.updateById(employeeCode, updates);
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
const databaseManager = new DatabaseManager();

module.exports = databaseManager;
