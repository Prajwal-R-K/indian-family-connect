
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { InviteFormValues } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to validate email format
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Function to generate a unique ID with prefix
export function generateId(prefix: string): string {
  return `${prefix}${Math.floor(Math.random() * 10000)}`;
}

// Function to get current ISO date string
export function getCurrentDateTime(): string {
  return new Date().toISOString();
}

// Validate password strength
export function isValidPassword(password: string): boolean {
  // At least 8 characters with at least one number and one special character
  const re = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
  return re.test(password);
}

// Generate a temp password
export function generateTempPassword(): string {
  // Generate a more secure random password
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = 'p@ss';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Function to validate invite form
export function validateInviteForm(values: InviteFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  
  if (!values.email) {
    errors.email = "Email is required";
  } else if (!isValidEmail(values.email)) {
    errors.email = "Invalid email format";
  }
  
  if (!values.relationship || values.relationship.trim() === '') {
    errors.relationship = "Relationship is required";
  }
  
  return errors;
}

// Common relationship types in Indian families
export const relationshipTypes = [
  "father", "mother", "son", "daughter", "brother", "sister",
  "grandfather", "grandmother", "uncle", "aunt", "cousin", 
  "nephew", "niece", "father-in-law", "mother-in-law",
  "brother-in-law", "sister-in-law", "son-in-law", "daughter-in-law"
];
