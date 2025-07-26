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
      OPTIONAL MATCH (creator:User)-[r:RELATES_TO]->(u)
      WITH u, creator, collect(r.relationship)[0] AS relationship
      RETURN DISTINCT u.userId AS userId, u.name AS name, u.email AS email, u.status AS status,
      u.myRelationship AS myRelationship, relationship AS relationship, creator.userId AS createdBy,
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
      relationship: record.relationship ? record.relationship.toLowerCase() : null,
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
  parentId: string,
  childId: string,
  parentGender: string,
  childGender: string
) => {
  try {
    const { parentToChild } = getRelationshipTypes(parentGender, childGender);

    const cypher = `
      MATCH (parent:User {familyTreeId: $familyTreeId, userId: $parentId})
      MATCH (child:User {familyTreeId: $familyTreeId, userId: $childId})
      CREATE (parent)-[:RELATES_TO {relationship: $parentToChild}]->(child)
      RETURN parent.userId as parentId, child.userId as childId
    `;

    const result = await runQuery(cypher, {
      familyTreeId,
      parentId,
      childId,
      parentToChild,
    });

    return !!result;
  } catch (error) {
    console.error("Error creating relationship:", error);
    return false;
  }
};

// Helper to determine relationship direction and types
const getRelationshipTypes = (
  elderGender: string,
  youngerGender: string
): { parentToChild: string; childToParent: string } => {
  let parentToChild = "SON";
  let childToParent = "FATHER";
  if (youngerGender === "female") parentToChild = "DAUGHTER";
  if (elderGender === "female") childToParent = "MOTHER";
  return { parentToChild, childToParent };
};

// Updated function to fetch complete family tree data
export const getTraversableFamilyTreeData = async (
  familyTreeId: string,
  level: number = 5
) => {
  try {
    console.log(`Fetching complete family tree data for tree: ${familyTreeId} with level: ${level}`);

    const cypher = `
      MATCH (u:User {familyTreeId: $familyTreeId})
      // Traverse up for ancestors
      OPTIONAL MATCH pAncestor = (u)<-[:RELATES_TO*1..${level}]-(ancestor:User {familyTreeId: $familyTreeId})
      WHERE ALL(r IN relationships(pAncestor) WHERE r.relationship IN ['FATHER', 'MOTHER', 'GRANDFATHER', 'GRANDMOTHER'])

      // Traverse down for descendants
      OPTIONAL MATCH pDescendant = (u)-[:RELATES_TO*1..${level}]-(descendant:User {familyTreeId: $familyTreeId})
      WHERE ALL(r IN relationships(pDescendant) WHERE r.relationship IN ['SON', 'DAUGHTER', 'GRANDSON', 'GRANDDAUGHTER'])

      // Traverse sideways for spouse
      OPTIONAL MATCH (u)-[r:RELATES_TO]-(spouse:User {familyTreeId: $familyTreeId})
      WHERE r.relationship IN ['WIFE', 'HUSBAND', 'SPOUSE']

      // Traverse sideways for siblings
      OPTIONAL MATCH (u)<-[relToParent:RELATES_TO]-(parent:User {familyTreeId: $familyTreeId})
      OPTIONAL MATCH (parent)-[relToSibling:RELATES_TO]->(sibling:User {familyTreeId: $familyTreeId})
      WHERE sibling <> u
      AND TYPE(relToParent) IN ['FATHER', 'MOTHER']
      AND TYPE(relToSibling) IN ['SON', 'DAUGHTER']

      // Collect all relevant users with their properties
      WITH {userId: u.userId, name: u.name, status: u.status, profilePicture: u.profilePicture, gender: u.gender, createdBy: u.createdBy} AS startNodeData,
           COLLECT(DISTINCT CASE ancestor WHEN null THEN null ELSE {userId: ancestor.userId, name: ancestor.name, status: ancestor.status, profilePicture: ancestor.profilePicture, gender: ancestor.gender, createdBy: ancestor.createdBy} END) AS ancestors,
           COLLECT(DISTINCT CASE descendant WHEN null THEN null ELSE {userId: descendant.userId, name: descendant.name, status: descendant.status, profilePicture: descendant.profilePicture, gender: descendant.gender, createdBy: descendant.createdBy} END) AS descendants,
           COLLECT(DISTINCT CASE spouse WHEN null THEN null ELSE {userId: spouse.userId, name: spouse.name, status: spouse.status, profilePicture: spouse.profilePicture, gender: spouse.gender, createdBy: spouse.createdBy} END) AS spouses,
           COLLECT(DISTINCT CASE sibling WHEN null THEN null ELSE {userId: sibling.userId, name: sibling.name, status: sibling.status, profilePicture: sibling.profilePicture, gender: sibling.gender, createdBy: sibling.createdBy} END) AS siblings

      WITH startNodeData + [x IN ancestors WHERE x IS NOT NULL] + [x IN descendants WHERE x IS NOT NULL] + [x IN spouses WHERE x IS NOT NULL] + [x IN siblings WHERE x IS NOT NULL] AS allNodes

      // Collect relationships and preserve nodes
      UNWIND allNodes AS u1
      UNWIND allNodes AS u2
      WITH u1, u2, allNodes
      OPTIONAL MATCH (u1Node:User {userId: u1.userId, familyTreeId: $familyTreeId})-[r:RELATES_TO]-(u2Node:User {userId: u2.userId, familyTreeId: $familyTreeId})
      WHERE u1Node <> u2Node
      WITH COLLECT(DISTINCT CASE r WHEN null THEN null ELSE {source: u1.userId, target: u2.userId, type: type(r)} END) AS relationships,
           allNodes AS nodes
      UNWIND relationships AS rel
      WITH rel, nodes
      WHERE rel IS NOT NULL
      RETURN rel.source AS source, rel.target AS target, rel.type AS type
      UNION
      UNWIND nodes AS node
      RETURN node.userId AS id, node.name AS name, node.status AS status, node.profilePicture AS profilePicture, node.gender AS gender, node.createdBy AS createdBy, NULL AS type
    `;

    const result = await runQuery(cypher, { familyTreeId });

    const nodes = result
      .filter(record => record.id)
      .map(record => ({
        id: record.id,
        name: record.name,
        status: record.status,
        profilePicture: record.profilePicture,
        gender: record.gender || '',
        createdBy: record.createdBy,
        myRelationship: record.myRelationship
      }));

    const links: any[] = result
      .filter(record => record.source && record.target)
      .map(record => ({
        source: record.source,
        target: record.target,
        type: record.type ? record.type.toLowerCase() : 'family'
      }));

    const uniqueLinks = Array.from(new Map(
      links.map(link => [`${link.source}-${link.target}-${link.type}`, link])
    ).values());

    console.log(`Fetched ${nodes.length} nodes and ${uniqueLinks.length} relationships`);

    return { nodes, links: uniqueLinks };
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
      MATCH (member:User {familyTreeId: $familyTreeId})
      OPTIONAL MATCH (viewer)-[rel:RELATES_TO]->(member)
      RETURN member.userId AS userId, member.name AS name, member.email AS email,
             member.status AS status, member.profilePicture AS profilePicture,
             rel.relationship AS relationship
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