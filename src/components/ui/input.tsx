"use client";
import { useId, useState, type ComponentPropsWithRef } from "react";
import { HiOutlineUser, HiOutlineEnvelope, HiOutlineLockClosed, HiOutlinePencilSquare, HiOutlineEye, HiOutlineEyeSlash } from "react-icons/hi2";

export type InputType = "text" | "name" | "email" | "password";
export type InputProps = Omit<ComponentPropsWithRef<"input">, "type"> & {
  type?: InputType;
  label?: string;
  error?: string;
};

const presets = {
  text: { label: "Szöveg", icon: HiOutlinePencilSquare, autoComplete: undefined },
  name: { label: "Név", icon: HiOutlineUser, autoComplete: "name" },
  email: { label: "E-mail-cím", icon: HiOutlineEnvelope, autoComplete: "email" },
  password: { label: "Jelszó", icon: HiOutlineLockClosed, autoComplete: "current-password" },
};

export function Input({ type = "text", label, id, name, error, autoComplete, placeholder, className = "", disabled, readOnly,
  "aria-invalid": ariaInvalid, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const preset = presets[type];
  const Icon = preset.icon;
  const nativeType = type === "name" ? "text" : type === "password" && passwordVisible ? "text" : type;
  return <div className="group relative w-full">
      <input {...props} id={inputId} name={name ?? (type === "text" ? undefined : type)} type={nativeType}
        autoComplete={autoComplete ?? preset.autoComplete} disabled={disabled} readOnly={readOnly}
        placeholder={placeholder ?? " "}
        aria-invalid={error ? true : ariaInvalid}
        className={`peer h-13 w-full rounded-2xl border border-border bg-background/70 pb-1 pl-12 pt-5 text-base outline-none transition duration-200 placeholder:text-transparent hover:border-muted-foreground/50 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/20 motion-reduce:transition-none ${type === "password" ? "pr-14" : "pr-4"} ${className}`} />
      <label htmlFor={inputId}
        className="pointer-events-none absolute left-12 top-1 translate-y-0 text-xs font-medium text-muted-foreground transition-[top,translate,font-size,color] duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-focus:top-1 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-brand peer-disabled:opacity-60 motion-reduce:transition-none">
        {label ?? preset.label}
      </label>
      <Icon aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-brand motion-reduce:transition-none" />
      {type === "password" && <button type="button" aria-label={passwordVisible ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
        aria-pressed={passwordVisible} aria-controls={inputId} disabled={disabled}
        onClick={() => setPasswordVisible((visible) => !visible)}
        className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface-alt hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50">
        {passwordVisible ? <HiOutlineEyeSlash aria-hidden="true" className="size-5" /> : <HiOutlineEye aria-hidden="true" className="size-5" />}
      </button>}
  </div>;
}
