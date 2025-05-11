
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
    // Clear console for debugging
    console.log(`Creating bidirectional relationship between ${sourceEmail} and ${targetEmail}`);
    console.log(`${sourceEmail} is ${sourceRelationship} to ${targetEmail}`);
    console.log(`${targetEmail} is ${targetRelationship} to ${sourceEmail}`);
    
    const cypher = `
      MATCH (source:User {email: $sourceEmail})
      MATCH (target:User {email: $targetEmail})
      // First clear any existing relationships in both directions to avoid duplicates
      OPTIONAL MATCH (source)-[r1]->(target)
      OPTIONAL MATCH (target)-[r2]->(source)
      DELETE r1, r2
      // Now create the new relationships
      WITH source, target
      CREATE (source)-[r1:${sourceRelationship.toUpperCase()}]->(target)
      CREATE (target)-[r2:${targetRelationship.toUpperCase()}]->(source)
      RETURN type(r1) as sourceRel, type(r2) as targetRel
    `;
    
    const result = await runQuery(cypher, { sourceEmail, targetEmail });
    console.log("Bidirectional relationship result:", result);
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
    
    // Clear any existing relationships first then create both directional relationships
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

// Get all relationships for a user in a family tree
export const getUserRelationships = async (email: string, familyTreeId: string): Promise<Relationship[]> => {
  try {
    console.log(`Getting relationships for user ${email} in family tree ${familyTreeId}`);
    const cypher = `
      MATCH (u:User {email: $email, familyTreeId: $familyTreeId})-[r]->(relative:User {familyTreeId: $familyTreeId})
      RETURN type(r) as type, u.email as from, relative.email as to, u.userId as fromUserId
    `;
    
    const result = await runQuery(cypher, { email, familyTreeId });
    console.log(`Found ${result.length} relationships for user ${email}`);
    
    return result.map((rel: any) => ({
      from: rel.from,
      to: rel.to,
      type: rel.type.toLowerCase(),
      fromUserId: rel.fromUserId
    }));
  } catch (error) {
    console.error(`Error getting relationships for user ${email}:`, error);
    return [];
  }
};
