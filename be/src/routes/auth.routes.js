const express = require('express');
const { login, getCurrentUser, authenticateToken } = require('../controllers/auth.controller');

const router = express.Router();

// POST /api/auth/login - User login
router.post('/login', login);

// GET /api/auth/me - Get current user info
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;
