
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
             u.myRelationship as myRelationship, type(r) AS relationship, creator.userId AS createdBy,
             u.profilePicture as profilePicture
    `;
    
    const result = await runQuery(cypher, { familyTreeId });
    console.log(`Found ${result.length} family members`);
    
    return result.map(record => ({
      userId: record.userId,
      name: record.name,
      email: record.email,
      status: record.status,
      myRelationship: record.myRelationship,
      relationship: record.relationship ? record.relationship.toLowerCase() : null,
      createdBy: record.createdBy,
      profilePicture: record.profilePicture
    }));
  } catch (error) {
    console.error("Error fetching family members:", error);
    return [];
  }
};

// Get the relationships between members in a family tree
export const getFamilyRelationships = async (familyTreeId: string) => {
  try {
    console.log(`Fetching family relationships for tree: ${familyTreeId}`);
    
    const cypher = `
      MATCH (u1:User {familyTreeId: $familyTreeId})-[r]->(u2:User {familyTreeId: $familyTreeId})
      RETURN u1.userId AS source, u2.userId AS target, type(r) AS type, 
             u1.name AS sourceName, u2.name AS targetName
    `;
    
    const result = await runQuery(cypher, { familyTreeId });
    console.log(`Found ${result.length} relationships`);
    
    return result.map(record => ({
      source: record.source,
      target: record.target,
      type: record.type.toLowerCase(),
      sourceName: record.sourceName,
      targetName: record.targetName
    }));
  } catch (error) {
    console.error("Error fetching family relationships:", error);
    return [];
  }
};

// Create reciprocal relationships between family members
export const createReciprocalRelationship = async (familyTreeId: string, userId1: string, userId2: string, relationship1: string, relationship2: string) => {
  try {
    const cypher = `
      MATCH (u1:User {familyTreeId: $familyTreeId, userId: $userId1})
      MATCH (u2:User {familyTreeId: $familyTreeId, userId: $userId2})
      // First clear any existing relationships to avoid duplicates
      OPTIONAL MATCH (u1)-[r1]->(u2)
      OPTIONAL MATCH (u2)-[r2]->(u1)
      DELETE r1, r2
      // Now create the new relationships
      WITH u1, u2
      CREATE (u1)-[r1:${relationship1.toUpperCase()}]->(u2)
      CREATE (u2)-[r2:${relationship2.toUpperCase()}]->(u1)
      RETURN type(r1) as rel1, type(r2) as rel2
    `;
    
    const result = await runQuery(cypher, { familyTreeId, userId1, userId2 });
    
    if (result && result.length > 0) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error creating reciprocal relationship:", error);
    return false;
  }
};

// Get full family tree visualization data
export const getFamilyTreeVisualizationData = async (familyTreeId: string) => {
  try {
    // Get all nodes and relationships in one query
    const cypher = `
      MATCH (u:User {familyTreeId: $familyTreeId})
      OPTIONAL MATCH (u)-[r]->(other:User {familyTreeId: $familyTreeId})
      RETURN u.userId AS id, u.name AS name, u.status AS status, u.myRelationship AS myRelationship,
             u.profilePicture AS profilePicture, collect({target: other.userId, type: type(r)}) AS relationships
    `;
    
    const result = await runQuery(cypher, { familyTreeId });
    
    // Format data for visualization
    const nodes = result.map(record => ({
      id: record.id,
      name: record.name,
      status: record.status,
      myRelationship: record.myRelationship,
      profilePicture: record.profilePicture
    }));
    
    // Extract all relationships
    const links: any[] = [];
    result.forEach(record => {
      if (record.relationships) {
        record.relationships.forEach((rel: any) => {
          if (rel.target) {
            links.push({
              source: record.id,
              target: rel.target,
              type: rel.type.toLowerCase()
            });
          }
        });
      }
    });
    
    return { nodes, links };
  } catch (error) {
    console.error("Error getting family tree visualization data:", error);
    return { nodes: [], links: [] };
  }
};
