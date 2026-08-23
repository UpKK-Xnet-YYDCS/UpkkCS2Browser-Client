import { useState } from 'react';
import type { Translations } from '@/store/i18n';
import { useCloudAuth } from '@/hooks/useCloudAuth';
import { useFavoritesStore } from '@/hooks/useFavoritesStore';
import { useRuleEditorFavoriteSources } from '@/hooks/useRuleEditorFavoriteSources';
import type { MonitorRule } from '@/services/monitor';
import {
  addUniqueMapPattern,
  toggleSelectedServer,
} from '@/services/ruleEditorServers';
import { RuleEditorMapPatterns } from './RuleEditorMapPatterns';
import { RuleEditorMatchSettings } from './RuleEditorMatchSettings';
import { RuleEditorServerPicker } from './RuleEditorServerPicker';
import { BellIcon, XMarkIcon } from './MonitorIcons';

interface RuleEditorProps {
  rule: MonitorRule;
  onSave: (rule: MonitorRule) => void;
  onCancel: () => void;
  t: Translations;
}

function RuleEditor({ rule, onSave, onCancel, t }: RuleEditorProps) {
  const { isLoggedIn } = useCloudAuth();
  const [editRule, setEditRule] = useState<MonitorRule>({ ...rule });
  const [mapInput, setMapInput] = useState('');
  const [serverSearch, setServerSearch] = useState('');
  const [serverPage, setServerPage] = useState(1);
  const { favorites: localFavorites } = useFavoritesStore();
  const { favoriteServers, loadingFavorites, localServerNames } = useRuleEditorFavoriteSources(isLoggedIn, localFavorites);

  const toggleServerSelection = (serverKey: string) => {
    setEditRule(prev => ({
      ...prev,
      selectedServers: toggleSelectedServer(prev.selectedServers, serverKey),
    }));
  };

  const addMapPattern = () => {
    const pattern = mapInput.trim();
    if (pattern && !editRule.mapPatterns.includes(pattern)) {
      setEditRule(prev => ({ ...prev, mapPatterns: addUniqueMapPattern(prev.mapPatterns, pattern) }));
      setMapInput('');
    }
  };

  const removeMapPattern = (pattern: string) => {
    setEditRule(prev => ({ ...prev, mapPatterns: prev.mapPatterns.filter(p => p !== pattern) }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BellIcon />
            {editRule.id === rule.id && rule.name ? t.monitorEditRule : t.monitorNewRule}
          </h2>
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <XMarkIcon />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.monitorRuleName}
            </label>
            <input
              type="text"
              value={editRule.name}
              onChange={e => setEditRule(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t.monitorRuleNamePlaceholder}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <RuleEditorServerPicker
            t={t}
            selectedServers={editRule.selectedServers}
            serverSearch={serverSearch}
            onSearchChange={(value) => { setServerSearch(value); setServerPage(1); }}
            loadingFavorites={loadingFavorites}
            favoriteServers={favoriteServers}
            localFavorites={localFavorites}
            localServerNames={localServerNames}
            serverPage={serverPage}
            onPageChange={setServerPage}
            onToggle={toggleServerSelection}
          />

          <RuleEditorMapPatterns
            t={t}
            mapInput={mapInput}
            mapPatterns={editRule.mapPatterns}
            onMapInputChange={setMapInput}
            onAdd={addMapPattern}
            onRemove={removeMapPattern}
          />

          <RuleEditorMatchSettings t={t} editRule={editRule} setEditRule={setEditRule} />
        </div>
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => onSave(editRule)}
            disabled={!editRule.name.trim() || editRule.mapPatterns.length === 0}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
          >
            {t.monitorSaveRule}
          </button>
        </div>
      </div>
    </div>
  );
}

export { RuleEditor };

