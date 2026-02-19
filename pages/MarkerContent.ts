import DOMPurify from 'dompurify';
import { marked } from 'marked';

export type MarkerDoc = {
  slug: string;
  title: string;
  markdown: string;
  html: string;
};

const purifier = DOMPurify;
purifier.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    if (!node.getAttribute('target')) node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'a', 'code', 'pre'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

const sanitizeHtmlSafe = (html: string) =>
  purifier.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });

const rawModules = import.meta.glob('../content/markers/*.md', { as: 'raw', eager: true });

const slugFromPath = (path: string) => {
  const file = path.split('/').pop() || '';
  return file.replace(/\.md$/i, '');
};

export const markerDocs: MarkerDoc[] = Object.entries(rawModules).map(([path, raw]) => {
  const markdown = String(raw || '');
  const slug = slugFromPath(path);
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : slug;
  const html = sanitizeHtmlSafe(marked.parse(markdown));
  return { slug, title, markdown, html };
}).sort((a, b) => a.title.localeCompare(b.title, 'sv'));

export const findMarkerDoc = (slug: string) =>
  markerDocs.find((m) => m.slug.toLowerCase() === slug.toLowerCase());
