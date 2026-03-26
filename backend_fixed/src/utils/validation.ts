export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateGrade = (grade: string): boolean => {
  const validGrades = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'D3'];
  return validGrades.includes(grade.toUpperCase());
};

export const sanitizeString = (str: string): string => {
  return str.trim().replace(/\s+/g, ' ');
};
