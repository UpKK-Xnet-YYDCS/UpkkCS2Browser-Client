import { useState } from 'react';

export type TabId = 'servers' | 'ai' | 'favorites' | 'monitor' | 'forum' | 'checkin' | 'settings';

export function useTabNavigation(defaultTab: TabId = 'servers') {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  return { activeTab, setActiveTab };
}
