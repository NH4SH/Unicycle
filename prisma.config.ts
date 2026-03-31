import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

const prismaEnvPath = resolve(process.cwd(), "prisma/.env");
const rootEnvPath = resolve(process.cwd(), ".env");

if (typeof process.loadEnvFile === "function") {
  if (existsSync(prismaEnvPath)) {
    process.loadEnvFile(prismaEnvPath);
  }

  if (existsSync(rootEnvPath)) {
    process.loadEnvFile(rootEnvPath);
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
