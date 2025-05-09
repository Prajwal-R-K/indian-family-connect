
import { utilsGenerateTempPassword } from '../utils';

// Password utility functions - No hashing as requested by the user
export const hashPassword = (password: string): string => {
  // No hashing as per user's request
  return password;
};

export const verifyPassword = (password: string, hashedPassword: string): boolean => {
  // Since we're not hashing, direct comparison
  return hashedPassword === password;
};

export const generateTempPassword = (): string => {
  return utilsGenerateTempPassword();
};
