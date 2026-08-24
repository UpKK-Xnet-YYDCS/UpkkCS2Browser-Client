import { Bot, ChevronDown, Sparkles, UserRound } from 'lucide-react';
import { memo, type ComponentProps, type RefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AITokenMeter } from '@/components/AITokenMeter';
import type { AIChatLabels } from '@/i18n/aiChat';
import type { DesktopChatMessage } from '@/services/aiChatSessions';

interface AIMessageListProps {
  messages: DesktopChatMessage[];
  labels: AIChatLabels;
  status: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  prompts: string[];
  promptDisabled?: boolean;
  onPrompt(prompt: string): void;
  setThinkingOpen(id: string, open: boolean): void;
}

interface AIMessageRowProps {
  message: DesktopChatMessage;
  labels: AIChatLabels;
  setThinkingOpen(id: string, open: boolean): void;
}

const MARKDOWN_PLUGINS: NonNullable<ComponentProps<typeof ReactMarkdown>['remarkPlugins']> = [remarkGfm];
const MARKDOWN_COMPONENTS: NonNullable<ComponentProps<typeof ReactMarkdown>['components']> = {
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 underline dark:text-blue-400">{children}</a>,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
  code: ({ children }) => <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-900">{children}</code>,
  pre: ({ children }) => <pre className="my-2 overflow-auto rounded-md bg-gray-950 p-3 text-xs text-gray-100">{children}</pre>,
};

export function AIMessageList({ messages, labels, status, scrollRef, prompts, promptDisabled, onPrompt, setThinkingOpen }: AIMessageListProps) {
  const visibleMessages = messages.filter(message => message.id !== 'welcome');
  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-3 py-5 sm:px-6" aria-live="polite">
      {visibleMessages.length === 0 ? (
        <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center py-10 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{labels.welcome}</h2>
          <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
            {prompts.map(prompt => (
              <button key={prompt} type="button" onClick={() => onPrompt(prompt)} disabled={promptDisabled} className="min-h-12 rounded-md border border-gray-200 bg-white px-3 py-2.5 text-left text-xs leading-5 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30">
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[820px] space-y-5">
          {visibleMessages.map(message => (
            <AIMessageRow
              key={message.id}
              message={message}
              labels={labels}
              setThinkingOpen={setThinkingOpen}
            />
          ))}
          {status && (
            <div className="ml-11 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {status}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const AIMessageRow = memo(function AIMessageRow({ message, labels, setThinkingOpen }: AIMessageRowProps) {
  const content = message.content;
  const showTokens = message.role === 'assistant' && (
    message.pending
    || typeof message.tokenInput === 'number'
    || typeof message.tokenOutput === 'number'
  );
  const rowClass = message.role === 'user' ? 'flex gap-3 flex-row-reverse' : 'flex gap-3';
  const avatarClass = message.role === 'assistant'
    ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  const bodyClass = message.role === 'user'
    ? 'min-w-0 max-w-[min(680px,86%)] text-right'
    : 'min-w-0 max-w-[calc(100%_-_2.75rem)] flex-1';
  const bubbleClass = message.role === 'user'
    ? 'inline-block max-w-full text-left text-sm leading-6 rounded-lg bg-gray-200/80 px-3.5 py-2.5 text-gray-900 dark:bg-gray-700 dark:text-white'
    : 'inline-block max-w-full text-left text-sm leading-6 py-1 text-gray-800 dark:text-gray-100';
  const tokenLabels = {
    token: labels.token,
    tokenInput: labels.tokenInput,
    tokenOutput: labels.tokenOutput,
  };

  return (
    <article className={rowClass}>
      <span className={avatarClass}>
        {message.role === 'assistant' ? <Bot className="h-4 w-4" aria-hidden="true" /> : <UserRound className="h-4 w-4" aria-hidden="true" />}
      </span>
      <div className={bodyClass}>
        {message.thinking && (
          <details
            open={message.thinkingOpen}
            onToggle={(event) => setThinkingOpen(message.id, event.currentTarget.open)}
            className="mb-2 rounded-md border border-amber-200 bg-amber-50/80 text-left dark:border-amber-900 dark:bg-amber-950/30"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-200">
              <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />{message.pending || !content ? labels.thinking : labels.thinkingDone}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </summary>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap border-t border-amber-200 px-3 py-2 text-xs text-gray-600 dark:border-amber-900 dark:text-gray-300">{message.thinking}</pre>
          </details>
        )}
        <div className={bubbleClass}>
          {message.role === 'assistant' && content ? (
            <ReactMarkdown
              remarkPlugins={MARKDOWN_PLUGINS}
              urlTransform={safeMarkdownUrl}
              components={MARKDOWN_COMPONENTS}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <p>{content || (message.pending ? labels.processing : labels.failed)}</p>
          )}
        </div>
        {showTokens && (
          <div className="mt-1.5">
            <AITokenMeter
              inputTokens={message.tokenInput ?? 0}
              outputTokens={message.tokenOutput ?? 0}
              labels={tokenLabels}
              active={Boolean(message.pending)}
            />
          </div>
        )}
      </div>
    </article>
  );
});

function safeMarkdownUrl(url: string): string {
  if (url.startsWith('/') || url.startsWith('#')) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : '';
  } catch {
    return '';
  }
}
