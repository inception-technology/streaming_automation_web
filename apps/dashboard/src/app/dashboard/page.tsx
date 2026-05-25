import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { orgRole } = await auth();
  const user = await currentUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenue {user?.firstName ?? user?.username ?? user?.emailAddresses[0]?.emailAddress}.
        </p>
      </div>
      <section className="rounded border p-4">
        <h2 className="font-medium">Identité</h2>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Email</dt>
          <dd>{user?.emailAddresses[0]?.emailAddress ?? "—"}</dd>
          <dt className="text-muted-foreground">Rôle org</dt>
          <dd>{orgRole ?? "—"}</dd>
        </dl>
      </section>
      <section className="rounded border p-4">
        <h2 className="font-medium">Streams</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Gestion des lives multi-plateformes : démarrage, monitoring temps réel via
          WebSocket, arrêt propre via Temporal.
        </p>
        <Link
          href="/dashboard/streams"
          className="mt-3 inline-block rounded bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90"
        >
          Ouvrir la liste des streams →
        </Link>
      </section>
    </div>
  );
}
