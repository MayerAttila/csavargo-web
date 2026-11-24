import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProtectedLayout from "@/app/(protected)/layout";
import Overview from "@/app/(protected)/attekintes/page";
import ProfilePage from "@/app/(protected)/profil/page";
import { currentTripDate } from "@/components/trips/trip-calendar";

const { requireServerMe, loadServerApi, changePassword, notifySuccess, notifyError } = vi.hoisted(() => ({
  requireServerMe: vi.fn(), loadServerApi: vi.fn(), changePassword: vi.fn(), notifySuccess: vi.fn(), notifyError: vi.fn(),
}));
vi.mock("@/lib/server-session", () => ({ requireServerMe, loadServerApi }));
vi.mock("@/lib/auth-client", () => ({ authClient: { changePassword } }));
vi.mock("@/lib/notifications", () => ({ notify: { success: notifySuccess, error: notifyError } }));
vi.mock("@/components/auth/dashboard", () => ({ Dashboard: () => <h1>Védett áttekintés</h1> }));
vi.mock("@/components/layout/app-shell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }));

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function(this: HTMLDialogElement) { this.open = false; } });
});
beforeEach(() => { vi.resetAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function renderProfile() {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  render(<QueryClientProvider client={client}>{await ProfilePage()}</QueryClientProvider>);
}

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
    await renderProfile();
    expect(screen.getByRole("heading", { name: "Profilom" })).toBeVisible();
    expect(screen.getByText("Teszt Utazó")).toBeVisible();
    expect(screen.getByRole("button", { name: "Profil szerkesztése" })).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(screen.getByRole("banner")).getByText("utazo@example.com")).toBeVisible();
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
    await renderProfile();
    expect(screen.getByText("Az utazások száma nem érhető el.")).toBeVisible();
    expect(within(screen.getByRole("link", { name: /Útitársaim/ })).getByText("0")).toBeVisible();
    expect(screen.getByText("Megerősítésre vár")).toBeVisible();
    expect(screen.getByRole("button", { name: "Megerősítő levél újraküldése" })).toBeVisible();
  });
  it("edits the name and photo on save and removes the photo on a second save", async () => {
    const account = { id: "test-user", name: "Teszt Utazó", email: "utazo@example.com", emailVerified: true };
    requireServerMe.mockResolvedValue({ user: account });
    loadServerApi.mockResolvedValue(null);
    const jpeg = "data:image/jpeg;base64,cGhvdG8=";
    const webp = "/api/me/avatar/5bca3340-1bc8-412c-aa42-6244dc9959c3";
    const bitmap = { width: 400, height: 300, close: vi.fn() };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillRect: vi.fn(), drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(jpeg);
    const newName = "Új Utazó";
    const fetchAccount = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { ...account, name: newName, image: webp } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { ...account, name: newName } }) });
    vi.stubGlobal("fetch", fetchAccount);

    await renderProfile();
    const edit = screen.getByRole("button", { name: "Profil szerkesztése" });
    await userEvent.click(edit);
    const dialog = within(screen.getByRole("dialog", { name: "Profil szerkesztése" }));
    const nameField = dialog.getByLabelText("Megjelenített név");
    await userEvent.clear(nameField);
    await userEvent.type(nameField, newName);
    await userEvent.upload(dialog.getByLabelText("Profilkép feltöltése"), new File(["photo"], "photo.jpg", { type: "image/jpeg" }));
    expect(fetchAccount).not.toHaveBeenCalled();
    await userEvent.click(dialog.getByRole("button", { name: "Mentés" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchAccount).toHaveBeenCalledWith("/api/me/profile", expect.objectContaining({
      method: "PATCH", body: JSON.stringify({ name: newName, image: jpeg }),
    }));
    expect(notifySuccess).toHaveBeenCalledWith("Profil módosítva.", { id: "profile-edit" });
    expect(within(screen.getByRole("banner")).getByText(newName)).toBeVisible();
    expect(bitmap.close).toHaveBeenCalledOnce();
    await userEvent.click(edit);
    await userEvent.click(dialog.getByRole("button", { name: "Kép eltávolítása" }));
    await userEvent.click(dialog.getByRole("button", { name: "Mentés" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchAccount).toHaveBeenLastCalledWith("/api/me/profile", expect.objectContaining({
      method: "PATCH", body: JSON.stringify({ image: null }),
    }));
    expect(fetchAccount).toHaveBeenCalledTimes(2);
  });
  it("checks password confirmation, reports an incorrect current password and closes on success", async () => {
    requireServerMe.mockResolvedValue({ user: { id: "test-user", name: "Teszt Utazó", email: "utazo@example.com", emailVerified: true } });
    loadServerApi.mockResolvedValue(null);
    changePassword.mockResolvedValueOnce({ error: { code: "INVALID_PASSWORD", status: 400 } }).mockResolvedValueOnce({ error: null });

    await renderProfile();
    const open = screen.getByRole("button", { name: "Jelszó megváltoztatása" });
    expect(screen.queryByLabelText("Jelenlegi jelszó", { exact: true })).not.toBeInTheDocument();
    await userEvent.click(open);
    const current = screen.getByLabelText("Jelenlegi jelszó", { exact: true });
    const confirmation = screen.getByLabelText("Új jelszó megerősítése", { exact: true });
    expect(current).toHaveFocus();
    await userEvent.type(current, "current-password");
    await userEvent.type(screen.getByLabelText("Új jelszó", { exact: true }), "new-password");
    await userEvent.type(confirmation, "different-password");
    const save = screen.getByRole("button", { name: "Jelszó mentése" });
    await userEvent.click(save);
    expect(changePassword).not.toHaveBeenCalled();
    expect(confirmation).toHaveAttribute("aria-invalid", "true");
    await userEvent.clear(confirmation);
    await userEvent.type(confirmation, "new-password");
    await userEvent.click(save);
    expect(changePassword).toHaveBeenCalledWith({ currentPassword: "current-password", newPassword: "new-password" });
    expect(notifyError).toHaveBeenCalledWith("A jelenlegi jelszó hibás.", { id: "profile-password" });
    expect(current).toHaveAttribute("aria-invalid", "true");
    await userEvent.click(save);
    await waitFor(() => expect(open).toHaveFocus());
    expect(notifySuccess).toHaveBeenCalledWith("A jelszavadat megváltoztattuk.", { id: "profile-password" });
    expect(current).not.toBeInTheDocument();
  });
});
