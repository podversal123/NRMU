import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { requireAdmin, type Role } from "@/lib/auth";
import { getMeetingAlerts } from "@/lib/meetings";
import { logout } from "../login/actions";

// The panel always depends on the signed-in admin, so it is rendered per request and has no static shell.
export const instant = false;

const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: "/admin", label: "Dashboard", roles: ["super_admin", "editor", "division_admin"] },
  { href: "/admin/posts", label: "Orders & news", roles: ["super_admin", "editor"] },
  { href: "/admin/pages", label: "Pages", roles: ["super_admin", "editor"] },
  { href: "/admin/gallery", label: "Photo gallery", roles: ["super_admin", "editor"] },
  { href: "/admin/officials", label: "Office bearers", roles: ["super_admin", "editor", "division_admin"] },
  { href: "/admin/wings", label: "Women & Youth wings", roles: ["super_admin", "editor"] },
  { href: "/admin/divisions", label: "Divisions & branches", roles: ["super_admin", "editor"] },
  { href: "/admin/grievances", label: "Grievances", roles: ["super_admin", "editor", "division_admin"] },
  { href: "/admin/events", label: "Events", roles: ["super_admin", "editor"] },
  { href: "/admin/meetings", label: "Meetings", roles: ["super_admin"] },
  { href: "/admin/members", label: "Members", roles: ["super_admin", "division_admin"] },
  { href: "/admin/departments", label: "Departments", roles: ["super_admin"] },
  { href: "/admin/settings", label: "Site text", roles: ["super_admin"] },
  { href: "/admin/navigation", label: "Menus & links", roles: ["super_admin"] },
  { href: "/admin/users", label: "Admin users", roles: ["super_admin"] },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-10 text-muted">Loading…</div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const items = NAV.filter((n) => n.roles.includes(admin.role));
  // meetings that are on now or later today, shown as a badge on the Meetings link
  // registrations waiting for approval: all of them for a super admin, the division's own for a division admin
  const waiting =
    admin.role === "editor"
      ? 0
      : Number(
          (
            (await getDb().execute(
              sql`select count(*)::int as n from members where status = 'pending' ${admin.role === "division_admin" ? sql`and division_id = ${admin.divisionId ?? -1}` : sql``}`,
            )) as unknown as { rows?: { n: number }[] } & { n: number }[]
          ).rows?.[0]?.n ?? 0,
        );
  const meetingsToday = admin.role === "super_admin" ? (await getMeetingAlerts()).filter((a) => a.group !== "soon").length : 0;
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="bg-coal text-light lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <Image src="/logo.jpg" alt="" width={44} height={44} className="h-11 w-11 rounded-full ring-2 ring-signal" />
          <div className="leading-tight">
            <p className="font-display text-2xl font-bold">NRMU</p>
            <p className="text-xs text-dim">Admin panel</p>
          </div>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 py-3 lg:block lg:space-y-1">
          {items.map((n) => (
            <Link key={n.href} href={n.href} className="block shrink-0 whitespace-nowrap rounded-lg px-4 py-2.5 text-[0.95rem] font-medium text-dim hover:bg-white/10 hover:text-signal">
              {n.label}
              {n.href === "/admin/members" && waiting > 0 && (
                <span aria-label={`${waiting} waiting`} className="ml-2 inline-grid h-5 min-w-5 place-items-center rounded-full bg-signal px-1.5 text-xs font-bold text-ink">{waiting}</span>
              )}
              {n.href === "/admin/meetings" && meetingsToday > 0 && (
                <span aria-label={`${meetingsToday} today`} className="ml-2 inline-grid h-5 min-w-5 place-items-center rounded-full bg-signal px-1.5 text-xs font-bold text-ink">{meetingsToday}</span>
              )}
            </Link>
          ))}
          <Link href="/en" target="_blank" className="block shrink-0 whitespace-nowrap rounded-lg px-4 py-2.5 text-[0.95rem] font-medium text-dim hover:bg-white/10 hover:text-signal">
            View website ↗
          </Link>
        </nav>
        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3 text-sm lg:block lg:py-4">
          <div className="min-w-0">
            <p className="truncate font-semibold">{admin.name}</p>
            <p className="hidden truncate text-xs text-dim lg:block">{admin.email}</p>
            <p className="mt-0.5 text-xs uppercase tracking-wider text-signal">{admin.role.replace("_", " ")}</p>
          </div>
          <form action={logout} className="shrink-0 lg:mt-3">
            <button className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 px-4 py-8 sm:px-8">{children}</div>
    </div>
  );
}
