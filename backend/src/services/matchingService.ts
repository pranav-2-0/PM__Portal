import { Employee, PeopleManager, PMMatch, MatchingWeights, MatchFlag, MatchConfidence } from '../types';
import { isGradeEligible, isGradeGapAllowed, getGradeProximity, calculateSkillSimilarity, getMaxCapacityForGrade } from '../utils/gradeUtils';
import pool from '../config/database';
import { logger } from '../utils/logger';

// ─── Grade helpers ──────────────────────────────────────────────────────────────
// Must stay in sync with GRADE_HIERARCHY in gradeUtils.ts (no A3/A4, no D3)
const GRADE_ORDER = ['A1','A2','B1','B2','C1','C2','D1','D2','E1','E2'];

const getGradeLevelLocal = (grade: string): number =>
  GRADE_ORDER.indexOf((grade || '').toUpperCase().trim());

const isExactlyOneGradeAbove = (pmGrade: string, empGrade: string): boolean => {
  const pmLevel  = getGradeLevelLocal(pmGrade);
  const empLevel = getGradeLevelLocal(empGrade);
  return pmLevel !== -1 && empLevel !== -1 && pmLevel === empLevel + 1;
};

// ─── Flag builder ───────────────────────────────────────────────────────────────
const mkFlag = (severity: MatchFlag['severity'], code: string, message: string): MatchFlag =>
  ({ severity, code, message });

// ─── Skill classification (Step E) ─────────────────────────────────────────────
type SkillResult =
  | { tier: 'E1'; score: 1.0 }       // Exact match
  | { tier: 'E2'; score: number }     // Closest skill (same-BU scope or cluster)
  | { tier: 'E3'; score: number }     // Closest skill (cross-BU — assigned by caller)
  | { tier: 'E4'; score: 0 };         // No match / no data  →  PM EXCLUDED

function classifySkill(
  pmSkill:    string | undefined,
  empSkill:   string | undefined,
  clusterMap: Map<string, string>
): SkillResult {
  if (!pmSkill || !empSkill) return { tier: 'E4', score: 0 };

  const pm  = pmSkill.toLowerCase().trim();
  const emp = empSkill.toLowerCase().trim();

  if (pm === emp) return { tier: 'E1', score: 1.0 };

  const pmCluster  = clusterMap.get(pm);
  const empCluster = clusterMap.get(emp);
  if (pmCluster && empCluster && pmCluster === empCluster)
    return { tier: 'E2', score: 0.8 };

  const sim = calculateSkillSimilarity(pmSkill, empSkill);
  if (sim >= 0.5) return { tier: 'E2', score: sim };

  return { tier: 'E4', score: 0 };
}

// ─── Matching Service ───────────────────────────────────────────────────────────
export class MatchingService {

  private async getWeights(): Promise<MatchingWeights> {
    const result = await pool.query(
      "SELECT config_value FROM configuration WHERE config_key = 'matching_weights'"
    );
    return result.rows[0]?.config_value || {
      cu: 35, region: 20, skill: 15, grade: 15, account: 10, capacity: 5
    };
  }

