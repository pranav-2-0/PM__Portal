"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const pmRoutes_1 = __importDefault(require("./routes/pmRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes")); // ✅ ADD THIS
const errorHandler_1 = require("./middleware/errorHandler");
const schedulerService_1 = require("./services/schedulerService");
const database_1 = require("./config/database");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)({
    origin: ['http://localhost:3002', 'http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '100mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '100mb' }));
// ✅ REGISTER AUTH ROUTES
app.use('/api/auth', authRoutes_1.default);
// ✅ EXISTING PM ROUTES
app.use('/api/pm', pmRoutes_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    (0, database_1.ensureExportIndexes)();
    console.log('Starting workflow automation scheduler...');
    schedulerService_1.schedulerService.start();
    console.log('Scheduler started successfully');
});
exports.default = app;
