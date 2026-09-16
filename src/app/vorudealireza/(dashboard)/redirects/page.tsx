import { prisma } from '@/lib/db';
import { RedirectManager } from './_components/redirect-manager';

export default async function RedirectsPage() {
  const redirects = await prisma.redirect.findMany({ orderBy: { fromPath: 'asc' } });

  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-extrabold text-3xl tracking-tight">Redirects</h1>
      <p className="text-sm text-muted mt-2">
        URL redirects applied by middleware before serving pages. {redirects.length} defined.
      </p>
      <div className="mt-8">
        <RedirectManager
          redirects={redirects.map((r) => ({
            id: r.id,
            fromPath: r.fromPath,
            toPath: r.toPath,
            type: r.type,
            enabled: r.enabled,
            hits: r.hits,
          }))}
        />
      </div>
    </div>
  );
}
