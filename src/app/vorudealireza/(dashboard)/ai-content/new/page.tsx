import { prisma } from '@/lib/db';
import { ScheduleForm } from '../_components/schedule-form';

export default async function NewAiSchedulePage() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });
  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-extrabold text-3xl tracking-tight">New AI schedule</h1>
      <p className="text-sm text-muted mt-2">Define what the AI writes and when it runs.</p>
      <div className="mt-8">
        <ScheduleForm schedule={{}} categories={categories} />
      </div>
    </div>
  );
}
