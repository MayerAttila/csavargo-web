import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterContext } from "next/dist/shared/lib/router-context.shared-runtime";
import type { NextRouter } from "next/router";
import { AppShell } from "@/components/layout/app-shell";
import { Sidebar } from "@/components/layout/sidebar";

const mocks = vi.hoisted(() => ({ logout: vi.fn(), session: vi.fn(), navigate: vi.fn(), error: vi.fn(), setTheme: vi.fn(), theme: "light", pathname: "/attekintes" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: mocks.theme, setTheme: mocks.setTheme }) }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut: mocks.logout, getSession: mocks.session } }));
vi.mock("@/lib/auth-navigation", () => ({ navigateAfterAuth: mocks.navigate }));
vi.mock("@/lib/notifications", () => ({ notify: { error: mocks.error } }));

const me = { user: { id: "test-user", name: "Teszt Utazó", email: "utazo@example.com", emailVerified: false } };
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function(this: HTMLDialogElement) { this.open = false; this.dispatchEvent(new Event("close")); } });
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.theme = "light";
  mocks.pathname = "/attekintes";
  mocks.logout.mockResolvedValue({ error: null });
  mocks.session.mockResolvedValue({ data: { user: me.user, session: { id: "session" } } });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => me }));
});
function renderShell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["private-trip"], { name: "Privát utazás" });
  render(<QueryClientProvider client={client}><AppShell initialMe={me}><p>Privát oldal</p></AppShell></QueryClientProvider>);
  return client;
}

describe("protected sidebar", () => {
  it("keeps server-rendered theme controls deterministic before hydration", () => {
    mocks.theme = "dark";
    const html = renderToStaticMarkup(<Sidebar user={me.user} pending={false} onLogout={() => {}} />);
    const markup = new DOMParser().parseFromString(html, "text/html");
    expect(markup.querySelector('button[aria-label="Sötét mód"]')).not.toBeNull();
    expect(markup.querySelector('button[aria-label="Világos mód"]')).toBeNull();
  });
  it("marks the active route, shows user details, and disables planned destinations", () => {
    renderShell();
    expect(screen.getByRole("link", { name: "Áttekintés" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Térkép" })).toHaveAttribute("href", "/terkep");
    expect(screen.getByRole("link", { name: "Utazások" })).toHaveAttribute("href", "/utazasok");
    expect(screen.getByRole("button", { name: "Költségek – hamarosan" })).toBeDisabled();
    const sidebar = within(screen.getByRole("complementary", { name: "Oldalsáv" }));
    const profile = sidebar.getByRole("link", { name: "Profilom" });
    expect(profile).toHaveAttribute("href", "/profil");
    expect(profile).toHaveTextContent("Teszt Utazó");
    expect(profile).toHaveTextContent("utazo@example.com");
    expect(screen.getByRole("main")).toHaveTextContent("Privát oldal");
  });
  it("marks the trip planner as the current page", () => {
    mocks.pathname = "/utazasok";
    renderShell();
    expect(screen.getByRole("link", { name: "Utazások" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Áttekintés" })).not.toHaveAttribute("aria-current");
  });
  it("keeps the desktop header free of buttons", () => {
    renderShell();
    const header = screen.getByRole("complementary", { name: "Oldalsáv" }).querySelector("header")!;
    expect(within(header).queryByRole("button")).not.toBeInTheDocument();
  });
  it("V17: collapses the desktop rail on selection and restores hover on pointer exit", () => {
    const push = vi.fn();
    const router = { push, prefetch: vi.fn().mockResolvedValue(undefined) } as unknown as NextRouter;
    render(<RouterContext.Provider value={router}><Sidebar user={me.user} pending={false} onLogout={() => {}} /></RouterContext.Provider>);
    const sidebar = screen.getByRole("complementary", { name: "Oldalsáv" });
    const link = within(sidebar).getByRole("link", { name: "Utazások" });
    expect(sidebar).toHaveClass("hover:w-56");
    fireEvent.click(link);
    expect(push).toHaveBeenCalled();
    expect(sidebar).not.toHaveClass("hover:w-56");
    fireEvent.pointerLeave(sidebar);
    expect(sidebar).toHaveClass("hover:w-56");
  });
  it("opens the mobile dialog and closes it on navigation, restoring scrolling", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("button", { name: "Menü megnyitása" }));
    const dialog = screen.getByRole("dialog", { name: "Navigáció" });
    expect(document.body).toHaveClass("overflow-hidden");
    const link = within(dialog).getByRole("link", { name: "Profilom" });
    link.addEventListener("click", (event) => event.preventDefault());
    await userEvent.click(link);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body).not.toHaveClass("overflow-hidden");
  });
  it("switches the application theme", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("button", { name: "Sötét mód" }));
    expect(mocks.setTheme).toHaveBeenCalledWith("dark");
  });
  it("logs out and clears private data before leaving the protected shell", async () => {
    const client = renderShell();
    await userEvent.click(screen.getByRole("button", { name: "Kijelentkezés" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/belepes", "signed-out"));
    expect(client.getQueryData(["private-trip"])).toBeUndefined();
  });
  it("keeps private state and reports a toast if logout fails", async () => {
    mocks.logout.mockResolvedValue({ error: { status: 500 } });
    const client = renderShell();
    await userEvent.click(screen.getByRole("button", { name: "Kijelentkezés" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(client.getQueryData(["private-trip"])).toEqual({ name: "Privát utazás" });
  });
});
