
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
  // Debug the update operation
  console.log(`Updating user with ID: ${userId} with data:`, userData);
  
  // Create a separate object for userId update to handle it specially
  let userIdChange = null;
  const updatedFields = { ...userData };
  
  // Handle userId update separately if needed
  if (userData.userId && userData.userId !== userId) {
    userIdChange = userData.userId;
    delete updatedFields.userId; // Remove it from regular updates
  }
  
  // Build dynamic SET clause based on provided fields
  const setParams = Object.entries(updatedFields)
    .filter(([_, value]) => value !== undefined) // Only include defined values
    .map(([key]) => `u.${key} = $${key}`)
    .join(', ');
  
  if (!setParams.length && !userIdChange) {
    console.error("No valid parameters to update");
    throw new Error('No valid parameters to update');
  }
  
  // First update all regular fields
  let cypher = `
    MATCH (u:User {userId: $userId})
    SET ${setParams}
    RETURN u
  `;
  
  if (!setParams.length) {
    // If only changing userId, use a simpler query that just returns the user
    cypher = `
      MATCH (u:User {userId: $userId})
      RETURN u
    `;
  }
  
  const params = { userId, ...updatedFields };
  console.log("Running update query with params:", JSON.stringify(params));
  const result = await runQuery(cypher, params);
  
  if (!result || result.length === 0) {
    console.error(`No user found with ID: ${userId}`);
    throw new Error('Failed to update user: User not found');
  }
  
  // Handle userId change as a separate operation if needed
  if (userIdChange) {
    console.log(`Changing userId from ${userId} to ${userIdChange}`);
    
    const userIdUpdateCypher = `
      MATCH (u:User {userId: $oldUserId})
      SET u.userId = $newUserId
      RETURN u
    `;
    
    const userIdUpdateParams = { 
      oldUserId: userId, 
      newUserId: userIdChange 
    };
    
    console.log("Running userId update query with params:", JSON.stringify(userIdUpdateParams));
    const userIdUpdateResult = await runQuery(userIdUpdateCypher, userIdUpdateParams);
    
    if (!userIdUpdateResult || userIdUpdateResult.length === 0) {
      console.error(`Failed to update userId for user: ${userId}`);
      throw new Error('Failed to update userId');
    }
    
    console.log(`User ID updated from ${userId} to ${userIdChange} successfully`);
    return userIdUpdateResult[0].u.properties as User;
  }
  
  console.log(`User ${userId} updated successfully`);
  return result[0].u.properties as User;
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
  console.log(`Looking for user with email: ${email} in family tree: ${familyTreeId}`);
  
  // Fixed query - removed the status filter to check any user with this email in the family tree
  const cypher = `
    MATCH (u:User {email: $email, familyTreeId: $familyTreeId})
    RETURN u
  `;
  
  const result = await runQuery(cypher, { email, familyTreeId });
  
  if (result && result.length > 0) {
    const user = result[0].u.properties as User;
    console.log(`Found user: ${user.userId} with status: ${user.status}`);
    return user;
  }
  
  console.log(`No user found with email: ${email} in family tree: ${familyTreeId}`);
  return null;
};
