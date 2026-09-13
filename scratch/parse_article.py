import re
from bs4 import BeautifulSoup

with open(r'C:\Users\Josué\.gemini\antigravity-ide\brain\b602958c-4313-405a-83e7-7d7d9ec57c50\.system_generated\steps\39\content.md', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

soup = BeautifulSoup(text, 'html.parser')
content_div = soup.find('div', class_=re.compile(r'betterdocs-entry-content|entry-content|post-content'))
if not content_div:
    content_div = soup.find('article')

with open('scratch/article_text.txt', 'w', encoding='utf-8') as out:
    target = content_div if content_div else soup
    for el in target.find_all(['h1', 'h2', 'h3', 'h4', 'p', 'li', 'table', 'img']):
        if el.name == 'img':
            src = el.get('src') or el.get('data-src') or ''
            alt = el.get('alt') or ''
            out.write(f"\n[IMG]: {src} | Alt: {alt}\n")
        elif el.name == 'table':
            out.write(f"\n[TABLE]:\n{el.get_text(' | ', strip=True)}\n")
        else:
            txt = el.get_text(' ', strip=True)
            if txt:
                out.write(f"{el.name.upper()}: {txt}\n")

print("Finished parsing article.")
