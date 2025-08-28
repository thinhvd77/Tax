const databaseManager = require('../core/DatabaseManager');
const passwordService = require('../services/password.service');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const repositories = databaseManager.getRepositories();
    const users = await repositories.users.findAll({
      order: { createdAt: 'DESC' }
    });

    // Format response excluding password
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
    res.status(500).json({
      message: 'Error fetching users'
    });
  }
};

// Create new user (admin only)
const createUser = async (req, res) => {
  try {
    const { employeeCode, fullName, department, branch, role, password } = req.body;

    if (!employeeCode || !fullName || !department || !branch || !password) {
      return res.status(400).json({
        message: 'All fields are required'
      });
    }

    const repositories = databaseManager.getRepositories();

    // Check if user already exists
    const existingUser = await repositories.users.findByEmployeeCode(employeeCode);
    if (existingUser) {
      return res.status(400).json({
        message: 'User with this employee code already exists'
      });
    }

    // Hash password using bcrypt
    const hashedPassword = await passwordService.hashPassword(password);
    const user = await repositories.users.create({
      employeeCode,
      fullName,
      department,
      branch,
      role: role || 'UPLOADER',
      password: hashedPassword
    });

    // Return user without password
    const { password: _, ...userResponse } = user;
    res.status(201).json(userResponse);

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      message: 'Error creating user'
    });
  }
};

// Update user (admin only)
const updateUser = async (req, res) => {
  try {
    const { employeeCode } = req.params;
    const { fullName, department, branch, role, password } = req.body;

    const repositories = databaseManager.getRepositories();
    const user = await repositories.users.findByEmployeeCode(employeeCode);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Prepare update data
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (department) updateData.department = department;
    if (branch) updateData.branch = branch;
    if (role) updateData.role = role;

    // Hash password if provided
    if (password) {
      updateData.password = await passwordService.hashPassword(password);
    }

    // Update user
    const updatedUser = await repositories.users.updateById(employeeCode, updateData);

    // Return user without password
    const { password: _, ...userResponse } = updatedUser;
    res.json(userResponse);

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      message: 'Error updating user'
    });
  }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
  try {
    const { employeeCode } = req.params;

    const repositories = databaseManager.getRepositories();
    const user = await repositories.users.findByEmployeeCode(employeeCode);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Don't allow deleting the last admin
    if (user.role === 'ADMIN') {
      const adminCount = await repositories.users.count({ role: 'ADMIN' });
      if (adminCount <= 1) {
        return res.status(400).json({
          message: 'Cannot delete the last admin user'
        });
      }
    }

    await repositories.users.deleteById(employeeCode);

    res.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      message: 'Error deleting user'
    });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
};
