// This file is used exclusively by the Prisma CLI.
// The application runtime never imports this file.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "src/database/prisma/schema.prisma",
  migrations: {
    path: "src/database/prisma/migrations",
  },
});
