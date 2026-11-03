import type { Language } from './types';

export interface AIChatLabels {
  title: string;
  loading: string;
  welcome: string;
  placeholder: string;
  send: string;
  stop: string;
  queue: string;
  retrieving: string;
  processing: string;
  retrying: string;
  grounding: string;
  action: string;
  failed: string;
  thinking: string;
  thinkingDone: string;
  token: string;
  tokenInput: string;
  tokenOutput: string;
  instructions: string;
  instructionsPlaceholder: string;
  resetInstructions: string;
  loginTitle: string;
  loginBody: string;
  conversations: string;
  newChat: string;
  untitledChat: string;
  deleteConversation: string;
  openSidebar: string;
  closeSidebar: string;
  turnCount: string;
  prompts: string[];
}

const labels: Record<Language, AIChatLabels> = {
  en: {
    title: 'AI', loading: 'Loading...', welcome: 'What kind of server do you want to play?', placeholder: 'Ask about servers, maps, regions, or your favorites...', send: 'Send', stop: 'Stop', queue: 'Queued', retrieving: 'Searching server data', processing: 'Preparing response', retrying: 'Reconnecting %d/%d', grounding: 'Server data ready', action: 'Action processed', failed: 'AI could not complete this response.', thinking: 'Thinking', thinkingDone: 'Thought process', token: 'Token', tokenInput: 'Input', tokenOutput: 'Output', instructions: 'Custom instructions', instructionsPlaceholder: 'Response style, preferred modes, regions...', resetInstructions: 'Reset', loginTitle: 'Sign in to use AI', loginBody: 'Use the same cloud account as Favorites and Map Monitor.', conversations: 'Conversations', newChat: 'New chat', untitledChat: 'New chat', deleteConversation: 'Delete conversation', openSidebar: 'Open conversations', closeSidebar: 'Close conversations', turnCount: '%d turns', prompts: ['Quick server summary', 'Find KZ servers and test local latency'],
  },
  ja: {
    title: 'AI', loading: '読み込み中...', welcome: 'どんなサーバーで遊びたいですか？', placeholder: 'サーバー、マップ、地域、お気に入りについて質問...', send: '送信', stop: '停止', queue: '待機中', retrieving: 'サーバーデータを検索中', processing: '回答を準備中', retrying: '再接続 %d/%d', grounding: 'サーバーデータを取得済み', action: '処理完了', failed: 'AIが回答を完了できませんでした。', thinking: '思考中', thinkingDone: '思考過程', token: 'Token', tokenInput: '入力', tokenOutput: '出力', instructions: 'カスタム指示', instructionsPlaceholder: '回答スタイル、好みのモードや地域...', resetInstructions: 'リセット', loginTitle: 'AIにログイン', loginBody: 'お気に入りとマップモニターと同じクラウドアカウントを使用します。', conversations: '会話', newChat: '新しい会話', untitledChat: '新しい会話', deleteConversation: '会話を削除', openSidebar: '会話一覧を開く', closeSidebar: '会話一覧を閉じる', turnCount: '%d ターン', prompts: ['サーバーを要約', 'KZサーバーを探してローカルレイテンシを測定して'],
  },
  'zh-CN': {
    title: 'AI', loading: '加载中...', welcome: '今天想找什么样的服务器？', placeholder: '询问服务器、地图、地区或收藏偏好...', send: '发送', stop: '停止生成', queue: '排队中', retrieving: '正在检索服务器数据', processing: '正在准备回答', retrying: '正在重连 %d/%d', grounding: '服务器数据已就绪', action: '操作状态已更新', failed: 'AI 未能完成本次回答。', thinking: '思考中', thinkingDone: '思考过程', token: 'Token', tokenInput: '输入', tokenOutput: '输出', instructions: '自定义指令', instructionsPlaceholder: '回答风格、偏好模式、地区等...', resetInstructions: '重置', loginTitle: '登录后使用 AI', loginBody: '与云端收藏、地图监控共用同一个云端账号。', conversations: '会话', newChat: '新建会话', untitledChat: '新会话', deleteConversation: '删除会话', openSidebar: '打开会话列表', closeSidebar: '关闭会话列表', turnCount: '%d 轮', prompts: ['快速汇总服务器，包含当前地图预览图', '帮我寻找 KZ 服务器并测试延迟'],
  },
  'zh-TW': {
    title: 'AI', loading: '載入中...', welcome: '今天想找什麼樣的伺服器？', placeholder: '詢問伺服器、地圖、地區或收藏偏好...', send: '傳送', stop: '停止生成', queue: '排隊中', retrieving: '正在檢索伺服器資料', processing: '正在準備回答', retrying: '正在重新連線 %d/%d', grounding: '伺服器資料已就緒', action: '操作狀態已更新', failed: 'AI 未能完成本次回答。', thinking: '思考中', thinkingDone: '思考過程', token: 'Token', tokenInput: '輸入', tokenOutput: '輸出', instructions: '自訂指令', instructionsPlaceholder: '回答風格、偏好模式、地區等...', resetInstructions: '重設', loginTitle: '登入後使用 AI', loginBody: '與雲端收藏、地圖監控共用同一個雲端帳號。', conversations: '對話', newChat: '新增對話', untitledChat: '新對話', deleteConversation: '刪除對話', openSidebar: '開啟對話清單', closeSidebar: '關閉對話清單', turnCount: '%d 輪', prompts: ['快速彙總伺服器，包含目前地圖預覽圖', '尋找 KZ 伺服器並測試本機延遲'],
  },
  ko: {
    title: 'AI', loading: '불러오는 중...', welcome: '오늘은 어떤 서버를 찾고 있나요?', placeholder: '서버, 맵, 지역 또는 즐겨찾기에 대해 질문...', send: '보내기', stop: '생성 중지', queue: '대기 중', retrieving: '서버 데이터 검색 중', processing: '답변 준비 중', retrying: '다시 연결 중 %d/%d', grounding: '서버 데이터 준비 완료', action: '작업 상태 업데이트', failed: 'AI가 답변을 완료하지 못했습니다.', thinking: '생각 중', thinkingDone: '사고 과정', token: 'Token', tokenInput: '입력', tokenOutput: '출력', instructions: '사용자 지정 지침', instructionsPlaceholder: '답변 스타일, 선호 모드, 지역...', resetInstructions: '초기화', loginTitle: '로그인 후 AI 사용', loginBody: '즐겨찾기 및 맵 모니터와 같은 클라우드 계정을 사용합니다.', conversations: '대화', newChat: '새 대화', untitledChat: '새 대화', deleteConversation: '대화 삭제', openSidebar: '대화 목록 열기', closeSidebar: '대화 목록 닫기', turnCount: '%d턴', prompts: ['서버 빠른 요약', 'KZ 서버를 찾아 로컬 지연 테스트'],
  },
};

export function getAIChatLabels(language: Language): AIChatLabels {
  return labels[language];
}
