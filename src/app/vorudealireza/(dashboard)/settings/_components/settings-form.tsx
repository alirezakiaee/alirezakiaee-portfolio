'use client';

import { useActionState } from 'react';
import { saveSettings, type SettingsFormState } from '../actions';

const initial: SettingsFormState = { error: null };

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

export function SettingsForm({ values }: { values: Record<string, string> }) {
  const [state, formAction, pending] = useActionState(saveSettings, initial);
  const v = (k: string) => values[k] ?? '';

  return (
    <form action={formAction} className="space-y-6">
      <Section title="Site">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="site.title">Site title</Label>
            <input id="site.title" name="site.title" className="field" defaultValue={v('site.title')} maxLength={120} />
          </div>
          <div>
            <Label htmlFor="site.tagline">Tagline</Label>
            <input id="site.tagline" name="site.tagline" className="field" defaultValue={v('site.tagline')} maxLength={200} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="site.description">Description</Label>
            <textarea id="site.description" name="site.description" rows={2} className="field" defaultValue={v('site.description')} maxLength={500} />
          </div>
          <div>
            <Label htmlFor="site.email">Contact email</Label>
            <input id="site.email" name="site.email" type="email" className="field" defaultValue={v('site.email')} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="site.location">Location</Label>
            <input id="site.location" name="site.location" className="field" defaultValue={v('site.location')} maxLength={120} />
          </div>
        </div>
      </Section>

      <Section title="Social">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="social.github">GitHub</Label>
            <input id="social.github" name="social.github" type="url" className="field" defaultValue={v('social.github')} placeholder="https://github.com/…" />
          </div>
          <div>
            <Label htmlFor="social.linkedin">LinkedIn</Label>
            <input id="social.linkedin" name="social.linkedin" type="url" className="field" defaultValue={v('social.linkedin')} placeholder="https://linkedin.com/in/…" />
          </div>
          <div>
            <Label htmlFor="social.twitter">X / Twitter</Label>
            <input id="social.twitter" name="social.twitter" type="url" className="field" defaultValue={v('social.twitter')} placeholder="https://x.com/…" />
          </div>
        </div>
      </Section>

      <Section title="SEO defaults">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="seo.defaultTitle">Default title</Label>
            <input id="seo.defaultTitle" name="seo.defaultTitle" className="field" defaultValue={v('seo.defaultTitle')} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="seo.titleTemplate">Title template</Label>
            <input id="seo.titleTemplate" name="seo.titleTemplate" className="field" defaultValue={v('seo.titleTemplate')} placeholder="%s · Alireza Kiaee" maxLength={200} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="seo.defaultDescription">Default description</Label>
            <textarea id="seo.defaultDescription" name="seo.defaultDescription" rows={2} className="field" defaultValue={v('seo.defaultDescription')} maxLength={300} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="seo.defaultOgImage">Default OG image URL</Label>
            <input id="seo.defaultOgImage" name="seo.defaultOgImage" className="field" defaultValue={v('seo.defaultOgImage')} placeholder="/uploads/og.png or https://…" />
          </div>
        </div>
      </Section>

      <Section title="AI content generation">
        <p className="text-xs text-muted">
          Powers scheduled blog-post generation (AI Content in the sidebar). Any OpenAI-compatible
          API works — OpenAI, OpenRouter, Groq, Azure OpenAI, or a local server.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ai.apiKey">API key</Label>
            <input
              id="ai.apiKey"
              name="ai.apiKey"
              type="password"
              autoComplete="new-password"
              className="field"
              placeholder={v('ai.apiKey') ? '•••••••• (set — leave blank to keep)' : 'sk-…'}
              maxLength={500}
            />
          </div>
          <div>
            <Label htmlFor="ai.model">Default model</Label>
            <input id="ai.model" name="ai.model" className="field" defaultValue={v('ai.model')} placeholder="gpt-4o-mini" maxLength={120} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="ai.baseUrl">Base URL</Label>
            <input id="ai.baseUrl" name="ai.baseUrl" className="field" defaultValue={v('ai.baseUrl')} placeholder="https://api.openai.com/v1" maxLength={300} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="ai.systemPrompt">System prompt</Label>
            <textarea id="ai.systemPrompt" name="ai.systemPrompt" rows={5} className="field" defaultValue={v('ai.systemPrompt')} placeholder="Leave blank for the built-in default persona." />
          </div>
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn" disabled={pending}>Save settings</button>
        {state.saved && !state.error && <p className="text-sm text-green-700">Saved.</p>}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
