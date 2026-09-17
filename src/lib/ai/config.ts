import 'server-only';
import { prisma } from '@/lib/db';

export type AiProvider = 'openai' | 'gemini';

export type AiConfig = {
  provider: AiProvider;
  apiKey: string;
  baseUrl: string; // OpenAI-compatible endpoint, e.g. https://api.openai.com/v1
  model: string;
  systemPrompt: string;
  configured: boolean;
};

export const DEFAULT_SYSTEM_PROMPT = [
  'You are an expert technical blog writer for the personal portfolio of Alireza Kiaee,',
  'a full-stack engineer in Toronto specializing in TypeScript, React, Node.js, C#/.NET,',
  'Dynamics 365 F&O, ERP integrations, and e-commerce.',
  'Write in first person as Alireza: practical, direct, engineer-to-engineer.',
  'Produce publication-quality HTML using only these tags: h2, h3, p, ul, ol, li,',
  'strong, em, code, pre, blockquote, a. No h1 (the page renders the title).',
  'No inline styles, no script/style/iframe tags, no images.',
].join(' ');

const AI_SETTING_KEYS = ['ai.provider', 'ai.apiKey', 'ai.baseUrl', 'ai.model', 'ai.systemPrompt'] as const;
export type AiSettingKey = (typeof AI_SETTING_KEYS)[number];

// Resolution order: admin Settings row → environment variable → default.
export async function getAiConfig(): Promise<AiConfig> {
  const rows = await prisma.setting.findMany({ where: { key: { in: [...AI_SETTING_KEYS] } } });
  const get = (k: AiSettingKey) => {
    const v = rows.find((r) => r.key === k)?.value;
    return typeof v === 'string' && v ? v : '';
  };

  const apiKey = get('ai.apiKey') || process.env.AI_API_KEY || '';
  const baseUrl = (get('ai.baseUrl') || process.env.AI_BASE_URL || '').replace(/\/+$/, '');

  // Provider: explicit setting/env wins; otherwise infer from the base URL.
  const explicit = (get('ai.provider') || process.env.AI_PROVIDER || '').toLowerCase();
  const provider: AiProvider =
    explicit === 'gemini' || (!explicit && baseUrl.includes('googleapis.com')) ? 'gemini' : 'openai';

  const defaultBase = provider === 'gemini'
    ? 'https://generativelanguage.googleapis.com/v1beta'
    : 'https://api.openai.com/v1';
  const defaultModel = provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini';

  return {
    provider,
    apiKey,
    baseUrl: baseUrl || defaultBase,
    model: get('ai.model') || process.env.AI_MODEL || defaultModel,
    systemPrompt: get('ai.systemPrompt') || DEFAULT_SYSTEM_PROMPT,
    configured: !!apiKey,
  };
}
