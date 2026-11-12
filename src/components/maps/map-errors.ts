export function mapErrorMessage(error: unknown): string {
  const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
  if (status === 401 || status === 403) return "A térképszolgáltatás hozzáférése nem engedélyezett. Ellenőrizd a nyilvános tokent és az engedélyezett webcímeket.";
  if (status === 429) return "Elértük a térképszolgáltatás kérési korlátját. Próbáld újra később.";
  return "A térképszolgáltatás nem érhető el. Ellenőrizd az internetkapcsolatot, majd próbáld újra.";
}

export const WEBGL_ERROR = "A böngésző nem tudja elindítani a térképet. Ellenőrizd a WebGL és a hardveres gyorsítás beállításait.";

export function isPublicMapToken(token: string) { return token.startsWith("pk."); }
