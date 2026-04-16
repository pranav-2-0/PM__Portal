// Utility to detect file type from buffer or filename
import path from 'path';

export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}
