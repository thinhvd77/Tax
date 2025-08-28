const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'TaxPeriod',
  tableName: 'tax_periods',
  columns: {
    periodId: { primary: true, type: 'uuid', generated: 'uuid' },
    name: { type: String, unique: true },
    status: { type: 'varchar', default: 'IN_PROGRESS' },
    createdBy: { type: String },
    fileCount: { type: Number, default: 0 },
    resultFilePath: { type: String, nullable: true },
    previewData: { type: 'text', nullable: true },
    createdAt: { type: 'timestamp with time zone', name: 'created_at', createDate: true },
    updatedAt: { type: 'timestamp with time zone', name: 'updated_at', updateDate: true },
  },
  relations: {
    creator: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'createdBy', referencedColumnName: 'employeeCode' },
      onDelete: 'RESTRICT',
      nullable: false,
    },
    files: {
      type: 'one-to-many',
      target: 'UploadedFile',
      inverseSide: 'period',
      cascade: false,
    },
  },
});