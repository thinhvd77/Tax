const databaseManager = require('../config/DatabaseManager');
const passwordService = require('./password.service');

class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
  }
}

const repos = () => databaseManager.getRepositories();

async function listUsers() {
  const { users } = repos();
  return users.findAll({ order: { createdAt: 'DESC' } });
}

async function createUser(data) {
  const { employeeCode, fullName, department, branch, role, password } = data;
  if (!employeeCode || !fullName || !department || !branch || !password) {
    throw new ServiceError(400, 'All fields are required');
  }
  const { users } = repos();
  const existing = await users.findByEmployeeCode(employeeCode);
  if (existing) throw new ServiceError(400, 'User with this employee code already exists');
  const hashed = await passwordService.hashPassword(password);
  return users.create({ employeeCode, fullName, department, branch, role: role || 'UPLOADER', password: hashed });
}

async function updateUser(employeeCode, data) {
  const { users } = repos();
  const user = await users.findByEmployeeCode(employeeCode);
  if (!user) throw new ServiceError(404, 'User not found');
  const updateData = { ...data };
  if (data.password) updateData.password = await passwordService.hashPassword(data.password);
  const updated = await users.updateById(employeeCode, updateData);
  return updated;
}

async function deleteUser(employeeCode) {
  const { users } = repos();
  const user = await users.findByEmployeeCode(employeeCode);
  if (!user) throw new ServiceError(404, 'User not found');
  if (user.role === 'ADMIN') {
    const adminCount = await users.count({ role: 'ADMIN' });
    if (adminCount <= 1) throw new ServiceError(400, 'Cannot delete the last admin user');
  }
  await users.deleteById(employeeCode);
  return { success: true };
}

module.exports = { listUsers, createUser, updateUser, deleteUser, ServiceError };
