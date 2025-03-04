import { defineConfig } from "drizzle-kit";
import * as dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export default defineConfig({
  schema: './shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql' as const,
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} as { schema: string; out: string; dialect: string; dbCredentials: { url: string } });
