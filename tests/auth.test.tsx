import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthForm } from "@/components/auth/auth-form";
import { Dashboard } from "@/components/auth/dashboard";
import { registrationSchema, authError } from "@/lib/auth-validation";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), navigate: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn(), resend: vi.fn(), session: vi.fn(), toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: { error: mocks.toastError, success: mocks.toastSuccess } }));
vi.mock("@/lib/auth-navigation", () => ({ navigateAfterAuth: mocks.navigate }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signIn: { email: mocks.login }, signUp: { email: mocks.register }, signOut: mocks.logout, sendVerificationEmail: mocks.resend, getSession: mocks.session } }));
const me = { user: { id: "user-1", name: "Utazó", email: "utazo@example.com", emailVerified: false } };
beforeEach(() => { vi.clearAllMocks(); mocks.session.mockResolvedValue({ data: { session: { id: "test-session" }, user: me.user }, error: null }); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => me })); });
describe("Hungarian auth UI", () => {
  it.each(["register", "login", "forgot", "reset"] as const)("V10: %s cannot send credentials in a GET before hydration", (mode) => {
    const html = renderToStaticMarkup(<AuthForm mode={mode} token="test-reset-token" />);
    const document = new DOMParser().parseFromString(html, "text/html");
    const form = document.querySelector("form")!;
    expect(form.getAttribute("method")).toBe("post");
    expect(form.querySelector("fieldset")?.disabled).toBe(true);
    expect(form.querySelector('button[type="submit"]')?.disabled).toBe(true);
  });
  it("V1/V10: hydrated registration calls the auth client and opens the dashboard", async () => {
    mocks.register.mockResolvedValue({ data: { user: me.user }, error: null });
    render(<AuthForm mode="register" />);
    await userEvent.type(screen.getByLabelText("Név", { exact: true }), "Utazó");
    await userEvent.type(screen.getByLabelText("E-mail-cím", { exact: true }), "utazo@example.com");
    await userEvent.type(screen.getByLabelText("Jelszó", { exact: true }), "test-password-123");
    await userEvent.type(screen.getByLabelText("Jelszó megerősítése", { exact: true }), "test-password-123");
    await userEvent.click(screen.getByRole("button", { name: "Regisztráció", exact: true }));
    expect(mocks.register).toHaveBeenCalledWith({ name: "Utazó", email: "utazo@example.com", password: "test-password-123", callbackURL: "/attekintes" });
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/attekintes", "registered"));
    expect(mocks.session).toHaveBeenCalledWith({ fetchOptions: { cache: "no-store" } });
  });
  it("validates names and passwords and maps errors without exposing server text", () => {
    expect(registrationSchema.safeParse({ name: " ", email: "invalid", password: "short" }).success).toBe(false);
    expect(registrationSchema.safeParse({ name: "Utazó", email: "utazo@example.com", password: "a".repeat(7) }).success).toBe(false);
    expect(registrationSchema.safeParse({ name: "Utazó", email: "utazo@example.com", password: "a".repeat(8) }).success).toBe(true);
    expect(authError({ code: "PASSWORD_TOO_SHORT" })).toBe("A jelszó legalább 8 karakter legyen.");
    expect(authError({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe("Hibás e-mail-cím vagy jelszó.");
    expect(authError({ status: 429 })).toContain("egy perc");
    expect(authError({ code: "SQL_ERROR" })).toBe("A művelet nem sikerült. Próbáld újra később.");
  });
  it.each([
    ["INVALID_EMAIL", "Az e-mail-cím formátuma hibás."],
    ["INVALID_NAME", "1–100 karakteres nevet"],
    ["USER_ALREADY_EXISTS", "már létezik fiók"],
    ["PASSWORD_TOO_SHORT", "legalább 8 karakter"],
    ["INVALID_ORIGIN", "Ez a webcím nincs engedélyezve"],
    ["FAILED_TO_CREATE_SESSION", "bejelentkezési munkamenetet"],
  ])("maps %s to a specific Hungarian error", (code, text) => {
    expect(authError({ code }, "register")).toContain(text);
  });
  it("distinguishes unavailable registration servers and bad inputs without showing internal messages", () => {
    const unavailable = { status: 500, code: "UNKNOWN", message: "private SQL connection details" };
    expect(authError(unavailable, "register")).toBe("A regisztrációs szolgáltatás átmenetileg nem érhető el. Próbáld újra később.");
    expect(authError({ status: 400 }, "register")).toContain("Ellenőrizd a nevet, az e-mail-címet");
    expect(authError({ status: 0 }, "register")).toContain("Nem sikerült elérni a szervert.");
    expect(authError({ code: "UNKNOWN" }, "reset")).toContain("Kérj új visszaállító hivatkozást.");
  });
  it("shows a specific registration error only in its toast", async () => {
    mocks.register.mockResolvedValue({ error: { code: "INVALID_ORIGIN", status: 403 } });
    render(<AuthForm mode="register" />);
    await userEvent.type(screen.getByLabelText("Név", { exact: true }), "Utazó");
    await userEvent.type(screen.getByLabelText("E-mail-cím", { exact: true }), "utazo@example.com");
    await userEvent.type(screen.getByLabelText("Jelszó", { exact: true }), "test-password-123");
    await userEvent.type(screen.getByLabelText("Jelszó megerősítése", { exact: true }), "test-password-123");
    await userEvent.click(screen.getByRole("button", { name: "Regisztráció", exact: true }));
    expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining("Ez a webcím nincs engedélyezve"), { id: "auth-form" });
    expect(screen.queryByText(/Ez a webcím nincs engedélyezve/)).not.toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("V11: login verifies the new session before opening the protected page", async () => {
    mocks.login.mockResolvedValue({ data: { user: me.user }, error: null });
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText("E-mail-cím", { exact: true }), "utazo@example.com");
    await userEvent.type(screen.getByLabelText("Jelszó", { exact: true }), "test-password-123");
    await userEvent.click(screen.getByRole("button", { name: "Belépés", exact: true }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/attekintes", "signed-in"));
    expect(mocks.session).toHaveBeenCalledWith({ fetchOptions: { cache: "no-store" } });
  });
  it("V11: failed session verification keeps the user on the form with a useful error", async () => {
    mocks.login.mockResolvedValue({ data: { user: me.user }, error: null });
    mocks.session.mockResolvedValue({ data: null, error: null });
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText("E-mail-cím", { exact: true }), "utazo@example.com");
    await userEvent.type(screen.getByLabelText("Jelszó", { exact: true }), "test-password-123");
    await userEvent.click(screen.getByRole("button", { name: "Belépés", exact: true }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining("Nem sikerült ellenőrizni a bejelentkezést."), { id: "auth-form" }));
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("shows validation in a toast and marks invalid fields without inline text", async () => {
    render(<AuthForm mode="login" />);
    await userEvent.click(screen.getByRole("button", { name: "Belépés" }));
    expect(screen.queryByText("Érvényes e-mail-címet adj meg.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("E-mail-cím")).toHaveAttribute("aria-invalid", "true");
    expect(mocks.login).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith("Érvényes e-mail-címet adj meg.", { id: "auth-form" });
  });
  it("disables submit while pending and shows translated login failures", async () => {
    let finish!: (value: unknown) => void;
    mocks.login.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText("E-mail-cím"), "utazo@example.com");
    await userEvent.type(screen.getByLabelText("Jelszó"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Belépés" }));
    expect(screen.getByRole("button", { name: "Folyamatban…" })).toBeDisabled();
    finish({ error: { code: "INVALID_EMAIL_OR_PASSWORD" } });
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Hibás e-mail-cím vagy jelszó.", { id: "auth-form" }));
    expect(screen.queryByText("Hibás e-mail-cím vagy jelszó.")).not.toBeInTheDocument();
  });
  it("renders unverified banner, resends email, and clears all private queries on logout", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["private-trip"], { title: "Titkos" });
    mocks.resend.mockResolvedValue({}); mocks.logout.mockResolvedValue({});
    render(<QueryClientProvider client={client}><Dashboard initialMe={me} /></QueryClientProvider>);
    expect(screen.getByText("Erősítsd meg az e-mail-címedet")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Megerősítő levél újraküldése" }));
    expect(mocks.resend).toHaveBeenCalledWith({ email: me.user.email, callbackURL: "/email-megerosites" });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Kértük a megerősítő levél újraküldését.", { id: "auth-dashboard" });
    await userEvent.click(screen.getByRole("button", { name: "Kijelentkezés" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/belepes", "signed-out"));
    expect(client.getQueryData(["private-trip"])).toBeUndefined();
  });
  it("shows an actionable invalid-reset-link state", () => {
    render(<AuthForm mode="reset" invalidLink />);
    expect(screen.getByRole("alert")).toHaveTextContent("érvénytelen vagy lejárt");
    expect(screen.getByRole("link", { name: "Új hivatkozás kérése" })).toHaveAttribute("href", "/elfelejtett-jelszo");
  });
});
