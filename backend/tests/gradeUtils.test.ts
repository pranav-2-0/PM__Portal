import { getGradeLevel, isGradeEligible, getGradeProximity, calculateSkillSimilarity, getMaxCapacityForGrade } from '../src/utils/gradeUtils';

describe('Grade Utils', () => {
  describe('getGradeLevel', () => {
    it('should return correct level for valid grades', () => {
      expect(getGradeLevel('A1')).toBe(0);
      expect(getGradeLevel('C1')).toBe(4);
      expect(getGradeLevel('D3')).toBe(8);
      expect(getGradeLevel('E1')).toBe(9);
      expect(getGradeLevel('E2')).toBe(10);
    });

    it('should return -1 for invalid grades', () => {
      expect(getGradeLevel('X1')).toBe(-1);
    });
  });

  describe('isGradeEligible', () => {
    it('should return true when PM is C1+ and higher than employee', () => {
      expect(isGradeEligible('C1', 'B2')).toBe(true);
      expect(isGradeEligible('D1', 'C2')).toBe(true);
      expect(isGradeEligible('E1', 'D2')).toBe(true);
      expect(isGradeEligible('E2', 'D3')).toBe(true);
    });

    it('should return false when PM is below C1', () => {
      expect(isGradeEligible('B2', 'A1')).toBe(false);
    });

    it('should return false when PM is not higher than employee', () => {
      expect(isGradeEligible('C1', 'C1')).toBe(false);
      expect(isGradeEligible('C1', 'D1')).toBe(false);
    });
  });

  describe('getMaxCapacityForGrade', () => {
    it('C1/C2 should have max capacity of 10', () => {
      expect(getMaxCapacityForGrade('C1')).toBe(10);
      expect(getMaxCapacityForGrade('C2')).toBe(10);
    });

    it('D1/D2/D3 should have max capacity of 15', () => {
      expect(getMaxCapacityForGrade('D1')).toBe(15);
      expect(getMaxCapacityForGrade('D2')).toBe(15);
      expect(getMaxCapacityForGrade('D3')).toBe(15);
    });

    it('E1/E2 should have max capacity of 25', () => {
      expect(getMaxCapacityForGrade('E1')).toBe(25);
      expect(getMaxCapacityForGrade('E2')).toBe(25);
    });
  });

  describe('getGradeProximity', () => {
    it('should return 1.0 for 1 grade gap', () => {
      expect(getGradeProximity('C1', 'B2')).toBe(1.0);
    });

    it('should return 0 for gap > 3', () => {
      expect(getGradeProximity('D3', 'A1')).toBe(0);
    });
  });

  describe('calculateSkillSimilarity', () => {
    it('should return 1.0 for exact match', () => {
      expect(calculateSkillSimilarity('Java', 'Java')).toBe(1.0);
    });

    it('should return 0.7 for partial match', () => {
      expect(calculateSkillSimilarity('JavaScript', 'Java')).toBe(0.7);
    });

    it('should return 0 for no match', () => {
      expect(calculateSkillSimilarity('Java', 'Python')).toBe(0);
    });
  });
});
