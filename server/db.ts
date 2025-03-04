import { config } from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Load environment variables from .env file
config();

neonConfig.webSocketConstructor = ws;

const getDatabaseUrl = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }

  if (process.env.NODE_ENV === 'development' && process.env.DEV_DATABASE_URL) {
    return process.env.DEV_DATABASE_URL;
  }

  return process.env.DATABASE_URL;
};

export const pool = new Pool({ connectionString: getDatabaseUrl() });
export const db = drizzle({ client: pool, schema });
