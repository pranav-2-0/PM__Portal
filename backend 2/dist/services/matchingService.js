"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchingService = void 0;
const gradeUtils_1 = require("../utils/gradeUtils");
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
/** Full grade level order for the Grade+1 matching rule (D3 grade does not exist) */
const GRADE_ORDER = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'];
const getGradeLevel = (grade) => {
    const idx = GRADE_ORDER.indexOf((grade || '').toUpperCase().trim());
    return idx;
};
/** Returns true if pmGrade is exactly ONE level above empGrade in the standard order */
const isExactlyOneGradeAbove = (pmGrade, empGrade) => {
    const pmLevel = getGradeLevel(pmGrade);
    const empLevel = getGradeLevel(empGrade);
    return pmLevel !== -1 && empLevel !== -1 && pmLevel === empLevel + 1;
};
class MatchingService {
    async getWeights() {
        const result = await database_1.default.query("SELECT config_value FROM configuration WHERE config_key = 'matching_weights'");
        return result.rows[0]?.config_value || {
            cu: 35, region: 20, skill: 15, grade: 15, account: 10, capacity: 5
        };
    }
    async getSkillClusterMap(practice) {
        const result = await database_1.default.query(`SELECT LOWER(skill_name) as skill_name, LOWER(skill_cluster) as skill_cluster
       FROM skill_repository
       WHERE ($1::text IS NULL OR practice = $1)`, [practice || null]);
        const map = new Map();
        for (const row of result.rows) {
            if (row.skill_name) {
                map.set(row.skill_name, row.skill_cluster || row.skill_name);
            }
        }
        return map;
    }
    getSkillScore(pmSkill, empSkill, clusterMap) {
        if (!pmSkill || !empSkill)
            return 0;
        const pm = pmSkill.toLowerCase().trim();
        const emp = empSkill.toLowerCase().trim();
        if (pm === emp)
            return 1.0;
        // Cluster-based similarity
        if (clusterMap) {
            const pmCluster = clusterMap.get(pm);
            const empCluster = clusterMap.get(emp);
            if (pmCluster && empCluster && pmCluster === empCluster) {
                return 0.8;
            }
        }
        // Fallback simple similarity
        return (0, gradeUtils_1.calculateSkillSimilarity)(pmSkill, empSkill);
    }
    async getCandidatePMs(employee) {
        // BUSINESS RULE: Practice is a 100% mandatory gate.
        // Employees are ONLY matched to PMs in the same practice.
        // No cross-practice fallback allowed — if none found, an exception is raised upstream.
        const result = await database_1.default.query(`SELECT * FROM people_managers
       WHERE is_active = true
         AND reportee_count < max_capacity
         AND practice = $1`, [employee.practice]);
        return { pms: result.rows, tier: 'practice' };
    }
    async findBestPM(employee) {
        const weights = await this.getWeights();
        // Validate employee data
        if (!employee.practice || !employee.cu || !employee.region || !employee.grade) {
            throw new Error('Employee missing required fields for PM matching');
        }
        // Fetch candidates — only same-practice PMs (100% mandatory gate)
        const { pms } = await this.getCandidatePMs(employee);
        if (pms.length === 0) {
            return [];
        }
        const clusterMap = await this.getSkillClusterMap(employee.practice);
        const matches = pms
            .filter(pm => (0, gradeUtils_1.isGradeEligible)(pm.grade, employee.grade) && (0, gradeUtils_1.isGradeGapAllowed)(pm.grade, employee.grade))
            .map(pm => {
            let score = 0;
            const reasons = [];
            const warnings = [];
            // Practice already guaranteed by gate — record it
            reasons.push(`Same practice: ${pm.practice}`);
            // Sub-practice bonus (fixed 20 pts — within same practice)
            if (pm.sub_practice && employee.sub_practice && pm.sub_practice === employee.sub_practice) {
                score += 20;
                reasons.push('Same sub-practice');
            }
            // CU match — weighted
            if (pm.cu && employee.cu && pm.cu === employee.cu) {
                score += weights.cu ?? 35;
                reasons.push('Same CU');
            }
            // Region match — weighted
            if (pm.region === employee.region) {
                score += weights.region ?? 20;
                reasons.push('Same region');
            }
            // Grade — weighted (exact +1 = full weight, proximity = partial)
            if (isExactlyOneGradeAbove(pm.grade, employee.grade)) {
                score += weights.grade ?? 15;
                reasons.push(`Grade +1: ${pm.grade} > ${employee.grade}`);
            }
            else if (pm.grade !== employee.grade) {
                const gradeScore = (0, gradeUtils_1.getGradeProximity)(pm.grade, employee.grade);
                score += Math.round((weights.grade ?? 15) * 0.5 * gradeScore);
                reasons.push(`Grade: ${pm.grade}`);
            }
            else {
                warnings.push(`Same grade as employee: ${pm.grade}`);
            }
            // Skill similarity — weighted (0–1 factor)
            let skillScore = 0;
            if (pm.skill && employee.skill) {
                skillScore = this.getSkillScore(pm.skill, employee.skill, clusterMap);
                score += Math.round((weights.skill ?? 15) * skillScore);
                if (skillScore >= 0.7) {
                    reasons.push('Similar skill');
                }
                else if (skillScore > 0) {
                    warnings.push(`Partial skill match: ${pm.skill} vs ${employee.skill}`);
                }
                else {
                    warnings.push(`Skill mismatch: ${pm.skill} vs ${employee.skill}`);
                }
            }
            else {
                warnings.push('Missing skill data');
            }
            // Account match — weighted
            if (pm.account && employee.account && pm.account === employee.account) {
                score += weights.account ?? 10;
                reasons.push('Same account');
            }
            // Capacity preference — weighted (inversely proportional to utilization)
            const maxCapacity = pm.max_capacity || (0, gradeUtils_1.getMaxCapacityForGrade)(pm.grade);
            const utilizationPercent = ((pm.reportee_count || 0) / maxCapacity) * 100;
            const capacityFactor = Math.max(0, 1 - utilizationPercent / 100);
            score += Math.round((weights.capacity ?? 5) * capacityFactor);
            reasons.push(`Capacity: ${pm.reportee_count}/${maxCapacity}`);
            if (utilizationPercent >= 80) {
                warnings.push(`High utilization: ${utilizationPercent.toFixed(0)}%`);
            }
            return { pm, score, reasons, skillScore, warnings };
        })
            .sort((a, b) => b.score - a.score);
        // BUSINESS RULE: Create exception if no PM has acceptable skill match
        if (matches.length > 0) {
            const bestSkillScore = Math.max(...matches.map(m => m.skillScore || 0));
            if (bestSkillScore < 0.7 && employee.skill) {
                logger_1.logger.warn('Poor skill match for employee', {
                    employeeId: employee.employee_id,
                    employeeSkill: employee.skill,
                    bestScore: bestSkillScore
                });
                // Create skill mismatch exception
                await database_1.default.query(`INSERT INTO exceptions (employee_id, exception_type, description, status)
           VALUES ($1, 'skill_mismatch', $2, 'open')
           ON CONFLICT DO NOTHING`, [
                    employee.employee_id,
                    `No PM found with matching skill. Employee skill: ${employee.skill}, Best match score: ${(bestSkillScore * 100).toFixed(0)}%`
                ]);
            }
        }
        return matches;
    }
    async assignPM(employeeId, pmId, assignmentType, score) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get current PM
            const empResult = await client.query('SELECT current_pm_id FROM employees WHERE employee_id = $1', [employeeId]);
            const oldPmId = empResult.rows[0]?.current_pm_id;
            // Create assignment
            const assignmentResult = await client.query(`INSERT INTO pm_assignments (employee_id, old_pm_id, new_pm_id, match_score, assignment_type, status)
         VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`, [employeeId, oldPmId, pmId, score, assignmentType]);
            await client.query('COMMIT');
            return assignmentResult.rows[0].id;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.MatchingService = MatchingService;
