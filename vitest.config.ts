import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  "server-only": fileURLToPath(
    new URL("./tests/server-only.ts", import.meta.url),
  ),
};
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", include: ["src/**/*.test.ts"] },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          fileParallelism: false,
          testTimeout: 15000,
        },
      },
    ],
  },
});
