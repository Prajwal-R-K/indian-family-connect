
import { Relationship } from '@/types';
import { runQuery } from './connection';

export const createRelationship = async (relationshipData: Relationship): Promise<Relationship> => {
  const { from, to, type, fromUserId } = relationshipData;
  
  // Check if relationship already exists to prevent duplicate relationships
  const checkCypher = `
    MATCH (fromUser:User {email: $from})-[r:RELATES_TO {relationship: $type}]->(toUser:User {email: $to})
    RETURN count(r) as count
  `;
  
  const checkResult = await runQuery(checkCypher, { from, to, type });
  if (checkResult[0].count > 0) {
    console.log(`Relationship from ${from} to ${to} of type ${type} already exists. Skipping.`);
    return {
      from,
      to,
      type: type.toLowerCase(),
      fromUserId
    };
  }
  
  // Create RELATES_TO relationship with the relationship type as a property
  const cypher = `
    MATCH (fromUser:User {email: $from})
    MATCH (toUser:User {email: $to})
    CREATE (fromUser)-[r:RELATES_TO {relationship: $type, fromUserId: $fromUserId}]->(toUser)
    RETURN r.relationship as type, r.fromUserId as fromUserId, fromUser.email as from, toUser.email as to
  `;
  
  const result = await runQuery(cypher, { from, to, type, fromUserId });
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

export const updateBidirectionalRelationship = async (
  sourceEmail: string, 
  targetEmail: string, 
  sourceRelationship: string,
  targetRelationship: string
): Promise<boolean> => {
  try {
    // Clear console for debugging
    console.log(`Creating bidirectional relationship between ${sourceEmail} and ${targetEmail}`);
    console.log(`${sourceEmail} is ${sourceRelationship} to ${targetEmail}`);
    console.log(`${targetEmail} is ${targetRelationship} to ${sourceEmail}`);
    
    const cypher = `
      MATCH (source:User {email: $sourceEmail})
      MATCH (target:User {email: $targetEmail})
      // First clear any existing relationships in both directions to avoid duplicates
      OPTIONAL MATCH (source)-[r1:RELATES_TO]->(target)
      OPTIONAL MATCH (target)-[r2:RELATES_TO]->(source)
      DELETE r1, r2
      // Now create the new relationships
      WITH source, target
      CREATE (source)-[r1:RELATES_TO {relationship: $sourceRelationship}]->(target)
      CREATE (target)-[r2:RELATES_TO {relationship: $targetRelationship}]->(source)
      RETURN r1.relationship as sourceRel, r2.relationship as targetRel
    `;
    
    const result = await runQuery(cypher, { 
      sourceEmail, 
      targetEmail,
      sourceRelationship,
      targetRelationship
    });
    console.log("Bidirectional relationship result:", result);
    return result && result.length > 0;
  } catch (error) {
    console.error("Error creating bidirectional relationship:", error);
    return false;
  }
};

// New function to connect users from different family trees
export const connectFamilyTrees = async (
  sourceUser: { userId: string, email: string, familyTreeId: string },
  targetUser: { userId: string, email: string, familyTreeId: string },
  sourceToTargetRelationship: string,
  targetToSourceRelationship: string
): Promise<boolean> => {
  try {
    if (sourceUser.familyTreeId === targetUser.familyTreeId) {
      console.log("Users are already in the same family tree, using bidirectional relationship update instead");
      return updateBidirectionalRelationship(
        sourceUser.email,
        targetUser.email,
        sourceToTargetRelationship,
        targetToSourceRelationship
      );
    }
    
    console.log(`Connecting family trees: ${sourceUser.familyTreeId} and ${targetUser.familyTreeId}`);
    console.log(`${sourceUser.email} (${sourceUser.familyTreeId}) is ${sourceToTargetRelationship} to ${targetUser.email} (${targetUser.familyTreeId})`);
    
    const cypher = `
      MATCH (source:User {userId: $sourceUserId})
      MATCH (target:User {userId: $targetUserId})
      // Create cross-tree relationships
      CREATE (source)-[r1:CONNECTS_TO {
        relationship: $sourceToTargetRelationship,
        sourceFamilyTreeId: $sourceFamilyTreeId,
        targetFamilyTreeId: $targetFamilyTreeId
      }]->(target)
      CREATE (target)-[r2:CONNECTS_TO {
        relationship: $targetToSourceRelationship,
        sourceFamilyTreeId: $targetFamilyTreeId,
        targetFamilyTreeId: $sourceFamilyTreeId
      }]->(source)
      RETURN r1.relationship as sourceRel, r2.relationship as targetRel
    `;
    
    const result = await runQuery(cypher, { 
      sourceUserId: sourceUser.userId,
      targetUserId: targetUser.userId,
      sourceFamilyTreeId: sourceUser.familyTreeId,
      targetFamilyTreeId: targetUser.familyTreeId,
      sourceToTargetRelationship,
      targetToSourceRelationship
    });
    
    console.log("Connected family trees result:", result);
    return result && result.length > 0;
  } catch (error) {
    console.error("Error connecting family trees:", error);
    return false;
  }
};

// Get connected family trees 
export const getConnectedFamilyTrees = async (familyTreeId: string): Promise<any[]> => {
  try {
    console.log(`Getting connected family trees for: ${familyTreeId}`);
    
    const cypher = `
      MATCH (user:User {familyTreeId: $familyTreeId})-[r:CONNECTS_TO]->(member:User)
      WHERE member.familyTreeId <> $familyTreeId
      RETURN 
        user.userId as source,
        user.name as sourceName,
        member.userId as target, 
        member.name as targetName,
        member.familyTreeId as targetFamilyTreeId,
        r.relationship as type
    `;
    
    const result = await runQuery(cypher, { familyTreeId });
    console.log(`Found ${result.length} connected family tree relationships`);
    return result;
  } catch (error) {
    console.error("Error fetching connected family trees:", error);
    return [];
  }
};

export const getRelationshipTypes = (): string[] => {
  return [
    "father",
    "mother",
    "son",
    "daughter",
    "brother",
    "sister",
    "husband",
    "wife",
    "grandfather",
    "grandmother",
    "grandson",
    "granddaughter",
    "uncle",
    "aunt",
    "nephew",
    "niece",
    "cousin",
    "friend",
    "other"
  ];
};

export const getOppositeRelationship = (relationship: string): string => {
  const opposites: Record<string, string> = {
    "father": "son",
    "mother": "son",
    "son": "father",  // This is an approximation, could be mother too
    "daughter": "father",  // This is an approximation, could be mother too
    "brother": "brother",
    "sister": "brother",  // This is an approximation, could be sister too
    "husband": "wife",
    "wife": "husband",
    "grandfather": "grandson",
    "grandmother": "grandson",
    "grandson": "grandfather",  // This is an approximation, could be grandmother too
    "granddaughter": "grandfather",  // This is an approximation, could be grandmother too
    "uncle": "nephew",
    "aunt": "nephew",
    "nephew": "uncle",  // This is an approximation, could be aunt too
    "niece": "uncle",  // This is an approximation, could be aunt too
    "cousin": "cousin",
    "friend": "friend",
    "other": "other"
  };
  
  return opposites[relationship.toLowerCase()] || "family";
};

// Function to create reciprocal relationships when a user confirms their relationship
export const createReciprocateRelationships = async (
  user: { email: string, userId: string },
  inviterEmail: string,
  userRelationship: string
): Promise<boolean> => {
  try {
    // Get the appropriate relationship type from inviter to user
    const inviterRelationship = getOppositeRelationship(userRelationship);
    
    // Clear any existing relationships first then create both directional relationships
    await updateBidirectionalRelationship(
      user.email,
      inviterEmail,
      userRelationship.toLowerCase(),
      inviterRelationship.toLowerCase()
    );
    
    console.log(`Reciprocal relationship created: ${user.email} is ${userRelationship} of ${inviterEmail}, and ${inviterEmail} is ${inviterRelationship} of ${user.email}`);
    return true;
  } catch (error) {
    console.error("Error creating reciprocal relationship:", error);
    return false;
  }
};

// Function to get user's personalized view of the family tree
export const getUserPersonalizedFamilyTree = async (userId: string, familyTreeId: string): Promise<any[]> => {
  console.log(`Getting personalized family tree for user ${userId} in tree ${familyTreeId}`);
  
  const cypher = `
      MATCH (user:User {userId: $userId, familyTreeId: $familyTreeId})
      MATCH (user)-[r:RELATES_TO]->(member:User {familyTreeId: $familyTreeId})
      RETURN 
        user.userId as source,
        user.name as sourceName,
        member.userId as target, 
        member.name as targetName,
        r.relationship as type
  `;
  
  const result = await runQuery(cypher, { userId, familyTreeId });
  console.log(`Found ${result.length} personal relationships for user ${userId}`);
  return result;
};

// Function to get family tree relationships
export const getUserRelationships = async (email: string, familyTreeId: string): Promise<Relationship[]> => {
  console.log(`Getting relationships for user ${email} in family tree ${familyTreeId}`);
  
  const cypher = `
      MATCH (u:User {email: $email, familyTreeId: $familyTreeId})
      MATCH (u)-[r:RELATES_TO]->(target:User {familyTreeId: $familyTreeId})
      RETURN u.email as from, target.email as to, r.relationship as type, r.fromUserId as fromUserId
  `;
  
  const result = await runQuery(cypher, { email, familyTreeId });
  console.log(`Found ${result.length} relationships for user ${email}`);
  return result.map(row => ({
    from: row.from,
    to: row.to,
    type: row.type,
    fromUserId: row.fromUserId
  }));
};
