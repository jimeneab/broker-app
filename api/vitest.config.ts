import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Fake values so tests never need real credentials.
    env: {
      SUPABASE_URL: "https://test-project.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      FINNHUB_API_KEY: "test-finnhub-key",
      TWELVEDATA_API_KEY: "test-twelvedata-key",
      SUPABASE_JWT_SECRET: "test-jwt-secret-with-at-least-32-characters",
    },
  },
});
