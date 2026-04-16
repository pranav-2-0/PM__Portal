/**
 * Data Formatting Utilities
 * Provides helpers for formatting dates, booleans, and other data types
 */

import { format, differenceInDays } from 'date-fns';

/**
 * Formats a date to DD MMM YYYY format
 * @param date - Date string or Date object
 * @returns Formatted date string or '—' if invalid
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  try {
    return format(new Date(date), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

/**
 * Calculates days remaining from today to a given date
 * @param date - Target date
 * @returns Days remaining (negative if past), or null if invalid date
 */
export function calculateDaysRemaining(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  try {
    return differenceInDays(new Date(date), new Date());
  } catch {
    return null;
  }
}

/**
 * Formats days remaining as a human-readable badge label
 * @param daysRemaining - Number of days
 * @returns Label string (e.g., "Past", "7d", "30d")
 */
export function formatDaysRemaining(daysRemaining: number | null): string {
  if (daysRemaining === null) return '—';
  if (daysRemaining < 0) return 'Past';
  return `${daysRemaining}d`;
}

/**
 * Converts boolean to Yes/No
 */
export function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value ? 'Yes' : 'No';
}

/**
 * Formats a skill string by cleaning up IDs and normalizing case
 * Handles formats like: "Appian[0741]", "0741-Appian", "appian 0741"
 * @param rawSkill - Raw skill string
 * @returns Normalized skill string (Title Case)
 */
export function normalizeSkill(rawSkill: string | null | undefined): string {
  if (!rawSkill) return 'Unspecified';
  
  return rawSkill
    .trim()
    // Remove ID patterns: [0741], (0741), 0741-, 0741 suffix
    .replace(/\[\s*\d+\s*\]/g, '')
    .replace(/\(\s*\d+\s*\)/g, '')
    .replace(/^\s*\d{3,}\s*[-:]?\s*/g, '')
    .replace(/\s+\d{3,}\s*$/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Convert to Title Case
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    || 'Unspecified';
}

/**
 * Truncates a string to a maximum length with ellipsis
 */
export function truncate(text: string | null | undefined, maxLength: number = 50): string {
  if (!text) return '—';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Formats a percentage value as a string
 */
export function formatPercent(value: number | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined) return '—';
  return (value * 100).toFixed(decimals) + '%';
}

/**
 * Formats a number with thousands separator
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString();
}

/**
 * Get badge class based on urgency level or status
 */
export function getUrgencyClass(daysRemaining: number | null): string {
  if (daysRemaining === null) return 'bg-gray-100 text-gray-500';
  if (daysRemaining < 0) return 'bg-gray-100 text-gray-500';
  if (daysRemaining <= 7) return 'bg-red-100 text-red-700';
  if (daysRemaining <= 30) return 'bg-orange-100 text-orange-700';
  return 'bg-green-100 text-green-700';
}

/**
 * Formatters object for use in table renderers
 */
export const FORMATTERS = {
  date: formatDate,
  daysRemaining: formatDaysRemaining,
  boolean: formatBoolean,
  skill: normalizeSkill,
  percent: formatPercent,
  number: formatNumber,
  truncate,
} as const;
