import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: "dced908158acead3b99f5799938ef59e",
    databaseId: "9ce2da43-2ab8-470a-9ec2-47ac0a5295b7",
    token: "9LqzWNa2MkyEJ3aJpKjwa9ia47YceGo9xl-3PON2",
  },
});
