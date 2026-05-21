import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
