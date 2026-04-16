import { EmployeeTable } from '../components';

export interface EmployeesProps {
  benchOnly?: boolean;
}

/**
 * Employees Feature Page
 * Renders the EmployeeTable component with optional bench-only mode.
 * Used by the People.tsx hub for both "All Employees" and "Bench Resources" tabs.
 */
export function Employees({ benchOnly = false }: EmployeesProps) {
  return <EmployeeTable benchOnly={benchOnly} />;
}
