import type { ReactNode } from "react";

export const pageGutters = "px-4 py-5 sm:px-5 lg:px-6 lg:py-6";

export function PageContent({ children }: { children: ReactNode }) {
  return <div className="w-full min-w-0 space-y-5 lg:space-y-7">{children}</div>;
}
