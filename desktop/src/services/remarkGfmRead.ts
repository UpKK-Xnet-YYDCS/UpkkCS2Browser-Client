import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';

interface GfmParserData {
  micromarkExtensions?: ReturnType<typeof gfm>[];
  fromMarkdownExtensions?: ReturnType<typeof gfmFromMarkdown>[];
}

// ReactMarkdown consumes the parsing extensions. Registering serialization
// extensions also pulls the unused Markdown writer into the desktop bundle.
export function remarkGfmRead(this: { data(): unknown }) {
  const data = this.data() as GfmParserData;
  (data.micromarkExtensions ??= []).push(gfm());
  (data.fromMarkdownExtensions ??= []).push(gfmFromMarkdown());
}
