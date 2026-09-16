import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? 'https://www.alirezakiaee.com';
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/vorudealireza', '/api'] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
