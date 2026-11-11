import { beforeEach, describe, expect, it, vi } from "vitest";
import { consumeAuthNotice, queueAuthNotice } from "@/lib/auth-notices";

beforeEach(() => { sessionStorage.clear(); });
describe("auth notifications across full-page navigation", () => {
  it("keeps only a fixed notice code and consumes it exactly once", () => {
    queueAuthNotice("registered");
    expect(sessionStorage.getItem("csavargo:auth-notice")).toBe("registered");
    expect(consumeAuthNotice()).toBe("Sikeres regisztráció! Üdv a Csavargón!");
    expect(consumeAuthNotice()).toBeNull();
  });
  it("rejects arbitrary stored messages", () => {
    sessionStorage.setItem("csavargo:auth-notice", "arbitrary-untrusted-message");
    expect(consumeAuthNotice()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
  it("does not break navigation when browser storage is disabled", () => {
    const blocked = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage blocked"); });
    try { expect(() => queueAuthNotice("signed-out")).not.toThrow(); }
    finally { blocked.mockRestore(); }
  });
});
