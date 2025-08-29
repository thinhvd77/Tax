const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'ImportedFile',
  tableName: 'imported_files',
  columns: {
    id: { primary: true, type: Number, generated: 'increment' },
    session_id: { type: Number },
    original_filename: { type: String },
    file_type: { type: 'enum', enum: ['salary', 'bonus', 'dependent'], enumName: 'imported_file_type_enum' },
    file_size: { type: Number },
    uploaded_at: { type: 'timestamp with time zone', createDate: true },
  },
  relations: {
    session: {
      type: 'many-to-one',
      target: 'ImportSession',
      joinColumn: { name: 'session_id', referencedColumnName: 'id' },
      onDelete: 'CASCADE',
    },
  },
});