  private async getSkillClusterMap(practice?: string): Promise<Map<string, string>> {
    const result = await pool.query(
      `SELECT LOWER(skill_name) AS skill_name, LOWER(skill_cluster) AS skill_cluster
       FROM skill_repository
       WHERE ($1::text IS NULL OR practice = $1)`,
      [practice || null]
    );
    const map = new Map<string, string>();
    for (const row of result.rows) {
      if (row.skill_name) map.set(row.skill_name, row.skill_cluster || row.skill_name);
    }
    return map;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────
  // getCandidatePMs  —  Step 1: Pre-Validation (Mandatory Eligibility Gate)
  //
  // ALL four conditions must pass for a PM to enter the selection pool.
  // A failure on ANY condition → PM is excluded (❌ per Unified PM Selection spec).
  //
  //  Spec condition              Implementation
  //  ─────────────────────────── ────────────────────────────────────────────────
  //  ✔ PM is NOT on long leave   Two complementary checks:
  //                              (a) Duration-based: both dates present, window > 30 days,
  //                                  AND CURRENT_DATE falls within that window.
  //                              (b) leave_type-based: if leave_type explicitly signals a
  //                                  long-duration leave category ('long leave', 'maternity',
  //                                  'paternity', 'sabbatical', 'medical leave', 'loa'),
  //                                  the PM is excluded regardless of date precision.
  //                              Either check alone is sufficient to exclude the PM.
  //
  //  ✔ PM is NOT resigned        is_active = true
  //                              Resigned / retired PMs are deactivated when their
  //                              separation record is processed (separation pipeline).
  //
  //  ✔ PM capacity ≤ 10          reportee_count < 10
  //                              Hard spec cap of 10 reportees maximum. We gate on
  //                              reportee_count < 10 (strictly less) so the PM has
  //                              room to absorb at least one more reportee after
  //                              assignment. A PM already at 10 cannot accept more.
  //
  //  ✔ PM level is N+ (Step A1)  practice = $1
  //                              Practice-scoped gate. PMs outside the employee's
  //                              practice are rejected (Path 8 / A2 → STOP).
  //                              Grade N+ enforcement is done in-memory (see Step 1
  //                              Grade N+ filter with escalation) to support the
  //                              spec-required level-escalation fallback without a
  //                              second DB round-trip.
  // ─────────────────────────────────────────────────────────────────────────────

  // Long-leave leave_type keywords (case-insensitive, substring match)
  private static readonly LONG_LEAVE_TYPES = [
    'long leave', 'long-leave', 'longleave',
    'maternity', 'paternity',
    'sabbatical',
    'medical leave', 'medical-leave',
    'leave of absence', 'loa',
    'extended leave',
  ];

  private async getCandidatePMs(practice: string): Promise<PeopleManager[]> {
    const longLeavePattern = MatchingService.LONG_LEAVE_TYPES
      .map(t => t.replace(/'/g, "''"))          // SQL-escape single quotes
      .map(t => `LOWER(pm.leave_type) LIKE '%${t}%'`)
      .join(' OR ');

    const result = await pool.query(
      `SELECT pm.*,
              EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - pm.created_at)) / 86400 AS tenure_days
       FROM people_managers pm
       WHERE pm.is_active        = true

         -- ✔ Same practice (Step A1 gate — Path 8 / A2 → STOP for mismatches)
         AND pm.practice         = $1

         -- ✔ PM capacity < 10 (hard spec cap; PM must have room for ≥1 more reportee)
         AND pm.reportee_count  < 10

         -- ✔ PM is NOT on long leave
         --   (a) Duration-based: active date window > 30 days AND today is within it
         AND NOT (
               pm.leave_start_date IS NOT NULL
           AND pm.leave_end_date   IS NOT NULL
           AND (pm.leave_end_date  - pm.leave_start_date) > 30
           AND CURRENT_DATE BETWEEN pm.leave_start_date AND pm.leave_end_date
         )
         --   (b) leave_type-based: explicit long-leave category signals exclusion
         AND NOT (
               pm.leave_type IS NOT NULL
           AND (${longLeavePattern})
         )`,
      [practice]
    );
    return result.rows;
  }

  private async persistException(employeeId: string, type: string, description: string) {
    try {
      await pool.query(
        `INSERT INTO exceptions (employee_id, exception_type, description, status)
         VALUES ($1, $2, $3, 'open')
         ON CONFLICT DO NOTHING`,
        [employeeId, type, description]
      );
    } catch { /* non-blocking */ }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // getCandidatePMsRelaxed  —  PM_RESIGNATION_OVERRIDE pool (§4 Relaxation Order)
  //
  // When isPMResigned = TRUE and normal matching fails, the system MUST assign a PM.
  // This method progressively relaxes constraints in the order specified in the spec:
  //   1. Ignore Account constraint         (handled in scorePM — always)
  //   2. Expand to Cross-BU               (handled in findBestPM tier logic)
  //   3. Expand to All regions             (this method — no region/practice filter)
  //   4. Relax Skill requirement           (scorePMRelaxed — weakest skill accepted)
  //   5. Relax Capacity constraint >10     (this method — reportee_count < max_capacity)
  //   6. Relax Level constraint            (findBestPM grade fallback path)
  //
  // This pool is ONLY used when normal candidates = 0 AND isPMResigned = true.
  // ─────────────────────────────────────────────────────────────────────────────
  private async getCandidatePMsRelaxed(practice: string): Promise<PeopleManager[]> {
    const longLeavePattern = MatchingService.LONG_LEAVE_TYPES
      .map(t => t.replace(/'/g, "''"))
      .map(t => `LOWER(pm.leave_type) LIKE '%${t}%'`)
      .join(' OR ');

    // Relaxation 5: capacity > 10 allowed — use max_capacity instead of hard cap
    // Relaxation 3: same practice first, then all practices if still empty
    const result = await pool.query(
      `SELECT pm.*,
              EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - pm.created_at)) / 86400 AS tenure_days
       FROM people_managers pm
       WHERE pm.is_active = true
         -- Still exclude PMs on long leave (non-negotiable safety constraint)
         AND NOT (
               pm.leave_start_date IS NOT NULL
           AND pm.leave_end_date   IS NOT NULL
           AND (pm.leave_end_date  - pm.leave_start_date) > 30
           AND CURRENT_DATE BETWEEN pm.leave_start_date AND pm.leave_end_date
         )
         AND NOT (
               pm.leave_type IS NOT NULL
           AND (${longLeavePattern})
         )
         -- Relaxation 5: allow over-capacity (use max_capacity, not hard cap 10)
         AND pm.reportee_count < COALESCE(pm.max_capacity, 15)
       ORDER BY
         -- Prefer same practice first, then cross-practice
         CASE WHEN pm.practice = $1 THEN 0 ELSE 1 END,
         pm.reportee_count ASC`,
      [practice]
    );
    return result.rows;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // scorePMRelaxed  —  used ONLY in PM_RESIGNATION_OVERRIDE mode
  //
  // Key difference from scorePM:
  //   - E4 (no skill match) does NOT return null — PM is still included with
  //     score=0 for skill so a guaranteed assignment can be made (spec §4).
  //   - isCrossBU=true by default since this pool crosses all regions/BUs.
  //   - confidenceLevel forced to 'Low', path='PathF_ForcedAssignment'.
  // ─────────────────────────────────────────────────────────────────────────────
  private scorePMRelaxed(
    pm:         PeopleManager,
    employee:   Employee,
    weights:    MatchingWeights,
    clusterMap: Map<string, string>
  ): PMMatch {
    const flags:    MatchFlag[] = [];
    const reasons:  string[]    = ['[FORCED] PM_RESIGNATION_OVERRIDE — normal path failed'];
    const warnings: string[]    = ['Forced assignment: isPMResigned=true, all constraints relaxed'];
    let   score                 = 0;

    // Practice alignment (preferred but not required in relaxed mode)
    const samePractice = pm.practice === employee.practice;
    if (samePractice) {
      score += 20;
      reasons.push(`Same practice: ${pm.practice}`);
    } else {
      flags.push(mkFlag('Critical', 'CROSS_PRACTICE_FORCED',
        `Relaxation: PM practice "${pm.practice}" differs from employee practice "${employee.practice}". Forced by resignation override.`));
      warnings.push(`Cross-practice: ${employee.practice} → ${pm.practice}`);
    }

    // Region
    if (pm.region === employee.region) {
      score += weights.region ?? 20;
      reasons.push('Same region');
    } else {
      flags.push(mkFlag('Major', 'REGION_RELAXED',
        `Relaxation 3: Region constraint ignored — employee: ${employee.region}, PM: ${pm.region}`));
    }

    // BU
    if (pm.cu === employee.cu) {
      score += weights.cu ?? 35;
      reasons.push('Same BU');
    } else {
      flags.push(mkFlag('Major', 'CROSS_BU_RELAXED',
        `Relaxation 2: Cross-BU — employee: ${employee.cu}, PM: ${pm.cu}`));
    }

    // Skill — Relaxation 4: accept weak match or no match
    const skillResult = classifySkill(pm.skill, employee.skill, clusterMap);
    if (skillResult.tier === 'E1') {
      score += weights.skill ?? 15;
      reasons.push(`Exact skill (E1): ${pm.skill}`);
    } else if (skillResult.tier === 'E2' || skillResult.tier === 'E3') {
      score += Math.round((weights.skill ?? 15) * skillResult.score * 0.5);
      reasons.push(`Closest skill (${skillResult.tier}): ${pm.skill} ≈ ${employee.skill}`);
      flags.push(mkFlag('Major', 'SKILL_WEAK_RELAXED',
        `Relaxation 4: Weak skill match accepted — PM: "${pm.skill}" vs employee: "${employee.skill}"`));
    } else {
      // E4 — no skill match, but FORCED so we include with score=0 for skill
      flags.push(mkFlag('Critical', 'SKILL_NONE_RELAXED',
        `Relaxation 4: No skill match — PM: "${pm.skill ?? 'N/A'}" vs employee: "${employee.skill ?? 'N/A'}". Assigned anyway by resignation override.`));
      warnings.push('No skill alignment — forced by resignation override');
    }

    // Grade — Relaxation 6: level constraint relaxed
    const pmLevel  = getGradeLevelLocal(pm.grade);
    const empLevel = getGradeLevelLocal(employee.grade);
    if (pmLevel > empLevel) {
      score += weights.grade ?? 15;
      reasons.push(`Grade above employee: ${pm.grade} > ${employee.grade}`);
    } else {
      flags.push(mkFlag('Major', 'GRADE_RELAXED',
        `Relaxation 6: Level constraint relaxed — PM grade ${pm.grade} is not above employee grade ${employee.grade}`));
    }

    // Capacity — Relaxation 5: over-cap allowed
    const cap = pm.max_capacity ?? 10;
    const utilPct = ((pm.reportee_count || 0) / cap) * 100;
    const capacityFactor = Math.max(0, 1 - utilPct / 100);
    score += Math.round((weights.capacity ?? 5) * capacityFactor);
    if ((pm.reportee_count || 0) >= 10) {
      flags.push(mkFlag('Major', 'CAPACITY_RELAXED',
        `Relaxation 5: Capacity constraint relaxed — PM has ${pm.reportee_count}/${cap} reportees (over normal cap of 10)`));
      reasons.push(`Over-capacity PM used: ${pm.reportee_count}/${cap}`);
    } else {
      reasons.push(`Capacity: ${pm.reportee_count}/${cap}`);
    }

    return {
      pm,
      score,
      reasons,
      skillScore: skillResult.score,
      warnings,
      flags,
      confidence:       'Low',
      matchTier:        'forced_assignment',
      path:             'PathF_ForcedAssignment',
      tiebreakerApplied: null,
      forcedAssignment:  true,
      overrideReason:    'PM_RESIGNATION_OVERRIDE',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // scorePM  —  evaluate one PM through Steps B → E
  //
  // Returns null   → PM excluded (E4 path — no skill match or missing skill data)
  // Returns PMMatch → PM is valid; carries score + structured flags
  // ─────────────────────────────────────────────────────────────────────────────
  private scorePM(
    pm:         PeopleManager,
    employee:   Employee,
    weights:    MatchingWeights,
    clusterMap: Map<string, string>,
    isCrossBU:  boolean     // true only when evaluated as a cross-BU fallback
  ): PMMatch | null {

    const flags:    MatchFlag[] = [];
    const reasons:  string[]    = [];
    const warnings: string[]    = [];
    let   score                 = 0;
    let   confidence: MatchConfidence = 'High';
    let   matchTier             = 'exact';

    // ── Practice confirmed (guaranteed by getCandidatePMs — A1) ───────────────
    reasons.push(`Same practice: ${pm.practice}`);

    // Sub-practice alignment bonus (not a spec gate, improves score fidelity)
    if (pm.sub_practice && employee.sub_practice && pm.sub_practice === employee.sub_practice) {
      score += 20;
      reasons.push('Same sub-practice');
    }

    // ── Step B: Region ─────────────────────────────────────────────────────────
    const sameRegion = pm.region === employee.region;
    if (sameRegion) {
      score += weights.region ?? 20;
      reasons.push('Same region (B1)');
    } else {
      flags.push(mkFlag('Major', 'NO_PM_SAME_REGION',
        `B2: No PM in same region — employee: ${employee.region}, PM: ${pm.region}. Falling back to BU check.`));
      warnings.push(`Region mismatch: ${employee.region} vs ${pm.region}`);
      if (confidence === 'High') confidence = 'Medium';
    }

    // ── Step C: BU ─────────────────────────────────────────────────────────────
    const sameBU = !!(pm.cu && employee.cu && pm.cu === employee.cu);
    if (isCrossBU) {
      // Only reached because no same-BU PM survived pre-validation (C2 → D3)
      flags.push(mkFlag('Major', 'NO_PM_SAME_BU',
        `C2→D3: No PM found in employee BU "${employee.cu}". Cross-BU PM "${pm.cu}" used. Lowest confidence path.`));
      warnings.push(`Cross-BU fallback: ${employee.cu} → ${pm.cu}`);
      matchTier  = 'cross_bu';
      confidence = 'Low';
    } else if (sameBU) {
      score += weights.cu ?? 35;
      reasons.push('Same BU (C1)');
    }

    // ── Step D: Account ────────────────────────────────────────────────────────
    const sameAccount = !!(pm.account && employee.account && pm.account === employee.account);
    if (sameBU && sameAccount) {
      score += weights.account ?? 10;
      reasons.push('Same account (D1)');
    } else if (sameBU && !sameAccount) {
      if (employee.account && pm.account) {
        flags.push(mkFlag('Minor', 'SAME_BU_DIFF_ACCOUNT',
          `D2: Same BU but different account — employee: ${employee.account}, PM: ${pm.account}.`));
        warnings.push(`Different account: ${employee.account} vs ${pm.account}`);
      }
      if (!isCrossBU) matchTier = 'same_bu_diff_account';
      if (confidence === 'High') confidence = 'Medium';
    }
    // isCrossBU → D3 already flagged above

    // ── Step E: Skill ──────────────────────────────────────────────────────────
    const skillResult = classifySkill(pm.skill, employee.skill, clusterMap);

    if (skillResult.tier === 'E4') {
      // E4 — exclude PM entirely; never auto-assign (Path 10)
      if (!pm.skill || !employee.skill) {
        flags.push(mkFlag('Critical', 'SKILL_DATA_MISSING',
          `E4: No skill data for ${!pm.skill ? 'PM' : 'employee'}. Cannot evaluate skill alignment. Manual review required.`));
      } else {
        flags.push(mkFlag('Critical', 'SKILL_NO_MATCH',
          `E4: No acceptable skill proximity — PM: "${pm.skill}" vs employee: "${employee.skill}". Manual review required.`));
      }
      return null;
    }

    if (skillResult.tier === 'E1') {
      score += weights.skill ?? 15;
      reasons.push(`Exact skill match (E1): ${pm.skill}`);
    }

    if (skillResult.tier === 'E2') {
      score += Math.round((weights.skill ?? 15) * skillResult.score);
      reasons.push(`Closest skill (E2): ${pm.skill} ≈ ${employee.skill}`);
      flags.push(mkFlag('Major', 'SKILL_CLUSTER_MATCH',
        `E2: Exact skill not found; closest acceptable match used — PM: "${pm.skill}" vs employee: "${employee.skill}".`));
      warnings.push(`Closest skill used: ${pm.skill} ≈ ${employee.skill}`);
      if (confidence === 'High') confidence = 'Medium';
      // E3: closest skill in a cross-BU context → further reduce confidence
      if (isCrossBU) {
        flags.push(mkFlag('Major', 'SKILL_CROSS_SCOPE',
          `E3: Closest skill used in a cross-BU context — confidence further reduced.`));
        confidence = 'Low';
        matchTier  = 'cross_bu';
      }
    }

    // ── Grade scoring ───────────────────────────────────────────────────────────
    if (isExactlyOneGradeAbove(pm.grade, employee.grade)) {
      score += weights.grade ?? 15;
      reasons.push(`Grade +1: ${pm.grade} > ${employee.grade}`);
    } else if (pm.grade !== employee.grade) {
      const gradeScore = getGradeProximity(pm.grade, employee.grade);
      score += Math.round((weights.grade ?? 15) * 0.5 * gradeScore);
      reasons.push(`Grade: ${pm.grade}`);
    } else {
      warnings.push(`Same grade as employee: ${pm.grade}`);
    }

    // ── Capacity score contribution (lower reportee_count = better score) ────────
    // Pre-validation already enforces reportee_count < 10 (hard spec cap, room for ≥1 more),
    // so we score relative to the 9-slot ceiling (max allowed before gate blocks entry).
    const SPEC_CAPACITY_CAP = 10;        // Maximum allowed reportees (spec hard limit)
    const AVAILABLE_CAP     = SPEC_CAPACITY_CAP - 1;  // 9 = max at which PM enters pool
    const utilPct        = ((pm.reportee_count || 0) / AVAILABLE_CAP) * 100;
    const capacityFactor = Math.max(0, 1 - utilPct / 100);
    score += Math.round((weights.capacity ?? 5) * capacityFactor);
    reasons.push(`Capacity: ${pm.reportee_count}/${SPEC_CAPACITY_CAP} (spec cap — must stay <${SPEC_CAPACITY_CAP})`);
    if (utilPct >= 80) warnings.push(`High utilization: ${utilPct.toFixed(0)}% of available pool capacity`);

    // ── Spec path label ─────────────────────────────────────────────────────────
    let path: import('../types').MatchPath;
    if (isCrossBU) {
      path = skillResult.tier === 'E1' ? 'Path7_CrossBUExactSkill' : 'Path6_CrossBU';
    } else if (sameBU && sameAccount && skillResult.tier === 'E1') {
      path = 'Path1_Perfect';
    } else if (sameBU && sameAccount && skillResult.tier === 'E2') {
      path = 'Path2_SkillFallback';
    } else if (sameBU && !sameAccount) {
      path = sameRegion ? 'Path3_DiffAccount' : 'Path5_RegionAccount';
    } else {
      path = sameRegion ? 'Path4_RegionFallback' : 'Path5_RegionAccount';
    }

    return { pm, score, reasons, skillScore: skillResult.score, warnings, flags, confidence, matchTier, path };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // findBestPM  —  Main entry point
  //
  // Step 1  Pre-Validation  getCandidatePMs() SQL gate (ALL conditions mandatory)
  //           ✔ is_active = true              (not resigned / deactivated)
  //           ✔ NOT currently on long leave   (duration-based: window > 30d AND today within it
  //                                            OR leave_type-based: maternity / sabbatical / LOA etc.)
  //           ✔ reportee_count < 10           (capacity hard cap — PM must have room for ≥1 more)
  //           ✔ Same practice                 (Step A1 gate; A2 → Path 8 Reject)
  //
  // Step 1  Grade N+ filter with escalation
  //           Pass 1 : isGradeEligible (C1+, above emp) + isGradeGapAllowed (gap ≤ 3)
  //           Escalation : if zero results, relax gap cap while keeping ALL other
  //                        pre-validation criteria intact (they live in SQL)
  //
  // Step 2  Decision tree  B → C → D → E
  //           Tier 1 = same-BU PMs  (Paths 1-5)  — evaluated first
  //           Tier 2 = cross-BU PMs (Paths 6-7)  — only when Tier 1 yields 0
  //           E4     = excluded in both tiers     (Path 10 — manual review required)
  //           Both empty → Path 9 (Unmappable)
  //
  // Step 3  Tie-breakers  F1 capacity → F2 tenure → F3 account history → F4 ID
  //
  // Returns PMMatch[] sorted best-first.
  // Each entry carries: score, path, confidence, matchTier, flags, warnings, reasons,
  // and tiebreakerApplied (set on the winning match when a tie was broken).
  // ─────────────────────────────────────────────────────────────────────────────
  async findBestPM(employee: Employee, isPMResigned: boolean = false): Promise<PMMatch[]> {

    if (!employee.practice || !employee.region || !employee.grade) {
      throw new Error('Employee missing required fields (practice, region, grade) for PM matching');
    }

    const weights    = await this.getWeights();
    const clusterMap = await this.getSkillClusterMap(employee.practice);

    // ── Step 1: Pre-Validation gate ────────────────────────────────────────────
    const allPMs = await this.getCandidatePMs(employee.practice);

    if (allPMs.length === 0) {
      await this.persistException(
        employee.employee_id, 'no_pm_in_practice',
        `A2/Path8: No PMs in practice "${employee.practice}" passed pre-validation ` +
        `(is_active=true, not on long leave [duration or leave_type], reportee_count < 10).`
      );
      // isPMResigned override: fall through to relaxed pool
      if (!isPMResigned) return [];
    }

    // ── Step 1: Grade N+ filter with escalation ────────────────────────────────
    // Pass 1 — strict: PM must be C1+, above emp grade, gap ≤ 3 levels
    let gradePMs = allPMs.filter(
      pm => isGradeEligible(pm.grade, employee.grade) && isGradeGapAllowed(pm.grade, employee.grade)
    );

    // Escalation: if no PM found at gap ≤ 3, search higher grades.
    // Per spec: "escalate to next higher level, reapply all eligibility criteria."
    // All eligibility criteria (active, leave, capacity) remain in force because
    // they were already applied in getCandidatePMs — only the gap cap is relaxed.
    if (gradePMs.length === 0) {
      logger.warn('Grade escalation triggered — no PM at N+1..N+3', {
        employeeId: employee.employee_id,
        grade:      employee.grade,
      });
      gradePMs = allPMs.filter(pm => isGradeEligible(pm.grade, employee.grade));
    }

    if (gradePMs.length === 0) {
      await this.persistException(
        employee.employee_id, 'no_eligible_grade_pm',
        `No PMs in practice "${employee.practice}" at any eligible grade above ` +
        `${employee.grade} (escalation also failed).`
      );
      // isPMResigned override: fall through to relaxed pool
      if (!isPMResigned) return [];
    }

    // ── Step 2: Partition same-BU / cross-BU ──────────────────────────────────
    const sameBUPMs  = gradePMs.filter(pm => pm.cu && employee.cu && pm.cu === employee.cu);
    const crossBUPMs = gradePMs.filter(pm => !(pm.cu && employee.cu && pm.cu === employee.cu));

    // ── Tier 1: score same-BU PMs (Paths 1-5) ─────────────────────────────────
    const tier1: PMMatch[] = [];
    for (const pm of sameBUPMs) {
      const r = this.scorePM(pm, employee, weights, clusterMap, false);
      if (r !== null) tier1.push(r);
    }

    // ── Tier 2: cross-BU fallback (Paths 6-7) — only when Tier 1 is empty ─────
    let tier2: PMMatch[] = [];
    if (tier1.length === 0 && crossBUPMs.length > 0) {
      for (const pm of crossBUPMs) {
        const r = this.scorePM(pm, employee, weights, clusterMap, true);
        if (r !== null) tier2.push(r);
      }
    }

    let candidates = tier1.length > 0 ? tier1 : tier2;

    // ── §4 RESIGNATION OVERRIDE — guaranteed assignment ────────────────────────
    // isPMResigned=TRUE: MUST return a valid PM; NO MATCH is strictly not allowed.
    // Activate full constraint relaxation when normal matching yields 0 candidates.
    if (candidates.length === 0 && isPMResigned) {
      logger.warn('PM_RESIGNATION_OVERRIDE activated — relaxing all constraints', {
        employeeId: employee.employee_id,
        practice:   employee.practice,
        cu:         employee.cu,
        region:     employee.region,
      });

      await this.persistException(
        employee.employee_id, 'pm_resignation_override',
        `isPMResigned=TRUE: Normal matching returned 0 candidates. ` +
        `Activating FORCED_ASSIGNMENT with full constraint relaxation. ` +
        `Employee: ${employee.employee_id}, Practice: ${employee.practice}, ` +
        `BU: ${employee.cu}, Region: ${employee.region}, Skill: ${employee.skill ?? 'N/A'}.`
      );

      // Relaxed pool: global region (Relaxation 3) + over-capacity allowed (Relaxation 5)
      const relaxedPMs = await this.getCandidatePMsRelaxed(employee.practice);

      if (relaxedPMs.length === 0) {
        // Absolute failure — no active, non-leave PMs exist anywhere
        await this.persistException(
          employee.employee_id, 'resignation_override_failed',
          `CRITICAL: isPMResigned=TRUE but NO active PMs exist anywhere. ` +
          `Manual intervention required immediately.`
        );
        logger.error('Resignation override failed — no PMs available globally', {
          employeeId: employee.employee_id,
        });
        return [];
      }

      // Score all relaxed candidates (Relaxations 2+4+6 applied in scorePMRelaxed)
      const relaxedCandidates: PMMatch[] = relaxedPMs.map(
        pm => this.scorePMRelaxed(pm, employee, weights, clusterMap)
      );

      // Sort: best score → minimum capacity overload → deterministic ID
      relaxedCandidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aLoad = a.pm.reportee_count ?? 0;
        const bLoad = b.pm.reportee_count ?? 0;
        if (aLoad !== bLoad) return aLoad - bLoad;
        return a.pm.employee_id.localeCompare(b.pm.employee_id);
      });

      const forcedBest = relaxedCandidates[0];
      forcedBest.tiebreakerApplied = null;

      logger.info('Forced assignment selected via PM_RESIGNATION_OVERRIDE', {
        employeeId:   employee.employee_id,
        assignedPmId: forcedBest.pm.employee_id,
        pmPractice:   forcedBest.pm.practice,
        pmBU:         forcedBest.pm.cu,
        pmRegion:     forcedBest.pm.region,
        score:        forcedBest.score,
        flags:        (forcedBest.flags ?? []).map(f => f.code),
      });

      await this.persistException(
        employee.employee_id, 'forced_assignment_made',
        `FORCED_ASSIGNMENT: PM ${forcedBest.pm.employee_id} assigned to employee ` +
        `${employee.employee_id} via PM_RESIGNATION_OVERRIDE. ` +
        `PM practice: ${forcedBest.pm.practice}, BU: ${forcedBest.pm.cu}, ` +
        `Region: ${forcedBest.pm.region}. Score: ${forcedBest.score}. ` +
        `Flags: ${(forcedBest.flags ?? []).map(f => f.code).join(', ')}.`
      );

      return relaxedCandidates;
    }

    if (candidates.length === 0) {
      await this.persistException(
        employee.employee_id, 'no_valid_pm_found',
        `Path 9/10: No PM found for employee ${employee.employee_id}. ` +
        `Practice: ${employee.practice}, BU: ${employee.cu}, Region: ${employee.region}, ` +
        `Skill: ${employee.skill || 'N/A'}. ` +
        `All candidates excluded by E4 (no skill match). Manual review required.`
      );
      return [];
    }

    // ── Step 3: Tie-breakers ───────────────────────────────────────────────────
    // Track which tie-breaker resolved the top position (if any)
    let tiebreakerApplied: string | null = null;

    const sorted = candidates.sort((a, b) => {
      // Primary: score descending
      if (b.score !== a.score) return b.score - a.score;

      // F1: lowest reportee_count (most available capacity) — spec hard cap is 10, pool gate is <10
      const aFree = 9 - (a.pm.reportee_count || 0);
      const bFree = 9 - (b.pm.reportee_count || 0);
      if (bFree !== aFree) {
        tiebreakerApplied = 'F1: Lowest available capacity';
        return bFree - aFree;
      }

      // F2: longest tenure
      const aTenure = (a.pm as any).tenure_days ?? 0;
      const bTenure = (b.pm as any).tenure_days ?? 0;
      if (bTenure !== aTenure) {
        tiebreakerApplied = 'F2: Highest tenure';
        return bTenure - aTenure;
      }

      // F3: historical alignment — PM account matches employee account
      const aAcct = a.pm.account === employee.account ? 1 : 0;
      const bAcct = b.pm.account === employee.account ? 1 : 0;
      if (bAcct !== aAcct) {
        tiebreakerApplied = 'F3: Historical alignment (past account match)';
        return bAcct - aAcct;
      }

      // F4: deterministic PM ID sort
      tiebreakerApplied = 'F4: Deterministic PM ID sort';
      return a.pm.employee_id.localeCompare(b.pm.employee_id);
    });

    // Only keep tiebreakerApplied when the top two candidates had the same score
    if (sorted.length < 2 || sorted[0].score !== sorted[1].score) {
      tiebreakerApplied = null;
    }

    // ── Post-processing exceptions ─────────────────────────────────────────────
    const best = sorted[0];

    // Stamp tie-breaker onto the winning match for the controller to surface
    best.tiebreakerApplied = tiebreakerApplied;

    if (best.confidence === 'Low') {
      await this.persistException(
        employee.employee_id, 'low_confidence_match',
        `Low confidence match (${best.matchTier}). PM: ${best.pm.employee_id}. ` +
        `Flags: ${(best.flags || []).map(f => f.code).join(', ')}`
      );
    }

    const bestSkillScore = Math.max(...sorted.map(m => m.skillScore || 0));
    if (bestSkillScore < 0.7 && employee.skill) {
      logger.warn('Poor skill match', {
        employeeId:     employee.employee_id,
        skill:          employee.skill,
        bestSkillScore,
      });
      await this.persistException(
        employee.employee_id, 'skill_mismatch',
        `No PM with strong skill match. Employee skill: ${employee.skill}. ` +
        `Best score: ${(bestSkillScore * 100).toFixed(0)}%`
      );
    }

    return sorted;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // validateDatasetScope  —  Step A dataset-level check
  // Call before bulk-processing to detect non-practice-scoped uploads.
  // ─────────────────────────────────────────────────────────────────────────────
  validateDatasetScope(employees: Employee[]): {
    isScoped:      boolean;
    practices:     string[];
    criticalFlag?: MatchFlag;
  } {
    const practices = [...new Set(employees.map(e => (e.practice || '').trim()).filter(Boolean))];
    if (practices.length <= 1) return { isScoped: true, practices };
    return {
      isScoped: false,
      practices,
      criticalFlag: mkFlag(
        'Critical',
        'DATASET_NOT_PRACTICE_SCOPED',
        `A2: Dataset is not practice-scoped — ${practices.length} distinct practices found: ` +
        `${practices.join(', ')}. Rows with PM practice ≠ employee practice are Unmappable.`
      ),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // assignPM  —  record an assignment (unchanged)
  // ─────────────────────────────────────────────────────────────────────────────
  async assignPM(
    employeeId:     string,
    pmId:           string,
    assignmentType: 'new_joiner' | 'reassignment' | 'FORCED_ASSIGNMENT',
    score?:         number
  ) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const empResult = await client.query(
        'SELECT current_pm_id FROM employees WHERE employee_id = $1',
        [employeeId]
      );
      const oldPmId = empResult.rows[0]?.current_pm_id;
      const result  = await client.query(
        `INSERT INTO pm_assignments (employee_id, old_pm_id, new_pm_id, match_score, assignment_type, status)
         VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
        [employeeId, oldPmId, pmId, score, assignmentType]
      );
      await client.query('COMMIT');
      return result.rows[0].id;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
