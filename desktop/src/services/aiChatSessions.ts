export const AI_CHAT_MAX_TURNS = 15;
export const AI_CHAT_MAX_SESSIONS = 40;

const AI_CHAT_SESSIONS_KEY = 'xproj.ai-chat.sessions.v1';

export interface DesktopChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  thinking?: string;
  thinkingOpen?: boolean;
  pending?: boolean;
  tokenInput?: number;
  tokenOutput?: number;
}

export interface AIChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: DesktopChatMessage[];
}

export interface AIChatSessionState {
  sessions: AIChatSession[];
  activeSessionId: string;
}

export interface AIChatSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createAIChatSession(
  defaultTitle: string,
  options: { id?: string; now?: number } = {},
): AIChatSession {
  const now = options.now ?? Date.now();
  return {
    id: options.id ?? createSessionId(now),
    title: defaultTitle,
    createdAt: now,
    updatedAt: now,
    messages: [welcomeMessage()],
  };
}

export function loadAIChatSessionState(
  storage: AIChatSessionStorage | undefined,
  defaultTitle: string,
): AIChatSessionState {
  if (!storage) return stateWithNewSession(defaultTitle);
  try {
    const raw = storage.getItem(AI_CHAT_SESSIONS_KEY);
    if (!raw) return stateWithNewSession(defaultTitle);
    const parsed = JSON.parse(raw) as { sessions?: unknown; activeSessionId?: unknown };
    const sessions = normalizeSessions(parsed.sessions, defaultTitle);
    if (sessions.length === 0) return stateWithNewSession(defaultTitle);
    const requestedActive = typeof parsed.activeSessionId === 'string' ? parsed.activeSessionId : '';
    const activeSessionId = sessions.some(session => session.id === requestedActive)
      ? requestedActive
      : sessions[0].id;
    return { sessions, activeSessionId };
  } catch {
    return stateWithNewSession(defaultTitle);
  }
}

export function saveAIChatSessionState(
  storage: AIChatSessionStorage | undefined,
  state: AIChatSessionState,
): void {
  if (!storage) return;
  try {
    const sessions = state.sessions
      .slice(0, AI_CHAT_MAX_SESSIONS)
      .map(session => ({ ...session, messages: persistentMessages(session.messages) }));
    storage.setItem(AI_CHAT_SESSIONS_KEY, JSON.stringify({ sessions, activeSessionId: state.activeSessionId }));
  } catch {
    // The in-memory session remains usable if storage is unavailable or full.
  }
}

export function deriveAIChatSessionTitle(message: string, fallback: string, maxLength = 34): string {
  const title = message.replace(/\s+/g, ' ').trim();
  if (!title) return fallback;
  const characters = Array.from(title);
  return characters.length <= maxLength ? title : `${characters.slice(0, maxLength).join('')}...`;
}

export function countAIChatTurns(messages: DesktopChatMessage[]): number {
  return messages.reduce((count, message) => count + (message.role === 'user' ? 1 : 0), 0);
}

export function isAIChatSessionFull(messages: DesktopChatMessage[]): boolean {
  return countAIChatTurns(messages) >= AI_CHAT_MAX_TURNS;
}

export function ensureWritableAIChatSession(
  state: AIChatSessionState,
  defaultTitle: string,
  options: { id?: string; now?: number } = {},
): { state: AIChatSessionState; session: AIChatSession; rolledOver: boolean } {
  const active = state.sessions.find(session => session.id === state.activeSessionId) ?? state.sessions[0];
  if (active && !isAIChatSessionFull(active.messages)) {
    return { state, session: active, rolledOver: false };
  }
  const session = createAIChatSession(defaultTitle, options);
  return {
    state: {
      sessions: [session, ...state.sessions].slice(0, AI_CHAT_MAX_SESSIONS),
      activeSessionId: session.id,
    },
    session,
    rolledOver: true,
  };
}

export function updateAIChatSessionMessages(
  sessions: AIChatSession[],
  sessionId: string,
  update: (messages: DesktopChatMessage[]) => DesktopChatMessage[],
  now = Date.now(),
): AIChatSession[] {
  return sessions.map(session => session.id === sessionId
    ? { ...session, messages: update(session.messages), updatedAt: now }
    : session);
}

export function renameAIChatSessionFromMessage(
  sessions: AIChatSession[],
  sessionId: string,
  message: string,
  defaultTitle: string,
): AIChatSession[] {
  return sessions.map(session => session.id === sessionId && countAIChatTurns(session.messages) === 0
    ? { ...session, title: deriveAIChatSessionTitle(message, defaultTitle) }
    : session);
}

function stateWithNewSession(defaultTitle: string): AIChatSessionState {
  const session = createAIChatSession(defaultTitle);
  return { sessions: [session], activeSessionId: session.id };
}

function normalizeSessions(value: unknown, defaultTitle: string): AIChatSession[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, AI_CHAT_MAX_SESSIONS).flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const raw = item as Record<string, unknown>;
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : `restored-${index}`;
    const createdAt = finiteNumber(raw.createdAt, Date.now());
    const updatedAt = finiteNumber(raw.updatedAt, createdAt);
    const messages = normalizeMessages(raw.messages);
    return [{
      id,
      title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : defaultTitle,
      createdAt,
      updatedAt,
      messages: messages.length > 0 ? messages : [welcomeMessage()],
    }];
  });
}

function normalizeMessages(value: unknown): DesktopChatMessage[] {
  if (!Array.isArray(value)) return [];
  const messages = value.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const raw = item as Record<string, unknown>;
    if (raw.role !== 'assistant' && raw.role !== 'user') return [];
    const content = typeof raw.content === 'string' ? raw.content : '';
    if (!content.trim() && raw.id !== 'welcome') return [];
    return [{
      id: typeof raw.id === 'string' && raw.id ? raw.id : `restored-message-${index}`,
      role: raw.role,
      content,
    } satisfies DesktopChatMessage];
  });
  return messages.some(message => message.id === 'welcome') ? messages : [welcomeMessage(), ...messages];
}

function persistentMessages(messages: DesktopChatMessage[]): DesktopChatMessage[] {
  return normalizeMessages(messages.map(({ id, role, content }) => ({ id, role, content })));
}

function welcomeMessage(): DesktopChatMessage {
  return { id: 'welcome', role: 'assistant', content: '' };
}

function finiteNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function createSessionId(now: number): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `chat-${now.toString(36)}-${random}`;
}
