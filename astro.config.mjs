import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';

// lastmod per blog post from its pubDate (content collection frontmatter).
// Google re-fetches sitemaps and uses lastmod to spot new/changed URLs.
const BLOG_DIR = './src/content/blog';
const lastmodByPath = {};
if (fs.existsSync(BLOG_DIR)) {
  for (const file of fs.readdirSync(BLOG_DIR)) {
    if (!/\.mdx?$/.test(file)) continue;
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
    const m = raw.match(/^pubDate:\s*['"]?(\d{4}-\d{2}-\d{2})/m);
    if (m) lastmodByPath[`/blog/${file.replace(/\.mdx?$/, '')}/`] = new Date(m[1]).toISOString();
  }
}

export default defineConfig({
  site: 'https://packory.app',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/rss.xml'),
      serialize(item) {
        const p = new URL(item.url).pathname;
        if (lastmodByPath[p]) item.lastmod = lastmodByPath[p];
        return item;
      },
    }),
  ],
});
