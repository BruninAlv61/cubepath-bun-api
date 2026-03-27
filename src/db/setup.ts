import { sql } from "bun";

export async function initDb() {
  console.log("Initializing database tables...");
  try {
    // Create the users table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log("Users table is ready.");
  } catch (error) {
    console.error(`Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`);
    console.warn("⚠️ Please verify that your DATABASE_URL in the .env file is correct and accessible.");
    // Don't throw, let the server start even if db is down, 
    // it will fail gracefully on endpoint calls.
  }
}
