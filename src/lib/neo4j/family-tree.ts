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

    const cypher = `
      MATCH (u:User {familyTreeId: $familyTreeId})
      RETURN DISTINCT u.userId AS userId, u.name AS name, u.email AS email, u.status AS status,
      u.myRelationship AS myRelationship, u.createdBy AS createdBy,
      u.profilePicture AS profilePicture, u.gender AS gender
    `;

    const result = await runQuery(cypher, { familyTreeId });
    console.log(`Found ${result.length} family members`);

    return result.map(record => ({
      userId: record.userId,
      name: record.name,
      email: record.email,
      status: record.status,
      myRelationship: record.myRelationship,
      createdBy: record.createdBy,
      profilePicture: record.profilePicture,
      gender: record.gender || ''
    }));
  } catch (error) {
    console.error("Error fetching family members:", error);
    return [];
  }
};

export const getFamilyRelationships = async (familyTreeId: string) => {
  try {
    console.log(`Fetching family relationships for tree: ${familyTreeId}`);

    const cypher = `
      MATCH (u1:User {familyTreeId: $familyTreeId})-[r:RELATES_TO]->(u2:User {familyTreeId: $familyTreeId})
      RETURN u1.userId AS source, u2.userId AS target, r.relationship AS type,
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

export const createReciprocalRelationship = async (
  familyTreeId: string,
  sourceId: string,
  targetId: string,
  sourceGender: string,
  targetGender: string
) => {
  try {
    const { direct, reciprocal } = getRelationshipTypes(sourceGender, targetGender);

    const cypher = `
      MATCH (source:User {familyTreeId: $familyTreeId, userId: $sourceId})
      MATCH (target:User {familyTreeId: $familyTreeId, userId: $targetId})
      CREATE (source)-[:RELATES_TO {relationship: $direct}]->(target)
      CREATE (target)-[:RELATES_TO {relationship: $reciprocal}]->(source)
      RETURN source.userId as sourceId, target.userId as targetId
    `;

    const result = await runQuery(cypher, {
      familyTreeId,
      sourceId,
      targetId,
      direct,
      reciprocal,
    });

    return !!result;
  } catch (error) {
    console.error("Error creating relationship:", error);
    return false;
  }
};

// Helper to determine relationship direction and types
const getRelationshipTypes = (
  sourceGender: string,
  targetGender: string
): { direct: string; reciprocal: string } => {
  let direct = "PARENT";
  let reciprocal = "CHILD";
  if (sourceGender === "male") direct = "FATHER";
  if (sourceGender === "female") direct = "MOTHER";
  if (targetGender === "male") reciprocal = "SON";
  if (targetGender === "female") reciprocal = "DAUGHTER";
  return { direct, reciprocal };
};

// Updated function to fetch complete family tree data
export const getTraversableFamilyTreeData = async (
  familyTreeId: string,
  level: number = 5
) => {
  try {
    console.log(`Fetching complete family tree data for tree: ${familyTreeId} with level: ${level}`);

    // Cypher to get all users and their unidirectional relationships
    const cypher = `
      MATCH (u1:User {familyTreeId: $familyTreeId})-[r:RELATES_TO]->(u2:User {familyTreeId: $familyTreeId})
      WITH COLLECT(DISTINCT {source: u1.userId, target: u2.userId, type: r.relationship}) AS relationships
      MATCH (u:User {familyTreeId: $familyTreeId})
      RETURN COLLECT(DISTINCT {userId: u.userId, name: u.name, status: u.status, profilePicture: u.profilePicture, gender: u.gender, createdBy: u.createdBy}) AS nodes, relationships
    `;

    const result = await runQuery(cypher, { familyTreeId });

    if (!result || result.length === 0) {
      return { nodes: [], links: [] };
    }

    const { nodes, relationships } = result[0];

    const uniqueNodes = Array.from(new Map(
      nodes.map(node => [node.userId, node])
    ).values());

    const uniqueLinks = Array.from(new Map(
      relationships.map(link => [`${link.source}-${link.target}`, link])
    ).values());

    console.log(`Fetched ${uniqueNodes.length} nodes and ${uniqueLinks.length} relationships`);

    return { nodes: uniqueNodes, links: uniqueLinks };
  } catch (error) {
    console.error("Error getting traversable family tree data:", error);
    return { nodes: [], links: [] };
  }
};

export const getUserPersonalFamilyView = async (userId: string, familyTreeId: string) => {
  try {
    console.log(`Getting personal family view for user ${userId}`);

    const cypher = `
      MATCH (viewer:User {userId: $userId, familyTreeId: $familyTreeId})
      OPTIONAL MATCH (viewer)-[rel:RELATES_TO]->(member:User {familyTreeId: $familyTreeId})
      WITH viewer, collect({userId: member.userId, name: member.name, email: member.email, status: member.status, profilePicture: member.profilePicture, relationship: rel.relationship}) AS directRelationships
      UNWIND directRelationships AS relData
      RETURN relData.userId AS userId, relData.name AS name, relData.email AS email,
             relData.status AS status, relData.profilePicture AS profilePicture,
             relData.relationship AS relationship
    `;

    const result = await runQuery(cypher, { userId, familyTreeId });

    return result.map(record => ({
      userId: record.userId,
      name: record.name,
      email: record.email,
      status: record.status,
      profilePicture: record.profilePicture,
      relationship: record.relationship || null
    }));
  } catch (error) {
    console.error(`Error getting personal family view for user ${userId}:`, error);
    return [];
  }
};