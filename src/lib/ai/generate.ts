import 'server-only';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import type { AiConfig } from './config';

export type GeneratedPost = {
  title: string;
  excerpt: string;
  content: string; // sanitized HTML
  seoTitle: string;
  seoDescription: string;
  suggestedTags: string[];
};

const GeneratedSchema = z.object({
  title: z.string().min(3).max(200),
  excerpt: z.string().max(500).default(''),
  content: z.string().min(50),
  seoTitle: z.string().max(200).default(''),
  seoDescription: z.string().max(300).default(''),
  suggestedTags: z.array(z.string().max(60)).max(10).default([]),
});

const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: ['h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'code', 'pre', 'blockquote', 'a'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
};

const RESPONSE_INSTRUCTIONS = [
  'Respond with ONLY a JSON object (no markdown fences) with keys:',
  '"title" (string), "excerpt" (1-2 sentence string), "content" (HTML string,',
  'at least 3 sections, 600-1200 words), "seoTitle" (<=60 chars),',
  '"seoDescription" (<=155 chars), "suggestedTags" (array of 3-6 short strings).',
].join(' ');

export async function generatePost(opts: {
  config: AiConfig;
  prompt: string;
  topic: string | null;
  model?: string | null;
}): Promise<{ post: GeneratedPost; model: string; promptTokens: number | null; completionTokens: number | null }> {
  const model = opts.model || opts.config.model;
  const userMessage = [
    opts.topic ? `Write a blog post about: ${opts.topic}` : 'Write a blog post on a topic fitting the brief.',
    '',
    `Brief: ${opts.prompt}`,
    '',
    RESPONSE_INSTRUCTIONS,
  ].join('\n');

  let res: Response;
  if (opts.config.provider === 'gemini') {
    // Gemini native generateContent API.
    res = await fetch(
      `${opts.config.baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(opts.config.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: opts.config.systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: { temperature: 0.8, responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(120_000),
      }
    );
  } else {
    // OpenAI-compatible chat/completions API (OpenAI, OpenRouter, Groq, Azure, local).
    res = await fetch(`${opts.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: opts.config.systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(120_000),
    });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`AI API ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const text: string | undefined =
    opts.config.provider === 'gemini'
      ? json?.candidates?.[0]?.content?.parts?.[0]?.text
      : json?.choices?.[0]?.message?.content;
  if (!text) throw new Error('AI API returned no content.');

  let parsed: unknown;
  try {
    // Strip markdown code fences — some models add them despite JSON mode.
    parsed = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  } catch {
    throw new Error('AI response was not valid JSON.');
  }
  const validated = GeneratedSchema.safeParse(parsed);
  if (!validated.success) throw new Error('AI response failed validation.');

  const d = validated.data;
  return {
    post: {
      title: d.title,
      excerpt: d.excerpt,
      content: sanitizeHtml(d.content, SANITIZE_OPTS),
      seoTitle: d.seoTitle,
      seoDescription: d.seoDescription,
      suggestedTags: d.suggestedTags,
    },
    model,
    promptTokens:
      opts.config.provider === 'gemini'
        ? json?.usageMetadata?.promptTokenCount ?? null
        : json?.usage?.prompt_tokens ?? null,
    completionTokens:
      opts.config.provider === 'gemini'
        ? json?.usageMetadata?.candidatesTokenCount ?? null
        : json?.usage?.completion_tokens ?? null,
  };
}
