"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'pm_alignment',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 50, // Increased for large dataset uploads (300K+ records)
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Increased timeout for large queries
    statement_timeout: 300000, // 5 minutes for large bulk operations
});
pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
    process.exit(-1);
});
exports.default = pool;
