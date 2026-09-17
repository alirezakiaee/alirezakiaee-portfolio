import 'server-only';
import { prisma } from '@/lib/db';

export type AiConfig = {
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

const AI_SETTING_KEYS = ['ai.apiKey', 'ai.baseUrl', 'ai.model', 'ai.systemPrompt'] as const;
export type AiSettingKey = (typeof AI_SETTING_KEYS)[number];

// Resolution order: admin Settings row → environment variable → default.
export async function getAiConfig(): Promise<AiConfig> {
  const rows = await prisma.setting.findMany({ where: { key: { in: [...AI_SETTING_KEYS] } } });
  const get = (k: AiSettingKey) => {
    const v = rows.find((r) => r.key === k)?.value;
    return typeof v === 'string' && v ? v : '';
  };

  const apiKey = get('ai.apiKey') || process.env.AI_API_KEY || '';
  const baseUrl = (get('ai.baseUrl') || process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = get('ai.model') || process.env.AI_MODEL || 'gpt-4o-mini';
  const systemPrompt = get('ai.systemPrompt') || DEFAULT_SYSTEM_PROMPT;

  return { apiKey, baseUrl, model, systemPrompt, configured: !!apiKey };
}
