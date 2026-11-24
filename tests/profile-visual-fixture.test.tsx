import { it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import ProfilePage from "@/app/(protected)/profil/page";
import { currentTripDate } from "@/components/trips/trip-calendar";

const { requireServerMe, loadServerApi } = vi.hoisted(() => ({ requireServerMe: vi.fn(), loadServerApi: vi.fn() }));
vi.mock("@/lib/server-session", () => ({ requireServerMe, loadServerApi }));

it("renders profile preview markup", async () => {
  const today = currentTripDate();
  loadServerApi.mockImplementation(async (path) => path === "/api/trips"
    ? [{ start: today, end: today }, { start: "2099-01-01", end: "2099-01-02" }, { start: "2000-01-01", end: "2000-01-02" }]
    : { accepted: [{ id: "one", name: "Utazo" }], incoming: [{ id: "two", name: "Utazo" }], outgoing: [] });
  for (const emailVerified of [true, false]) {
    requireServerMe.mockResolvedValue({ user: { id: "demo", name: "Nagy Anna", email: "anna@example.com", emailVerified } });
    await writeFile(join(tmpdir(), "csavargo-profile-preview-" + emailVerified + ".html"), renderToStaticMarkup(await ProfilePage()));
  }
});
