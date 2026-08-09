import { defineConfig } from "vitest/config";

// Flow tests initialize real documentation repositories and spawn git per case, so
// wall-clock cost scales with worker contention rather than with engine work. One
// declared budget keeps parallel runs deterministic without weakening assertions.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000
  }
});
