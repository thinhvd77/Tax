const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'ImportSession',
  tableName: 'import_sessions',
  columns: {
    id: { primary: true, type: Number, generated: 'increment' },
    month: { type: String },
    year: { type: Number },
    created_by: { type: String },
    file_count: { type: Number, default: 0 },
    status: { type: 'enum', enum: ['processing', 'completed', 'failed'], default: 'processing', enumName: 'import_session_status_enum' },
    result_file_path: { type: String, nullable: true },
    created_at: { type: 'timestamp with time zone', createDate: true },
    updated_at: { type: 'timestamp with time zone', updateDate: true },
  },
  relations: {
    files: {
      type: 'one-to-many',
      target: 'ImportedFile',
      inverseSide: 'session',
      cascade: false,
    },
  },
});
