const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    // Employee Code is the primary identifier (also used as username)
    employeeCode: { type: String, primary: true },
    // Full name of the employee
    fullName: { type: String, nullable: false },
    // Organizational info
    department: { type: String, nullable: false },
    branch: { type: String, nullable: false },
    role: {type: String, default: 'UPLOADER'},
    password: { type: String, nullable: true },
    createdAt: { type: 'timestamp with time zone', name: 'created_at', createDate: true },
    updatedAt: { type: 'timestamp with time zone', name: 'updated_at', updateDate: true }
  },
});