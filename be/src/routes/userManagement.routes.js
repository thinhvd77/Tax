const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const adminAuth = require('../middlewares/adminAuth');
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userManagement.controller');

// All routes require authentication and admin role
router.use(auth);
router.use(adminAuth);

// Get all users
router.get('/users', getAllUsers);

// Create new user
router.post('/users', createUser);

// Update user
router.put('/users/:employeeCode', updateUser);

// Delete user
router.delete('/users/:employeeCode', deleteUser);

module.exports = router;
