
import { Relationship } from '@/types';
import { runQuery } from './connection';

export const createRelationship = async (relationshipData: Relationship): Promise<Relationship> => {
  const { from, to, type, fromUserId } = relationshipData;
  
  // Check if relationship already exists to prevent duplicate relationships
  const checkCypher = `
    MATCH (fromUser:User {email: $from})-[r:${type.toUpperCase()}]->(toUser:User {email: $to})
    RETURN count(r) as count
  `;
  
  const checkResult = await runQuery(checkCypher, { from, to });
  if (checkResult[0].count > 0) {
    console.log(`Relationship from ${from} to ${to} of type ${type} already exists. Skipping.`);
    return {
      from,
      to,
      type: type.toLowerCase(),
      fromUserId
    };
  }
  
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

export const updateBidirectionalRelationship = async (
  sourceEmail: string, 
  targetEmail: string, 
  sourceRelationship: string,
  targetRelationship: string
): Promise<boolean> => {
  try {
    const cypher = `
      MATCH (source:User {email: $sourceEmail})
      MATCH (target:User {email: $targetEmail})
      MERGE (source)-[r1:${sourceRelationship.toUpperCase()}]->(target)
      MERGE (target)-[r2:${targetRelationship.toUpperCase()}]->(source)
      RETURN type(r1) as sourceRel, type(r2) as targetRel
    `;
    
    const result = await runQuery(cypher, { sourceEmail, targetEmail });
    return result && result.length > 0;
  } catch (error) {
    console.error("Error creating bidirectional relationship:", error);
    return false;
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
    
    // Create both directional relationships
    await updateBidirectionalRelationship(
      user.email,
      inviterEmail,
      userRelationship,
      inviterRelationship
    );
    
    console.log(`Created reciprocal relationships between ${user.email} and ${inviterEmail}`);
    console.log(`- ${user.email} is ${userRelationship} to ${inviterEmail}`);
    console.log(`- ${inviterEmail} is ${inviterRelationship} to ${user.email}`);
    
    return true;
  } catch (error) {
    console.error("Error creating reciprocal relationships:", error);
    return false;
  }
};
