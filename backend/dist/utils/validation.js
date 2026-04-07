"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeString = exports.validateGrade = exports.validateEmail = void 0;
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validateGrade = (grade) => {
    const validGrades = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'D3'];
    return validGrades.includes(grade.toUpperCase());
};
exports.validateGrade = validateGrade;
const sanitizeString = (str) => {
    return str.trim().replace(/\s+/g, ' ');
};
exports.sanitizeString = sanitizeString;
