import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { notify } from "./notifications";

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError(error, query) {
        if (query.meta?.silent === true || (error instanceof Error && error.message === "UNAUTHORIZED")) return;
        const message = typeof query.meta?.errorMessage === "string" ? query.meta.errorMessage
          : "Az adatok betöltése nem sikerült. Próbáld újra később.";
        notify.error(message, { id: `query:${query.queryHash}` });
      },
    }),
    mutationCache: new MutationCache({
      onError(_error, _variables, _context, mutation) {
        if (mutation.meta?.silent === true) return;
        const message = typeof mutation.meta?.errorMessage === "string" ? mutation.meta.errorMessage
          : "A művelet nem sikerült. Próbáld újra később.";
        notify.error(message);
      },
      onSuccess(_data, _variables, _context, mutation) {
        if (mutation.meta?.silent !== true && typeof mutation.meta?.successMessage === "string") {
          notify.success(mutation.meta.successMessage);
        }
      },
    }),
  });
}
