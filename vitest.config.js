import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.js'],
    coverage: { include: ['src/core/**'], thresholds: { lines: 90, branches: 85 } },
  },
});
