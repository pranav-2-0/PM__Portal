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

    const insertResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, department_id, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [name, email, hashed, department_id, userRole]
    );

    const userResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.department_id, u.role, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [insertResult.rows[0].id]
    );

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
      `SELECT u.id, u.name, u.email, u.password_hash, u.department_id, u.role, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
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

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "SECRET");

    delete user.password_hash;

    return res.json({ user, token });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(400).json({ message: "Login failed" });
  }
};