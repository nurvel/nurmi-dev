import { defaultExclude, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  base: "/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    exclude: [...defaultExclude, "**/.worktrees/**"],
    setupFiles: ["./src/setupTests.ts"],
    globals: true,
  },
});
