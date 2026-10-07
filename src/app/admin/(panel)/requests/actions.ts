"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

export async function setRequestStatus(form: FormData) {
  const admin = await requireAdmin();
  const id = Number(form.get("id"));
  const status = String(form.get("status"));
  if (id && ["new", "contacted", "closed"].includes(status)) {
    const cond = admin.role === "division_admin" ? and(eq(schema.joinRequests.id, id), eq(schema.joinRequests.divisionId, admin.divisionId ?? -1)) : eq(schema.joinRequests.id, id);
    await getDb().update(schema.joinRequests).set({ status }).where(cond);
  }
  redirect("/admin/requests");
}
