import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/database";

// ✅ SIGNUP
export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, department_id, role } = req.body;
    const userRole = role || 'Employee';

    const hashed = await bcrypt.hash(password, 10);

    // For Super Admin, set department_id to NULL
    const finalDeptId = userRole === 'Super Admin' ? null : department_id;

    const insertResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, department_id, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [name, email, hashed, finalDeptId, userRole]
    );

    const userId = insertResult.rows[0].id;

    // Fetch user data
    let userResult;
    if (userRole === 'Super Admin') {
      // For Super Admin, fetch all departments
      userResult = await pool.query(
        `SELECT u.id, u.name, u.email, u.department_id, u.role,
                json_agg(json_build_object('id', d.id, 'name', d.name)) AS departments
         FROM users u
         LEFT JOIN departments d ON true
         WHERE u.id = $1
         GROUP BY u.id, u.name, u.email, u.department_id, u.role`,
        [userId]
      );
    } else {
      // For other roles, fetch their department
      userResult = await pool.query(
        `SELECT u.id, u.name, u.email, u.department_id, u.role, d.name AS department_name
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE u.id = $1`,
        [userId]
      );
    }

    const user = userResult.rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "SECRET");

    return res.json({ user, token });
  } catch (err: any) {
    console.error("Signup error:", err);
    return res.status(400).json({ message: "Signup failed" });
  }
};

// ✅ LOGIN
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.department_id, u.role
       FROM users u
       WHERE u.email = $1`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Fetch full user data with department info
    let fullUserResult;
    if (user.role === 'Super Admin') {
      // For Super Admin, fetch all departments
      fullUserResult = await pool.query(
        `SELECT u.id, u.name, u.email, u.department_id, u.role,
                json_agg(json_build_object('id', d.id, 'name', d.name)) AS departments
         FROM users u
         LEFT JOIN departments d ON true
         WHERE u.id = $1
         GROUP BY u.id, u.name, u.email, u.department_id, u.role`,
        [user.id]
      );
    } else {
      // For other roles, fetch their department
      fullUserResult = await pool.query(
        `SELECT u.id, u.name, u.email, u.department_id, u.role, d.name AS department_name
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE u.id = $1`,
        [user.id]
      );
    }

    const finalUser = fullUserResult.rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "SECRET");

    return res.json({ user: finalUser, token });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(400).json({ message: "Login failed" });
  }
};

// ✅ DEMO LOGIN (for development/demo purposes)
export const demoLogin = async (req: Request, res: Response) => {
  try {
    // Find demo user or create one
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.department_id, u.role, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = 'demo@test.com'
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Demo user not found" });
    }

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "SECRET");

    return res.json({ user, token });
  } catch (err: any) {
    console.error("Demo login error:", err);
    return res.status(500).json({ message: "Demo login failed", error: err.message });
  }
};