import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin, type Role } from "@/lib/auth";
import { logout } from "../login/actions";

// The panel always depends on the signed-in admin, so it is rendered per request and has no static shell.
export const instant = false;

const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: "/admin", label: "Dashboard", roles: ["super_admin", "editor", "division_admin"] },
  { href: "/admin/posts", label: "Orders & news", roles: ["super_admin", "editor"] },
  { href: "/admin/pages", label: "Pages", roles: ["super_admin", "editor"] },
  { href: "/admin/gallery", label: "Photo gallery", roles: ["super_admin", "editor"] },
  { href: "/admin/officials", label: "Office bearers", roles: ["super_admin", "editor", "division_admin"] },
  { href: "/admin/divisions", label: "Divisions & branches", roles: ["super_admin", "editor"] },
  { href: "/admin/grievances", label: "Grievances", roles: ["super_admin", "editor", "division_admin"] },
  { href: "/admin/events", label: "Events", roles: ["super_admin", "editor"] },
  { href: "/admin/requests", label: "Join requests", roles: ["super_admin", "editor", "division_admin"] },
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
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
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
            </Link>
          ))}
          <Link href="/en" target="_blank" className="block shrink-0 whitespace-nowrap rounded-lg px-4 py-2.5 text-[0.95rem] font-medium text-dim hover:bg-white/10 hover:text-signal">
            View website ↗
          </Link>
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-sm">
          <p className="font-semibold">{admin.name}</p>
          <p className="truncate text-xs text-dim">{admin.email}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-signal">{admin.role.replace("_", " ")}</p>
          <form action={logout} className="mt-3">
            <button className="rounded-full border border-white/25 px-4 py-1.5 text-sm font-semibold hover:bg-white/10">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 px-4 py-8 sm:px-8">{children}</div>
    </div>
  );
}
