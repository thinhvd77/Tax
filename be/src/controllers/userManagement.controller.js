const { listUsers: listUsersService, createUser: createUserService, updateUser: updateUserService, deleteUser: deleteUserService, ServiceError } = require('../services/user.service');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await listUsersService();
    const formattedUsers = users.map(user => ({
      employeeCode: user.employeeCode,
      fullName: user.fullName,
      department: user.department,
      branch: user.branch,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Error fetching users' });
  }
};

// Create new user (admin only)
const createUser = async (req, res) => {
  try {
    const user = await createUserService(req.body);
    const { password, ...response } = user;
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating user:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Error creating user' });
  }
};

// Update user (admin only)
const updateUser = async (req, res) => {
  try {
    const { employeeCode } = req.params;
    const updatedUser = await updateUserService(employeeCode, req.body);
    const { password, ...response } = updatedUser;
    res.json(response);
  } catch (error) {
    console.error('Error updating user:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Error updating user' });
  }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
  try {
    const { employeeCode } = req.params;
    await deleteUserService(employeeCode);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Error deleting user' });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
};
