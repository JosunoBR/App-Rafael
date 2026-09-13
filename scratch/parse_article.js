const fs = require('fs');

const raw = fs.readFileSync('C:/Users/Josué/.gemini/antigravity-ide/brain/b602958c-4313-405a-83e7-7d7d9ec57c50/.system_generated/steps/39/content.md', 'utf-8');

// Strip script and style tags
let cleaned = raw.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

// Extract images
const imgRegex = /<img[^>]+src="([^">]+)"(?:[^>]+alt="([^">]*)")?/gi;
let match;
const images = [];
while ((match = imgRegex.exec(cleaned)) !== null) {
  images.push({ src: match[1], alt: match[2] || '' });
}

// Convert tags like <p>, <h1>-<h6>, <li> to line breaks
let text = cleaned
  .replace(/<(?:h[1-6]|p|li|tr|div)[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\n\s*\n/g, '\n')
  .trim();

fs.writeFileSync('scratch/article_clean.txt', text, 'utf-8');
fs.writeFileSync('scratch/article_images.json', JSON.stringify(images, null, 2), 'utf-8');
console.log('Done! Text length:', text.length, 'Images found:', images.length);
