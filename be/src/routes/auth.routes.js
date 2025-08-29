const express = require('express');
const { login, getCurrentUser } = require('../controllers/auth.controller');
const auth = require('../middlewares/auth');

const router = express.Router();

// POST /api/auth/login - User login
router.post('/login', login);

// GET /api/auth/me - Get current user info
router.get('/me', auth, getCurrentUser);

module.exports = router;
