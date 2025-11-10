import { defineConfig, env } from "prisma/config";
import dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env file
const envPath = resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
