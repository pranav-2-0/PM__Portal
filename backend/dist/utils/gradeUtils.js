"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMaxCapacityForGrade = exports.calculateSkillSimilarity = exports.isGradeGapAllowed = exports.getGradeProximity = exports.isGradeEligible = exports.getGradeLevel = void 0;
const GRADE_HIERARCHY = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2']; // No D3 grade
const getGradeLevel = (grade) => {
    const index = GRADE_HIERARCHY.indexOf(grade.toUpperCase());
    return index === -1 ? -1 : index;
};
exports.getGradeLevel = getGradeLevel;
const isGradeEligible = (pmGrade, empGrade) => {
    const pmLevel = (0, exports.getGradeLevel)(pmGrade);
    const empLevel = (0, exports.getGradeLevel)(empGrade);
    if (pmLevel === -1 || empLevel === -1)
        return false;
    // PM must be at least 1 grade higher and C1+
    return pmLevel >= (0, exports.getGradeLevel)('C1') && pmLevel > empLevel;
};
exports.isGradeEligible = isGradeEligible;
const getGradeProximity = (pmGrade, empGrade) => {
    const pmLevel = (0, exports.getGradeLevel)(pmGrade);
    const empLevel = (0, exports.getGradeLevel)(empGrade);
    if (pmLevel === -1 || empLevel === -1)
        return 0;
    const gap = pmLevel - empLevel;
    if (gap <= 0 || gap > 3)
        return 0;
    return 1 - (gap - 1) / 3; // Normalize: 1 gap = 1.0, 2 gap = 0.67, 3 gap = 0.33
};
exports.getGradeProximity = getGradeProximity;
const isGradeGapAllowed = (pmGrade, empGrade, maxGap = 3) => {
    const pmLevel = (0, exports.getGradeLevel)(pmGrade);
    const empLevel = (0, exports.getGradeLevel)(empGrade);
    if (pmLevel === -1 || empLevel === -1)
        return false;
    const gap = pmLevel - empLevel;
    return gap > 0 && gap <= maxGap;
};
exports.isGradeGapAllowed = isGradeGapAllowed;
const calculateSkillSimilarity = (pmSkill, empSkill) => {
    if (!pmSkill || !empSkill)
        return 0;
    const pm = pmSkill.toLowerCase().trim();
    const emp = empSkill.toLowerCase().trim();
    if (pm === emp)
        return 1.0;
    // Simple similarity check (can be enhanced with skill clusters)
    if (pm.includes(emp) || emp.includes(pm))
        return 0.7;
    return 0;
};
exports.calculateSkillSimilarity = calculateSkillSimilarity;
/**
 * Get maximum capacity based on PM grade
 * Business Rule:
 *   C1/C2  → max 10 reportees
 *   D1/D2  → max 15 reportees  (D3 grade does not exist)
 *   E1/E2  → max 25 reportees
 */
const getMaxCapacityForGrade = (grade) => {
    const gradeUpper = grade.toUpperCase();
    const level = (0, exports.getGradeLevel)(gradeUpper);
    // E1, E2 (indices 8, 9 after D3 removal) → 25 reportees
    if (level >= 8) {
        return 25;
    }
    // D1, D2 (indices 6, 7) → 15 reportees
    if (level >= 6) {
        return 15;
    }
    // C1, C2 (indices 4, 5) → 10 reportees
    if (level >= 4) {
        return 10;
    }
    // Default for lower grades (shouldn't be PM but just in case)
    return 8;
};
exports.getMaxCapacityForGrade = getMaxCapacityForGrade;
