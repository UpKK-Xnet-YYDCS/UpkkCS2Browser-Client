import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { remarkGfmRead } from './remarkGfmRead.ts';

const documents = [
  '# 中文标题\n\nHello **world**, *emphasis*, `code`, and ~~deleted~~.',
  'Visit https://example.com, www.example.org, or user@example.com.',
  '| Left | Center | Right |\n| :--- | :---: | ---: |\n| 中文 | `a\\|b` | **value** |',
  '- [x] Complete\n- [ ] Pending\n  - Nested item\n\n1. First\n2. Second',
  'A footnote[^note] and another reference[^note].\n\n[^note]: First paragraph.\n\n    Second paragraph.',
  '> A quote with ~~deleted~~ text.\n\n```ts\nconst value = "中文";\n```',
  '[link](https://example.com "title")\n\n![image](https://example.com/image.png "alt")\n\n<script>alert(1)</script>',
];

function render(markdown: string, plugin: typeof remarkGfmRead | typeof remarkGfm) {
  return renderToStaticMarkup(createElement(ReactMarkdown, {
    remarkPlugins: [plugin],
    children: markdown,
  }));
}

test('parsing extensions preserve remark-gfm output, including streaming prefixes', () => {
  for (const document of [...documents, documents.join('\n\n')]) {
    for (let end = 0; end <= document.length; end += 1) {
      const prefix = document.slice(0, end);
      assert.equal(render(prefix, remarkGfmRead), render(prefix, remarkGfm), prefix);
    }
  }
});
