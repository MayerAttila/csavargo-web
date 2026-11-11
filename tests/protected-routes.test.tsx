import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProtectedLayout from "@/app/(protected)/layout";
import Overview from "@/app/(protected)/attekintes/page";

const { requireServerMe } = vi.hoisted(() => ({ requireServerMe: vi.fn() }));
vi.mock("@/lib/server-session", () => ({ requireServerMe }));
vi.mock("@/components/auth/dashboard", () => ({ Dashboard: () => <h1>Védett áttekintés</h1> }));

beforeEach(() => { vi.resetAllMocks(); });
describe("V12: protected route group", () => {
  it("renders group children only after checking the server session", async () => {
    requireServerMe.mockResolvedValue({ user: { id: "test-user" } });
    render(await ProtectedLayout({ children: <p>Privát tartalom</p> }));
    expect(requireServerMe).toHaveBeenCalledOnce();
    expect(screen.getByText("Privát tartalom")).toBeVisible();
  });
  it("propagates the anonymous redirect before rendering protected children", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    requireServerMe.mockRejectedValue(redirect);
    await expect(ProtectedLayout({ children: <p>Privát tartalom</p> })).rejects.toBe(redirect);
    expect(screen.queryByText("Privát tartalom")).not.toBeInTheDocument();
  });
  it("keeps the private-data page guarded when a layout is reused during navigation", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    requireServerMe.mockRejectedValue(redirect);
    await expect(Overview()).rejects.toBe(redirect);
    expect(requireServerMe).toHaveBeenCalledOnce();
  });
});
