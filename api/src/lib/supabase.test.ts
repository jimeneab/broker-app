import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ createClient }));

const { adminClient, userClient } = await import("./supabase.js");

describe("supabase clients", () => {
  beforeEach(() => createClient.mockClear());

  it("adminClient uses the service role key without session persistence", () => {
    adminClient();
    expect(createClient).toHaveBeenCalledWith("https://test-project.supabase.co", "test-service-role-key", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it("userClient uses the anon key and forwards the user's JWT", () => {
    userClient("jwt");
    expect(createClient).toHaveBeenCalledWith("https://test-project.supabase.co", "test-anon-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: "Bearer jwt" } },
    });
  });
});
