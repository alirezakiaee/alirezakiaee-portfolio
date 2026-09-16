import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPage, listParentOptions } from '@/services/pages.service';
import { PageForm, type PageFormInitial } from '../_components/page-form';
import { DeletePageButton } from '../_components/delete-button';

const datetimeInput = (d: Date | null) =>
  d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : undefined;

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; restored?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [page, parentOptions] = await Promise.all([getPage(id), listParentOptions(id)]);
  if (!page) notFound();

  const initial: PageFormInitial = {
    id: page.id,
    status: page.status,
    title: page.title,
    slug: page.slug,
    excerpt: page.excerpt,
    template: page.template,
    parentId: page.parentId,
    sortOrder: page.sortOrder,
    blocks: page.blocks.map((b) => ({ type: b.type, data: b.data, enabled: b.enabled })),
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    canonicalUrl: page.canonicalUrl,
    robotsIndex: page.robotsIndex,
    robotsFollow: page.robotsFollow,
    ogTitle: page.ogTitle,
    ogDescription: page.ogDescription,
    scheduledAt: datetimeInput(page.scheduledAt),
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">{page.title}</h1>
          <p className="text-sm text-muted mt-2">
            <code className="bg-black/5 rounded px-1.5 py-0.5 text-xs">/{page.slug}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/vorudealireza/pages/${page.id}/revisions`} className="btn-ghost">
            Revisions
          </Link>
          <DeletePageButton id={page.id} title={page.title} />
        </div>
      </div>

      {sp.saved && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Saved.
        </p>
      )}
      {sp.restored && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Revision restored.
        </p>
      )}

      <div className="mt-8">
        <PageForm page={initial} parentOptions={parentOptions} />
      </div>
    </div>
  );
}
