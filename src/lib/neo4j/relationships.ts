
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
