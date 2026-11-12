import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/input";

describe("shared Input", () => {
  it.each([
    ["name", "Név", "text", "name"],
    ["email", "E-mail-cím", "email", "email"],
    ["password", "Jelszó", "password", "current-password"],
    ["search", "Hely keresése", "search", "off"],
  ] as const)("provides accessible %s defaults and a decorative icon", (type, label, nativeType, autoComplete) => {
    const { container } = render(<Input type={type} />);
    const input = screen.getByLabelText(label, { exact: true });
    expect(input).toHaveAttribute("type", nativeType);
    expect(input).toHaveAttribute("name", type);
    expect(input).toHaveAttribute("autocomplete", autoComplete);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
  it("toggles password visibility without changing the value or submitting the form", async () => {
    const submit = vi.fn((event) => event.preventDefault());
    render(<form onSubmit={submit}><Input type="password" defaultValue="synthetic-password" /></form>);
    const input = screen.getByLabelText("Jelszó", { exact: true });
    await userEvent.click(screen.getByRole("button", { name: "Jelszó megjelenítése" }));
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("synthetic-password");
    expect(screen.getByRole("button", { name: "Jelszó elrejtése" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.keyboard("{Enter}");
    expect(input).toHaveAttribute("type", "password");
    expect(submit).not.toHaveBeenCalled();
  });
  it("respects disabled password inputs", async () => {
    render(<Input type="password" disabled />);
    const toggle = screen.getByRole("button", { name: "Jelszó megjelenítése" });
    expect(toggle).toBeDisabled();
    await userEvent.click(toggle);
    expect(screen.getByLabelText("Jelszó", { exact: true })).toHaveAttribute("type", "password");
  });
  it("forwards refs, custom labels, native events, and form field names", async () => {
    const ref = createRef<HTMLInputElement>();
    const onChange = vi.fn();
    const { container } = render(<form><Input type="name" ref={ref} name="traveler" label="Utazó neve" onChange={onChange} /></form>);
    await userEvent.type(screen.getByLabelText("Utazó neve"), "Teszt Utazó");
    expect(ref.current).toHaveValue("Teszt Utazó");
    expect(onChange).toHaveBeenCalled();
    expect(new FormData(container.querySelector("form")!).get("traveler")).toBe("Teszt Utazó");
  });
  it("marks invalid inputs without rendering inline error text", () => {
    render(<Input type="email" error="Hibás e-mail-cím" />);
    expect(screen.getByLabelText("E-mail-cím")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("Hibás e-mail-cím")).not.toBeInTheDocument();
  });
});
