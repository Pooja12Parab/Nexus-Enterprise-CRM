import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Load .env file for Prisma CLI to pick up environment variables
config({ path: ".env" });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  schema: "./prisma/schema.prisma",
});