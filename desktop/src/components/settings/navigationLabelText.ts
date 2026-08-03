import type { Language } from '@/store/i18n';

interface NavigationLabelText {
  title: string;
  description: string;
}

export const navigationLabelText: Record<Language, NavigationLabelText> = {
  en: {
    title: 'Top navigation labels',
    description: 'Show text beside the navigation icons',
  },
  ja: {
    title: '上部ナビゲーションのラベル',
    description: 'ナビゲーションアイコンの横にテキストを表示',
  },
  'zh-CN': {
    title: '顶部导航文字',
    description: '在导航图标旁显示文字，默认仅显示图标',
  },
  'zh-TW': {
    title: '頂部導覽文字',
    description: '在導覽圖示旁顯示文字，預設僅顯示圖示',
  },
  ko: {
    title: '상단 탐색 텍스트',
    description: '탐색 아이콘 옆에 텍스트 표시',
  },
};
