
import { utilsGenerateTempPassword } from '../utils';

// Password utility functions
export const hashPassword = (password: string): string => {
  // In a real app, use proper hashing library like bcrypt
  // For demo, we'll use a simple hash
  return `hashed_${password}`;
};

export const verifyPassword = (password: string, hashedPassword: string): boolean => {
  return hashedPassword === `hashed_${password}`;
};

export const generateTempPassword = (): string => {
  return utilsGenerateTempPassword();
};
