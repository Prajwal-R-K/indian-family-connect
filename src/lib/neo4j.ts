
// Real Neo4j connection using neo4j-driver
import neo4j from 'neo4j-driver';
import { User, FamilyTree, Relationship } from '@/types';
import { sendEmail } from './email';

// Neo4j connection details
export const neo4jConfig = {
  uri: "neo4j+s://c5f5e77a.databases.neo4j.io",
  username: "neo4j",
  password: "Oz9qEfjqCAuuRiokV1WGikXxCv8ktaNlZyVdLty4rXY"
};

// Create Neo4j driver instance
const driver = neo4j.driver(
  neo4jConfig.uri, 
  neo4j.auth.basic(neo4jConfig.username, neo4jConfig.password)
);

// Helper function to run Cypher queries
const runQuery = async (cypher: string, params = {}) => {
  const session = driver.session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map(record => {
      const obj: Record<string, any> = {};
      for (let i = 0; i < record.keys.length; i++) {
        const key = record.keys[i];
        obj[key] = record.get(key);
      }
      return obj;
    });
  } catch (error) {
    console.error("Neo4j Query Error:", error);
    throw error;
  } finally {
    await session.close();
  }
};

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

export const getInvitedUserByEmail = async (email: string, familyTreeId: string): Promise<User | null> => {
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

// Family Tree Functions
export const createFamilyTree = async (treeData: Partial<FamilyTree>): Promise<FamilyTree> => {
  const cypher = `
    CREATE (ft:FamilyTree {
      familyTreeId: $familyTreeId,
      createdBy: $createdBy,
      createdAt: $createdAt
    })
    RETURN ft
  `;
  
  const result = await runQuery(cypher, treeData);
  if (result && result.length > 0) {
    return result[0].ft.properties as FamilyTree;
  }
  throw new Error('Failed to create family tree');
};

export const getFamilyTree = async (familyTreeId: string): Promise<FamilyTree | null> => {
  const cypher = `
    MATCH (ft:FamilyTree {familyTreeId: $familyTreeId})
    RETURN ft
  `;
  
  const result = await runQuery(cypher, { familyTreeId });
  if (result && result.length > 0) {
    return result[0].ft.properties as FamilyTree;
  }
  return null;
};

// Relationship Functions
export const createRelationship = async (relationshipData: Relationship): Promise<Relationship> => {
  const { from, to, type, fromUserId } = relationshipData;
  
  const cypher = `
    MATCH (fromUser:User {email: $from})
    MATCH (toUser:User {email: $to})
    CREATE (fromUser)-[r:${type.toUpperCase()} {fromUserId: $fromUserId}]->(toUser)
    RETURN type(r) as type, r.fromUserId as fromUserId, fromUser.email as from, toUser.email as to
  `;
  
  const result = await runQuery(cypher, { from, to, fromUserId });
  if (result && result.length > 0) {
    return {
      from: result[0].from,
      to: result[0].to,
      type: result[0].type.toLowerCase(),
      fromUserId: result[0].fromUserId
    };
  }
  throw new Error('Failed to create relationship');
};

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
  // Generate a more secure random password
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = 'p@ss';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};
