"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
/** The form sends local India time ("2026-11-02T10:30"); store it as a real point in time. */
const ist = (v: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? new Date(`${v}:00+05:30`) : null);

export async function saveEvent(form: FormData) {
  await requireAdmin(["super_admin", "editor"]);
  const idRaw = str(form, "id", 12);
  const titleEn = str(form, "titleEn");
  const startsAt = ist(str(form, "startsAt", 16));
  if (!titleEn || !startsAt) redirect(`/admin/events/${idRaw || "new"}?error=required`);

  const values = {
    titleEn,
    titleHi: str(form, "titleHi") || null,
    startsAt,
    endsAt: ist(str(form, "endsAt", 16)),
    venueEn: str(form, "venueEn") || null,
    venueHi: str(form, "venueHi") || null,
    descriptionEn: str(form, "descriptionEn", 3000) || null,
    descriptionHi: str(form, "descriptionHi", 3000) || null,
    divisionId: Number(str(form, "divisionId", 10)) || null,
    agendaUrl: str(form, "agenda", 600) || null,
    minutesUrl: str(form, "minutes", 600) || null,
    published: form.get("published") === "on",
  };
  const db = getDb();
  let id = Number(idRaw);
  if (id) await db.update(schema.events).set(values).where(eq(schema.events.id, id));
  else id = (await db.insert(schema.events).values(values).returning({ id: schema.events.id }))[0].id;
  updateTag("events");
  redirect(`/admin/events/${id}?saved=1`);
}

export async function deleteEvent(form: FormData) {
  await requireAdmin(["super_admin", "editor"]);
  const id = Number(form.get("id"));
  if (id) {
    await getDb().delete(schema.events).where(eq(schema.events.id, id));
    updateTag("events");
  }
  redirect("/admin/events?deleted=1");
}
