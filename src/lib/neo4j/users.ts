
import { User } from '@/types';
import { runQuery } from './connection';
import { generateId, getCurrentDateTime } from '../utils';
import { hashPassword, verifyPassword, generateTempPassword } from './auth';

// User Management Functions
export const createUser = async (userData: Partial<User>): Promise<User> => {
  const cypher = `
    CREATE (u:User {
      userId: $userId,
      name: $name,
      email: $email,
      password: $password,
      status: $status,
      familyTreeId: $familyTreeId,
      createdBy: $createdBy,
      createdAt: $createdAt
    })
    RETURN u
  `;
  
  const result = await runQuery(cypher, userData);
  if (result && result.length > 0) {
    return result[0].u.properties as User;
  }
  throw new Error('Failed to create user');
};

export const getUserByEmailOrId = async (identifier: string): Promise<User | null> => {
  const cypher = `
    MATCH (u:User)
    WHERE u.userId = $identifier OR u.email = $identifier
    RETURN u
  `;
  
  const result = await runQuery(cypher, { identifier });
  if (result && result.length > 0) {
    return result[0].u.properties as User;
  }
  return null;
};

export const updateUser = async (userId: string, userData: Partial<User>): Promise<User> => {
  // Build dynamic SET clause based on provided fields
  const setParams = Object.entries(userData)
    .map(([key]) => `u.${key} = $${key}`)
    .join(', ');
  
  const cypher = `
    MATCH (u:User {userId: $userId})
    SET ${setParams}
    RETURN u
  `;
  
  const params = { userId, ...userData };
  const result = await runQuery(cypher, params);
  
  if (result && result.length > 0) {
    return result[0].u.properties as User;
  }
  throw new Error('Failed to update user');
};

export const checkEmailExists = async (email: string): Promise<boolean> => {
  const cypher = `
    MATCH (u:User {email: $email, status: 'active'})
    RETURN count(u) as count
  `;
  
  const result = await runQuery(cypher, { email });
  return result[0].count > 0;
};

export const getUserByEmailAndFamilyTree = async (email: string, familyTreeId: string): Promise<User | null> => {
  const cypher = `
    MATCH (u:User {email: $email, familyTreeId: $familyTreeId, status: 'invited'})
    RETURN u
  `;
  
  const result = await runQuery(cypher, { email, familyTreeId });
  if (result && result.length > 0) {
    return result[0].u.properties as User;
  }
  return null;
};
