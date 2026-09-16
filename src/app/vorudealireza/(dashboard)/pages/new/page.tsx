import { listParentOptions } from '@/services/pages.service';
import { PageForm } from '../_components/page-form';

export default async function NewPagePage() {
  const parentOptions = await listParentOptions();
  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-extrabold text-3xl tracking-tight">New page</h1>
      <p className="text-sm text-muted mt-2">Build the page from content blocks, then publish.</p>
      <div className="mt-8">
        <PageForm page={{}} parentOptions={parentOptions} />
      </div>
    </div>
  );
}
