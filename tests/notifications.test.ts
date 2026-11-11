import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryClient } from "@/lib/query-client";

const notices = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ notify: notices }));
let client: ReturnType<typeof createQueryClient>;
beforeEach(() => {
  vi.clearAllMocks();
  client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } });
});
afterEach(() => client.clear());

describe("application-wide query/mutation notifications", () => {
  it("shows a safe generic query failure instead of internal error details", async () => {
    await expect(client.fetchQuery({ queryKey: ["trips"], queryFn: async () => { throw new Error("private database details"); } })).rejects.toThrow();
    expect(notices.error).toHaveBeenCalledWith("Az adatok betöltése nem sikerült. Próbáld újra később.", { id: 'query:["trips"]' });
  });
  it("supports a custom Hungarian query failure message", async () => {
    await expect(client.fetchQuery({ queryKey: ["trips"], meta: { errorMessage: "Az utazások nem tölthetők be." }, queryFn: async () => { throw new Error("offline"); } })).rejects.toThrow();
    expect(notices.error).toHaveBeenCalledWith("Az utazások nem tölthetők be.", expect.any(Object));
  });
  it.each([{ silent: true }, { unauthorized: true }])("avoids unwanted notifications: %j", async ({ silent, unauthorized }) => {
    await expect(client.fetchQuery({ queryKey: ["me"], meta: { silent }, queryFn: async () => { throw new Error(unauthorized ? "UNAUTHORIZED" : "offline"); } })).rejects.toThrow();
    expect(notices.error).not.toHaveBeenCalled();
  });
  it("automatically notifies about failed mutations", async () => {
    const mutation = client.getMutationCache().build(client, { mutationFn: async () => { throw new Error("private server details"); } });
    await expect(mutation.execute(undefined)).rejects.toThrow();
    expect(notices.error).toHaveBeenCalledWith("A művelet nem sikerült. Próbáld újra később.");
  });
  it("shows an explicit mutation success message and supports opting out", async () => {
    const mutation = client.getMutationCache().build(client, { mutationFn: async () => "saved", meta: { successMessage: "Utazás elmentve." } });
    await mutation.execute(undefined);
    expect(notices.success).toHaveBeenCalledWith("Utazás elmentve.");
    notices.success.mockClear();
    const silent = client.getMutationCache().build(client, { mutationFn: async () => "saved", meta: { silent: true, successMessage: "Utazás elmentve." } });
    await silent.execute(undefined);
    expect(notices.success).not.toHaveBeenCalled();
  });
});
