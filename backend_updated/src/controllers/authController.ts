import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/database";

// ✅ SIGNUP
export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, department_id } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, department_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, department_id`,
      [name, email, hashed, department_id]
    );

    const user = result.rows[0];

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
      `SELECT * FROM users WHERE email = $1`,
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