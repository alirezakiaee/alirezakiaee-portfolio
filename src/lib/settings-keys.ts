export const SETTING_KEYS = [
  'site.title',
  'site.tagline',
  'site.description',
  'site.email',
  'site.location',
  'social.github',
  'social.linkedin',
  'social.twitter',
  'seo.defaultTitle',
  'seo.titleTemplate',
  'seo.defaultDescription',
  'seo.defaultOgImage',
  'ai.apiKey',
  'ai.baseUrl',
  'ai.model',
  'ai.systemPrompt',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];
