export function UserAvatar({ name, className = "" }: { name: string; className?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toLocaleUpperCase("hu");

  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center bg-brand/10 font-bold text-blue-800 dark:text-blue-300 ${className}`}>
      {initials}
    </span>
  );
}
