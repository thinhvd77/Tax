const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'UploadedFile',
  tableName: 'uploaded_files',
  columns: {
    fileId: { primary: true, type: 'uuid', generated: 'uuid' },
    periodId: { type: 'uuid' },
    fileName: { type: String },
    filePath: { type: String },
    uploadedBy: { type: String },
    fileSize: { type: Number },
    contentType: { type: String, nullable: true },
    uploadedAt: { type: 'timestamp with time zone', name: 'uploaded_at', createDate: true },
  },
  relations: {
    period: {
      type: 'many-to-one',
      target: 'TaxPeriod',
      joinColumn: { name: 'periodId', referencedColumnName: 'periodId' },
      onDelete: 'CASCADE',
    },
    uploader: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'uploadedBy', referencedColumnName: 'employeeCode' },
      onDelete: 'RESTRICT',
    },
  },
});
