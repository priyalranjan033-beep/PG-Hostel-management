const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Login required' });
    }

    try {
        req.user = jwt.verify(
            header.split(' ')[1],
            process.env.JWT_SECRET
        );

        next();
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

function requireOwner(req, res, next) {
    if (req.user?.role !== 'owner') {
        return res.status(403).json({ message: 'Owner access required' });
    }

    next();
}

module.exports = { authenticateToken, requireOwner };