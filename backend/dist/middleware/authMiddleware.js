"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization required' });
        }
        const token = authHeader.split(' ')[1];
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'SECRET');
        const userId = payload?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Invalid token payload' });
        }
        const result = await database_1.default.query(`SELECT u.id,
              u.name,
              u.email,
              u.department_id,
              u.role,
              d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`, [userId]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid user token' });
        }
        req.user = result.rows[0];
        next();
    }
    catch (error) {
        console.error('Authentication error:', error.message || error);
        return res.status(401).json({ message: 'Unauthorized' });
    }
};
exports.authMiddleware = authMiddleware;
