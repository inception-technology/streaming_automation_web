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
        <h2 className="font-medium">Phase 0</h2>
        <p className="mt-2 text-sm">
          Scaffolding en place. Les sections streams, content (Remotion), chat et workflows
          arrivent en Phase 1.
        </p>
      </section>
    </div>
  );
}
