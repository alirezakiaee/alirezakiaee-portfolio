'use client';

import { useActionState } from 'react';
import { saveAiSchedule, type AiScheduleFormState } from '../actions';

export type ScheduleFormInitial = {
  id?: string;
  name?: string;
  prompt?: string;
  topics?: string; // newline-separated
  frequency?: string;
  runHour?: number;
  runWeekday?: number;
  runMonthDay?: number;
  model?: string | null;
  publishMode?: string;
  categoryId?: string | null;
  tagsCsv?: string;
  enabled?: boolean;
};

const initial: AiScheduleFormState = { error: null };

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-black/[0.08] bg-white p-5 space-y-4">
      <legend className="font-display font-bold text-sm px-1">{title}</legend>
      {children}
    </fieldset>
  );
}

export function ScheduleForm({
  schedule,
  categories,
}: {
  schedule: ScheduleFormInitial;
  categories: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(saveAiSchedule, initial);
  const freq = schedule.frequency ?? 'WEEKLY';

  return (
    <form action={formAction} className="space-y-6">
      {schedule.id && <input type="hidden" name="id" value={schedule.id} />}

      <Section title="Schedule">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <input id="name" name="name" className="field" defaultValue={schedule.name} placeholder="Weekly .NET tips" maxLength={120} required />
          </div>
          <div>
            <Label htmlFor="model">Model override</Label>
            <input id="model" name="model" className="field" defaultValue={schedule.model ?? ''} placeholder="(default from Settings)" maxLength={120} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={schedule.enabled ?? true} className="rounded" />
          Enabled — runs automatically when due
        </label>
      </Section>

      <Section title="What to write">
        <div>
          <Label htmlFor="prompt">Generation brief</Label>
          <textarea
            id="prompt"
            name="prompt"
            rows={5}
            className="field"
            defaultValue={schedule.prompt}
            placeholder="e.g. Write practical engineering posts about Dynamics 365 F&O integrations, TypeScript, and e-commerce for a senior developer audience. Include real code examples where relevant."
            maxLength={4000}
            required
          />
        </div>
        <div>
          <Label htmlFor="topics">Topic rotation (one per line — optional)</Label>
          <textarea
            id="topics"
            name="topics"
            rows={6}
            className="field"
            defaultValue={schedule.topics}
            placeholder={'Migrating AX 2012 customizations to D365 F&O\nBuilding a pricing engine in TypeScript\nShopify Plus + ERP integration patterns'}
          />
          <p className="text-xs text-muted mt-1">Each run uses the next topic in the list and wraps around. Leave empty to let the model choose.</p>
        </div>
      </Section>

      <Section title="Timing (UTC)">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <select id="frequency" name="frequency" className="field" defaultValue={freq}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          <div>
            <Label htmlFor="runHour">Hour (UTC, 0–23)</Label>
            <input id="runHour" name="runHour" type="number" min={0} max={23} className="field" defaultValue={schedule.runHour ?? 9} />
          </div>
          <div>
            <Label htmlFor="runWeekday">Weekday (weekly)</Label>
            <select id="runWeekday" name="runWeekday" className="field" defaultValue={schedule.runWeekday ?? 1}>
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="runMonthDay">Day of month (monthly)</Label>
            <input id="runMonthDay" name="runMonthDay" type="number" min={1} max={28} className="field" defaultValue={schedule.runMonthDay ?? 1} />
          </div>
        </div>
      </Section>

      <Section title="Publishing">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="publishMode">Create posts as</Label>
            <select id="publishMode" name="publishMode" className="field" defaultValue={schedule.publishMode ?? 'DRAFT'}>
              <option value="DRAFT">Draft (review before publishing)</option>
              <option value="PUBLISH">Published immediately</option>
            </select>
          </div>
          <div>
            <Label htmlFor="categoryId">Category</Label>
            <select id="categoryId" name="categoryId" className="field" defaultValue={schedule.categoryId ?? ''}>
              <option value="">— none —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="tagsCsv">Tags (comma-separated)</Label>
            <input id="tagsCsv" name="tagsCsv" className="field" defaultValue={schedule.tagsCsv} placeholder="engineering, d365, typescript" maxLength={500} />
            <p className="text-xs text-muted mt-1">Always applied; AI-suggested tags are added on top.</p>
          </div>
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn" disabled={pending}>Save schedule</button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
