// Placeholder homepage. The full visual design is ported from
// _legacy_static_site/index.html in Phase 12 (public frontend integration),
// once enough CMS content types exist to drive it. This file exists so the
// Next.js app builds and runs during earlier phases.
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-sm font-medium tracking-widest uppercase text-accent mb-3">CMS migration in progress</p>
        <h1 className="font-display font-black text-4xl md:text-6xl tracking-tight">Alireza Kiaee</h1>
        <p className="mt-4 text-muted">
          The public site is being rebuilt on the new CMS.{' '}
          <a href="/vorudealireza" className="text-accent underline underline-offset-4">
            Admin
          </a>
        </p>
      </div>
    </main>
  );
}
