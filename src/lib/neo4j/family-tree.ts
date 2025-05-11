
import { FamilyTree } from '@/types';
import { runQuery } from './connection';

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

export const getFamilyMembers = async (familyTreeId: string) => {
  try {
    console.log(`Fetching family members for tree: ${familyTreeId}`);
    
    // Query to get all users in a family tree including relationship info
    const cypher = `
      MATCH (u:User {familyTreeId: $familyTreeId})
      OPTIONAL MATCH (creator:User)-[r]->(u)
      RETURN u.userId AS userId, u.name AS name, u.email AS email, u.status AS status, 
             type(r) AS relationship, creator.userId AS createdBy
    `;
    
    const result = await runQuery(cypher, { familyTreeId });
    console.log(`Found ${result.length} family members`);
    
    return result.map(record => ({
      userId: record.userId,
      name: record.name,
      email: record.email,
      status: record.status,
      relationship: record.relationship ? record.relationship.toLowerCase() : null,
      createdBy: record.createdBy
    }));
  } catch (error) {
    console.error("Error fetching family members:", error);
    return [];
  }
};

// Get the relationships between members in a family tree
export const getFamilyRelationships = async (familyTreeId: string) => {
  try {
    const cypher = `
      MATCH (u1:User {familyTreeId: $familyTreeId})-[r]->(u2:User {familyTreeId: $familyTreeId})
      RETURN u1.userId AS source, u2.userId AS target, type(r) AS type
    `;
    
    const result = await runQuery(cypher, { familyTreeId });
    return result.map(record => ({
      source: record.source,
      target: record.target,
      type: record.type.toLowerCase()
    }));
  } catch (error) {
    console.error("Error fetching family relationships:", error);
    return [];
  }
};
