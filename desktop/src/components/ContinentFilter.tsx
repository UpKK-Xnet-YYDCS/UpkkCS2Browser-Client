import { useMemo } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { useI18n } from '@/hooks/useI18n';

// Continent → sub-region mapping
const continentGeoRegions: Record<string, { value: string; labelKey: string }[]> = {
  AS: [
    { value: 'east_asia', labelKey: 'geoRegionEastAsia' },
    { value: 'southeast_asia', labelKey: 'geoRegionSoutheastAsia' },
    { value: 'south_asia', labelKey: 'geoRegionSouthAsia' },
    { value: 'central_asia', labelKey: 'geoRegionCentralAsia' },
    { value: 'west_asia', labelKey: 'geoRegionWestAsia' },
  ],
  EU: [
    { value: 'west_europe', labelKey: 'geoRegionWestEurope' },
    { value: 'east_europe', labelKey: 'geoRegionEastEurope' },
    { value: 'north_europe', labelKey: 'geoRegionNorthEurope' },
    { value: 'south_europe', labelKey: 'geoRegionSouthEurope' },
  ],
  NA: [
    { value: 'north_america', labelKey: 'geoRegionNorthAmerica' },
    { value: 'central_america', labelKey: 'geoRegionCentralAmerica' },
    { value: 'caribbean', labelKey: 'geoRegionCaribbean' },
  ],
  SA: [
    { value: 'south_america', labelKey: 'geoRegionSouthAmerica' },
  ],
  OC: [
    { value: 'oceania', labelKey: 'geoRegionOceania' },
  ],
  AF: [
    { value: 'north_africa', labelKey: 'geoRegionNorthAfrica' },
    { value: 'sub_saharan_africa', labelKey: 'geoRegionSubSaharanAfrica' },
  ],
};

const continentOptions = [
  { value: 'all', labelKey: 'continentAll' },
  { value: 'AS', labelKey: 'continentAsia' },
  { value: 'EU', labelKey: 'continentEurope' },
  { value: 'NA', labelKey: 'continentNorthAmerica' },
  { value: 'SA', labelKey: 'continentSouthAmerica' },
  { value: 'OC', labelKey: 'continentOceania' },
  { value: 'AF', labelKey: 'continentAfrica' },
] as const;

// Priority country codes: always appear at top of country dropdown
const countryPriority = ['US', 'CN'];

export function ContinentFilter() {
  const { metadataCountries, selectedContinent, selectedGeoRegion, selectedCountry, setSelectedContinent, setSelectedGeoRegion, setSelectedCountry } = useAppStore();
  const { t } = useI18n();

  const geoRegionOptions = selectedContinent !== 'all' ? continentGeoRegions[selectedContinent] || [] : [];

  // Build country options from global metadata API, sorted by count with priority countries first
  const countryOptions = useMemo(() => {
    if (!metadataCountries || metadataCountries.length === 0) return [];
    const countryMap = new Map(metadataCountries.map(c => [c.code, c]));
    const priority = countryPriority.filter(c => countryMap.has(c));
    const others = metadataCountries
      .filter(c => !countryPriority.includes(c.code))
      .map(c => c.code);
    return priority.concat(others).map(code => {
      const info = countryMap.get(code);
      if (!info) return null;
      return { code: info.code, name: info.name, count: info.count };
    }).filter((x): x is { code: string; name: string; count: number } => x !== null);
  }, [metadataCountries]);

  const selectClass = "text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <select
        value={selectedContinent}
        onChange={(e) => setSelectedContinent(e.target.value)}
        className={selectClass}
      >
        {continentOptions.map(({ value, labelKey }) => (
          <option key={value} value={value}>
            {(t as unknown as Record<string, string>)[labelKey] || value}
          </option>
        ))}
      </select>

      {geoRegionOptions.length > 0 && (
        <select
          value={selectedGeoRegion}
          onChange={(e) => setSelectedGeoRegion(e.target.value)}
          className={selectClass}
        >
          <option value="all">{t.geoRegionAll}</option>
          {geoRegionOptions.map(({ value, labelKey }) => (
            <option key={value} value={value}>
              {(t as unknown as Record<string, string>)[labelKey] || value}
            </option>
          ))}
        </select>
      )}

      <select
        value={selectedCountry}
        onChange={(e) => setSelectedCountry(e.target.value)}
        className={selectClass}
      >
        <option value="all">{t.countryAll}</option>
        {countryOptions.map(({ code, name, count }) => (
          <option key={code} value={code}>
            {name} ({count})
          </option>
        ))}
      </select>
    </div>
  );
}
