'use client';

import { useState } from 'react';
import { BLOCK_LABELS, BLOCK_TYPES, defaultBlockData, type BlockType } from '@/lib/blocks/schemas';

export type EditorBlock = {
  key: string;
  type: BlockType;
  enabled: boolean;
  data: Record<string, unknown>;
};

let nextKey = 1;
const genKey = () => `b${nextKey++}-${Math.random().toString(36).slice(2, 8)}`;

export function toEditorBlocks(
  blocks: { type: string; data: unknown; enabled: boolean }[]
): EditorBlock[] {
  return blocks.map((b) => ({ key: genKey(), type: b.type as BlockType, enabled: b.enabled, data: (b.data ?? {}) as Record<string, unknown> }));
}

const inputCls = 'field';
const labelCls = 'block text-xs font-medium uppercase tracking-widest text-muted mb-1.5';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

function BlockFields({ block, patch }: { block: EditorBlock; patch: (p: Record<string, unknown>) => void }) {
  const d = block.data;
  const str = (k: string) => String(d[k] ?? '');
  switch (block.type) {
    case 'hero':
      return (
        <div className="space-y-3">
          <Field label="Heading">
            <TextInput value={str('heading')} onChange={(v) => patch({ heading: v })} placeholder="Welcome to…" />
          </Field>
          <Field label="Subheading">
            <TextInput value={str('subheading')} onChange={(v) => patch({ subheading: v })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA label">
              <TextInput value={str('ctaLabel')} onChange={(v) => patch({ ctaLabel: v })} />
            </Field>
            <Field label="CTA URL">
              <TextInput value={str('ctaUrl')} onChange={(v) => patch({ ctaUrl: v })} placeholder="https://… or /path" />
            </Field>
          </div>
          <Field label="Alignment">
            <select className={inputCls} value={str('align') || 'left'} onChange={(e) => patch({ align: e.target.value })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
            </select>
          </Field>
        </div>
      );
    case 'richText':
      return (
        <Field label="HTML content">
          <textarea
            className={`${inputCls} font-mono text-xs`}
            rows={8}
            value={str('html')}
            placeholder="<p>Write content here…</p>"
            onChange={(e) => patch({ html: e.target.value })}
          />
        </Field>
      );
    case 'cta':
      return (
        <div className="space-y-3">
          <Field label="Heading">
            <TextInput value={str('heading')} onChange={(v) => patch({ heading: v })} />
          </Field>
          <Field label="Text">
            <TextInput value={str('text')} onChange={(v) => patch({ text: v })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Button label">
              <TextInput value={str('buttonLabel')} onChange={(v) => patch({ buttonLabel: v })} />
            </Field>
            <Field label="Button URL">
              <TextInput value={str('buttonUrl')} onChange={(v) => patch({ buttonUrl: v })} placeholder="https://… or /path" />
            </Field>
          </div>
        </div>
      );
    case 'gallery':
      return (
        <Field label="Media IDs (comma separated — media picker lands with the library)">
          <TextInput
            value={Array.isArray(d.mediaIds) ? (d.mediaIds as string[]).join(', ') : ''}
            onChange={(v) => patch({ mediaIds: v.split(',').map((s) => s.trim()).filter(Boolean) })}
            placeholder="uuid, uuid, …"
          />
        </Field>
      );
    case 'spacer':
      return (
        <Field label="Size">
          <select className={inputCls} value={str('size') || 'md'} onChange={(e) => patch({ size: e.target.value })}>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </Field>
      );
  }
}

export function BlockEditor({ initialBlocks }: { initialBlocks: EditorBlock[] }) {
  const [blocks, setBlocks] = useState<EditorBlock[]>(initialBlocks);
  const [addType, setAddType] = useState<BlockType>('richText');

  const update = (key: string, fn: (b: EditorBlock) => EditorBlock) =>
    setBlocks((bs) => bs.map((b) => (b.key === key ? fn(b) : b)));
  const move = (i: number, dir: -1 | 1) =>
    setBlocks((bs) => {
      const j = i + dir;
      if (j < 0 || j >= bs.length) return bs;
      const copy = [...bs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  const add = () =>
    setBlocks((bs) => [...bs, { key: genKey(), type: addType, enabled: true, data: defaultBlockData(addType) }]);

  const serialized = JSON.stringify(
    blocks.map(({ type, data, enabled }) => ({ type, data, enabled }))
  );

  return (
    <fieldset className="rounded-2xl border border-black/[0.08] bg-white p-5 space-y-4">
      <legend className="font-display font-bold text-sm px-1">Content blocks</legend>
      <input type="hidden" name="blocksJson" value={serialized} />

      {blocks.length === 0 && (
        <p className="text-sm text-muted">No blocks yet — add one below.</p>
      )}

      <ol className="space-y-3">
        {blocks.map((b, i) => (
          <li key={b.key} className={`rounded-xl border p-4 space-y-3 ${b.enabled ? 'border-black/[0.08]' : 'border-dashed border-black/15 opacity-60'}`}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-widest text-muted">
                {BLOCK_LABELS[b.type] ?? b.type}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button type="button" className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-black/5 hover:text-ink disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move block up">
                  ↑ Up
                </button>
                <button type="button" className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-black/5 hover:text-ink disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Move block down">
                  ↓ Down
                </button>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-black/5 hover:text-ink"
                  onClick={() => update(b.key, (x) => ({ ...x, enabled: !x.enabled }))}
                >
                  {b.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  onClick={() => setBlocks((bs) => bs.filter((x) => x.key !== b.key))}
                >
                  Remove
                </button>
              </div>
            </div>
            <BlockFields block={b} patch={(p) => update(b.key, (x) => ({ ...x, data: { ...x.data, ...p } }))} />
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-2 pt-1">
        <select className="field !w-auto !py-2" value={addType} onChange={(e) => setAddType(e.target.value as BlockType)} aria-label="Block type">
          {BLOCK_TYPES.map((t) => (
            <option key={t} value={t}>{BLOCK_LABELS[t]}</option>
          ))}
        </select>
        <button type="button" className="btn-ghost !py-2" onClick={add}>
          + Add block
        </button>
      </div>
    </fieldset>
  );
}
