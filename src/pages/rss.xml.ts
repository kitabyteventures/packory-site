import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Real RSS feed at /rss.xml (previously this path served a soft-404 homepage copy).
export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://packory.app')).href.replace(/\/$/, '');
  const posts = (await getCollection('blog')).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const items = posts
    .map((p) => {
      const link = `${base}/blog/${p.id}/`;
      return [
        '    <item>',
        `      <title>${esc(p.data.title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        `      <description>${esc(p.data.description)}</description>`,
        `      <pubDate>${new Date(p.data.pubDate).toUTCString()}</pubDate>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Packory Blog</title>
    <link>${base}/blog/</link>
    <description>Packing verification, dispute evidence and e-commerce ops for sellers.</description>
    <language>en-MY</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
