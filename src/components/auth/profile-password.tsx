"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { HiOutlineKey } from "react-icons/hi2";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { authError, passwordSchema } from "@/lib/auth-validation";
import { notify } from "@/lib/notifications";
import { buttonClass, secondaryButtonClass } from "./field";

const notificationId = "profile-password";
type PasswordField = "currentPassword" | "newPassword" | "confirmPassword";

export function ProfilePassword() {
  const formId = useId();
  const editButton = useRef<HTMLButtonElement>(null);
  const currentInput = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<PasswordField, string>>>({});

  useEffect(() => {
    if (open) currentInput.current?.focus();
    else if (restoreFocus.current) {
      restoreFocus.current = false;
      editButton.current?.focus();
    }
  }, [open]);

  function closeForm() {
    restoreFocus.current = true;
    setErrors({});
    setOpen(false);
  }

  function showError(message: string, field?: PasswordField) {
    if (field) setErrors({ [field]: message });
    notify.error(message, { id: notificationId });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const currentPassword = String(values.get("currentPassword") ?? "");
    const newPassword = String(values.get("newPassword") ?? "");
    setErrors({});
    if (!currentPassword) {
      showError("Add meg a jelenlegi jelszavadat.", "currentPassword");
      return;
    }
    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      showError(parsed.error.issues[0].message, "newPassword");
      return;
    }
    if (newPassword === currentPassword) {
      showError("Az új jelszó különbözzön a jelenlegi jelszótól.", "newPassword");
      return;
    }
    if (newPassword !== values.get("confirmPassword")) {
      showError("A két új jelszó nem egyezik.", "confirmPassword");
      return;
    }

    setPending(true);
    try {
      const result = await authClient.changePassword({ currentPassword, newPassword });
      if (result.error) {
        if (result.error.code === "INVALID_PASSWORD") showError("A jelenlegi jelszó hibás.", "currentPassword");
        else if (result.error.status === 401) showError("A bejelentkezésed lejárt. Jelentkezz be újra.");
        else showError(authError(result.error));
        return;
      }
      closeForm();
      notify.success("A jelszavadat megváltoztattuk.", { id: notificationId });
    } catch {
      showError("A jelszó módosítása nem sikerült. Próbáld újra.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-blue-800 dark:text-blue-300">
            <HiOutlineKey aria-hidden="true" className="size-5" />
          </span>
          <p className="font-semibold">Jelszó</p>
        </div>
        <button ref={editButton} type="button" aria-expanded={open} aria-controls={open ? formId : undefined} disabled={pending}
          className={secondaryButtonClass} onClick={() => { if (open) closeForm(); else setOpen(true); }}>
          Jelszó megváltoztatása
        </button>
      </div>
      {open && (
        <form id={formId} method="post" noValidate onSubmit={submit} aria-busy={pending} className="mt-5 border-t border-border pt-5">
          <fieldset disabled={pending} className="max-w-2xl space-y-4">
            <Input ref={currentInput} type="password" name="currentPassword" label="Jelenlegi jelszó" autoComplete="current-password"
              required maxLength={128} error={errors.currentPassword} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input type="password" name="newPassword" label="Új jelszó" autoComplete="new-password"
                required minLength={8} maxLength={128} error={errors.newPassword} />
              <Input type="password" name="confirmPassword" label="Új jelszó megerősítése" autoComplete="new-password"
                required maxLength={128} error={errors.confirmPassword} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={`${buttonClass} text-sm`}>{pending ? "Mentés…" : "Jelszó mentése"}</button>
              <button type="button" className={secondaryButtonClass} onClick={closeForm}>Mégse</button>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}
