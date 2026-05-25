import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { Providers } from "@/components/providers";
import { SidebarNav } from "@/components/sidebar-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-semibold">
              streaming_automation
            </Link>
            <OrganizationSwitcher hidePersonal />
          </div>
          <UserButton />
        </header>
        <div className="flex flex-1">
          <aside className="w-56 shrink-0 border-r p-4">
            <SidebarNav />
          </aside>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
