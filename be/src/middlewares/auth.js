const { ServiceError, verifyTokenFromHeader } = require('../services/auth.service');

// Authentication middleware using the auth service
module.exports = async (req, res, next) => {
	try {
		const user = await verifyTokenFromHeader(req.headers.authorization);
		req.user = user;
		next();
	} catch (error) {
		const status = error instanceof ServiceError && error.status ? error.status : 401;
		res.status(status).json({ message: error.message || 'Invalid token' });
	}
};
