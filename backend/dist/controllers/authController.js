"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoLogin = exports.login = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
// ✅ SIGNUP
const signup = async (req, res) => {
    try {
        const { name, email, password, department_id, role } = req.body;
        const userRole = role || 'Employee';
        const hashed = await bcryptjs_1.default.hash(password, 10);
        // For Super Admin, set department_id to NULL
        const finalDeptId = userRole === 'Super Admin' ? null : department_id;
        const insertResult = await database_1.default.query(`INSERT INTO users (name, email, password_hash, department_id, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`, [name, email, hashed, finalDeptId, userRole]);
        const userId = insertResult.rows[0].id;
        // Fetch user data
        let userResult;
        if (userRole === 'Super Admin') {
            // For Super Admin, fetch all departments
            userResult = await database_1.default.query(`SELECT u.id, u.name, u.email, u.department_id, u.role,
                json_agg(json_build_object('id', d.id, 'name', d.name)) AS departments
         FROM users u
         LEFT JOIN departments d ON true
         WHERE u.id = $1
         GROUP BY u.id, u.name, u.email, u.department_id, u.role`, [userId]);
        }
        else {
            // For other roles, fetch their department
            userResult = await database_1.default.query(`SELECT u.id, u.name, u.email, u.department_id, u.role, d.name AS department_name
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE u.id = $1`, [userId]);
        }
        const user = userResult.rows[0];
        const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET || "SECRET");
        return res.json({ user, token });
    }
    catch (err) {
        console.error("Signup error:", err);
        return res.status(400).json({ message: "Signup failed" });
    }
};
exports.signup = signup;
// ✅ LOGIN
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await database_1.default.query(`SELECT u.id, u.name, u.email, u.password_hash, u.department_id, u.role
       FROM users u
       WHERE u.email = $1`, [email]);
        const user = result.rows[0];
        if (!user) {
            return res.status(400).json({ message: "Invalid email" });
        }
        const valid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!valid) {
            return res.status(400).json({ message: "Invalid password" });
        }
        // Fetch full user data with department info
        let fullUserResult;
        if (user.role === 'Super Admin') {
            // For Super Admin, fetch all departments
            fullUserResult = await database_1.default.query(`SELECT u.id, u.name, u.email, u.department_id, u.role,
                json_agg(json_build_object('id', d.id, 'name', d.name)) AS departments
         FROM users u
         LEFT JOIN departments d ON true
         WHERE u.id = $1
         GROUP BY u.id, u.name, u.email, u.department_id, u.role`, [user.id]);
        }
        else {
            // For other roles, fetch their department
            fullUserResult = await database_1.default.query(`SELECT u.id, u.name, u.email, u.department_id, u.role, d.name AS department_name
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE u.id = $1`, [user.id]);
        }
        const finalUser = fullUserResult.rows[0];
        const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET || "SECRET");
        return res.json({ user: finalUser, token });
    }
    catch (err) {
        console.error("Login error:", err);
        return res.status(400).json({ message: "Login failed" });
    }
};
exports.login = login;
// ✅ DEMO LOGIN (for development/demo purposes)
const demoLogin = async (req, res) => {
    try {
        // Find demo user or create one
        const result = await database_1.default.query(`SELECT u.id, u.name, u.email, u.department_id, u.role, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = 'demo@test.com'
       LIMIT 1`);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Demo user not found" });
        }
        const user = result.rows[0];
        const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET || "SECRET");
        return res.json({ user, token });
    }
    catch (err) {
        console.error("Demo login error:", err);
        return res.status(500).json({ message: "Demo login failed", error: err.message });
    }
};
exports.demoLogin = demoLogin;
