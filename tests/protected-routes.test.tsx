import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import ProtectedLayout from "@/app/(protected)/layout";
import Overview from "@/app/(protected)/attekintes/page";
import ProfilePage from "@/app/(protected)/profil/page";
import { currentTripDate } from "@/components/trips/trip-calendar";

const { requireServerMe, loadServerApi } = vi.hoisted(() => ({ requireServerMe: vi.fn(), loadServerApi: vi.fn() }));
vi.mock("@/lib/server-session", () => ({ requireServerMe, loadServerApi }));
vi.mock("@/components/auth/dashboard", () => ({ Dashboard: () => <h1>Védett áttekintés</h1> }));
vi.mock("@/components/layout/app-shell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }));

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
  it.each([Overview, ProfilePage])("keeps %s guarded when a layout is reused during navigation", async (renderPage) => {
    const redirect = new Error("NEXT_REDIRECT");
    requireServerMe.mockRejectedValue(redirect);
    await expect(renderPage()).rejects.toBe(redirect);
    expect(requireServerMe).toHaveBeenCalledOnce();
  });
  it("shows the signed-in user's account details and counts by status", async () => {
    requireServerMe.mockResolvedValue({ user: { id: "test-user", name: "Teszt Utazó", email: "utazo@example.com", emailVerified: true } });
    const today = currentTripDate();
    const companion = { id: "companion", name: "Teszt Útitárs" };
    loadServerApi.mockImplementation(async (path: string) => {
      if (path === "/api/trips") return [
        { start: "2000-01-01", end: "2000-01-02" },
        { start: today, end: today },
        { start: "2099-01-01", end: "2099-01-02" },
      ];
      if (path === "/api/companions") return { accepted: [companion], incoming: [companion], outgoing: [] };
      throw new Error("Unexpected profile endpoint");
    });
    render(await ProfilePage());
    expect(screen.getByRole("heading", { name: "Profilom" })).toBeVisible();
    expect(screen.getByText("Teszt Utazó")).toBeVisible();
    expect(screen.getByText("utazo@example.com")).toBeVisible();
    expect(screen.getByText("Megerősítve")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Megerősítő levél újraküldése" })).not.toBeInTheDocument();
    const trips = screen.getByRole("link", { name: /Utazásaim/ });
    const companions = screen.getByRole("link", { name: /Útitársaim/ });
    expect(trips).toHaveAttribute("href", "/utazasok");
    expect(companions).toHaveAttribute("href", "/utitarsak");
    expect(within(trips).getByText("3")).toBeVisible();
    expect(within(companions).getByText("1")).toBeVisible();
    const tripStatuses = screen.getByRole("list", { name: "Utazások állapot szerint" });
    expect(within(tripStatuses).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Tervezés alatt 1", "Közelgő 1", "Korábbi 1",
    ]);
    expect(screen.getByText("1 beérkezett jelölés")).toBeVisible();
  });
  it("distinguishes an unavailable count from zero and shows pending email verification", async () => {
    requireServerMe.mockResolvedValue({ user: { id: "test-user", name: "Teszt Utazó", email: "utazo@example.com", emailVerified: false } });
    loadServerApi.mockImplementation(async (path: string) => path === "/api/trips" ? null : { accepted: [], incoming: [], outgoing: [] });
    render(await ProfilePage());
    expect(screen.getByText("Az utazások száma nem érhető el.")).toBeVisible();
    expect(within(screen.getByRole("link", { name: /Útitársaim/ })).getByText("0")).toBeVisible();
    expect(screen.getByText("Megerősítésre vár")).toBeVisible();
    expect(screen.getByRole("button", { name: "Megerősítő levél újraküldése" })).toBeVisible();
  });
});
