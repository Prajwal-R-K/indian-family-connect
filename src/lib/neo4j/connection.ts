
// Neo4j connection setup
import neo4j from 'neo4j-driver';

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
export const runQuery = async (cypher: string, params = {}) => {
  const session = driver.session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map(record => {
      const obj: Record<string, any> = {};
      // Use forEach with proper type handling to avoid symbol indexing
      record.keys.forEach((key: string) => {
        obj[key] = record.get(key);
      });
      return obj;
    });
  } catch (error) {
    console.error("Neo4j Query Error:", error);
    throw error;
  } finally {
    await session.close();
  }
};
