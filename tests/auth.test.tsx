import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthForm } from "@/components/auth/auth-form";
import { Dashboard } from "@/components/auth/dashboard";
import { registrationSchema, authError } from "@/lib/auth-validation";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), login: vi.fn(), logout: vi.fn(), resend: vi.fn(), session: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signIn: { email: mocks.login }, signOut: mocks.logout, sendVerificationEmail: mocks.resend, getSession: mocks.session } }));
const me = { user: { id: "user-1", name: "Utazó", email: "utazo@example.com", emailVerified: false } };
beforeEach(() => { vi.clearAllMocks(); mocks.session.mockResolvedValue({}); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => me })); });
describe("Hungarian auth UI", () => {
  it("validates names and passwords and maps errors without exposing server text", () => {
    expect(registrationSchema.safeParse({ name: " ", email: "invalid", password: "short" }).success).toBe(false);
    expect(registrationSchema.safeParse({ name: "Utazó", email: "utazo@example.com", password: "a".repeat(12) }).success).toBe(true);
    expect(authError({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe("Hibás e-mail-cím vagy jelszó.");
    expect(authError({ status: 429 })).toContain("egy perc");
    expect(authError({ code: "SQL_ERROR" })).toBe("A művelet nem sikerült. Próbáld újra később.");
  });
  it("shows inline validation without sending a request", async () => {
    render(<AuthForm mode="login" />);
    await userEvent.click(screen.getByRole("button", { name: "Belépés" }));
    expect(screen.getByText("Érvényes e-mail-címet adj meg.")).toBeVisible();
    expect(mocks.login).not.toHaveBeenCalled();
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
    expect(await screen.findByRole("alert")).toHaveTextContent("Hibás e-mail-cím vagy jelszó.");
  });
  it("renders unverified banner, resends email, and clears all private queries on logout", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["private-trip"], { title: "Titkos" });
    mocks.resend.mockResolvedValue({}); mocks.logout.mockResolvedValue({});
    render(<QueryClientProvider client={client}><Dashboard initialMe={me} /></QueryClientProvider>);
    expect(screen.getByText("Erősítsd meg az e-mail-címedet")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Megerősítő levél újraküldése" }));
    expect(mocks.resend).toHaveBeenCalledWith({ email: me.user.email, callbackURL: "/email-megerosites" });
    await userEvent.click(screen.getByRole("button", { name: "Kijelentkezés" }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/belepes"));
    expect(client.getQueryData(["private-trip"])).toBeUndefined();
  });
  it("shows an actionable invalid-reset-link state", () => {
    render(<AuthForm mode="reset" invalidLink />);
    expect(screen.getByRole("alert")).toHaveTextContent("érvénytelen vagy lejárt");
    expect(screen.getByRole("link", { name: "Új hivatkozás kérése" })).toHaveAttribute("href", "/elfelejtett-jelszo");
  });
});
