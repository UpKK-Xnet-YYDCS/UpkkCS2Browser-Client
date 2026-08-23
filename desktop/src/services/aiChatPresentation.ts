import type { AIChatEvent } from './aiChat.ts';
import type { DesktopChatMessage } from './aiChatSessions.ts';
import { estimateAIChatOutputTokens } from '../utils/aiTokens.ts';

export function applyAIChatAssistantEvent(message: DesktopChatMessage, event: AIChatEvent): DesktopChatMessage {
  switch (event.type) {
    case 'message': {
      const content = message.content + String(event.content ?? '');
      return {
        ...message,
        content,
        pending: false,
        tokenOutput: estimateAIChatOutputTokens(content, message.thinking ?? ''),
      };
    }
    case 'thinking': {
      const thinking = (message.thinking ?? '') + String(event.content ?? '');
      return {
        ...message,
        thinking,
        thinkingOpen: true,
        pending: false,
        tokenOutput: estimateAIChatOutputTokens(message.content, thinking),
      };
    }
    case 'reset': return { ...message, content: '', thinking: '', thinkingOpen: false, pending: true, tokenOutput: 0 };
    case 'complete': return { ...message, pending: false, thinkingOpen: false };
    case 'retry': return { ...message, pending: true };
    default: return message;
  }
}

export function updateAIChatMessage(
  messages: DesktopChatMessage[],
  id: string,
  update: (message: DesktopChatMessage) => DesktopChatMessage,
): DesktopChatMessage[] {
  let found = false;
  const updated = messages.map(message => {
    if (message.id !== id) return message;
    found = true;
    return update(message);
  });
  return found ? updated : messages;
}

import type { Language } from '../i18n/types.ts';
import type { AIChatSessionStorage } from './aiChatSessions.ts';

export const INSTRUCTIONS_KEY = 'xproj.ai-chat.instructions.v1';

export function readInstructions(): string {
  try {
    return localStorage.getItem(INSTRUCTIONS_KEY) ?? '';
  } catch {
    return '';
  }
}

export function getChatStorage(): AIChatSessionStorage | undefined {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
}

export function formatRetry(template: string, attempt: number, max: number): string {
  return template.replace('%d', String(attempt)).replace('%d', String(max));
}

export const localStatuses = {
  en: { measuring: 'Measuring local A2S latency...', failed: 'Local latency test failed', resolving: 'Verifying server...', confirmJoin: 'Choose how you want to join in the confirmation dialog.', chooseServer: 'Several servers matched. Choose one from the server list.', unresolved: 'I could not identify one server. Use its full name or address.', unavailable: 'This address cannot be joined because local A2S verification failed: %s' },
  ja: { measuring: 'ローカルA2Sレイテンシを測定中...', failed: 'ローカル測定に失敗しました', resolving: 'サーバーを確認中...', confirmJoin: '確認ダイアログで接続方法を選択してください。', chooseServer: '複数のサーバーが一致しました。リストから1つ選択してください。', unresolved: 'サーバーを1つに特定できませんでした。完全な名前またはアドレスを入力してください。', unavailable: 'ローカルA2S確認に失敗したため接続できません: %s' },
  'zh-CN': { measuring: '正在测试本地 A2S 延迟...', failed: '本地延迟测试失败', resolving: '正在验证服务器...', confirmJoin: '请在确认对话框中选择加入方式。', chooseServer: '匹配到多个服务器，请从候选列表中选择一个。', unresolved: '无法唯一确定服务器，请使用完整名称或地址。', unavailable: '本机 A2S 验证失败，不能加入该地址：%s' },
  'zh-TW': { measuring: '正在測試本機 A2S 延遲...', failed: '本機延遲測試失敗', resolving: '正在驗證伺服器...', confirmJoin: '請在確認對話框中選擇加入方式。', chooseServer: '匹配到多個伺服器，請從候選清單中選擇一個。', unresolved: '無法唯一確定伺服器，請使用完整名稱或位址。', unavailable: '本機 A2S 驗證失敗，不能加入該位址：%s' },
  ko: { measuring: '로컬 A2S 지연 측정 중...', failed: '로컬 지연 테스트 실패', resolving: '서버 확인 중...', confirmJoin: '확인 대화상자에서 접속 방법을 선택하세요.', chooseServer: '여러 서버가 일치합니다. 후보 목록에서 하나를 선택하세요.', unresolved: '서버를 하나로 식별할 수 없습니다. 전체 이름이나 주소를 입력하세요.', unavailable: '로컬 A2S 확인에 실패하여 이 주소에 접속할 수 없습니다: %s' },
} as const;

export function localToolStatus(language: Language, key: keyof typeof localStatuses.en): string {
  return localStatuses[language][key];
}

export function formatLocalStatus(language: Language, key: keyof typeof localStatuses.en, detail: string): string {
  return localToolStatus(language, key).replace('%s', detail);
}
