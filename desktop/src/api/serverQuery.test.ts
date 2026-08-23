import assert from 'node:assert/strict';
import test from 'node:test';
import { buildServerListEndpoint, gameQueryValue, geoQueryFields } from './serverQuery.ts';

test('geoQueryFields omits all-values and keeps explicit filters', () => {
  assert.deepEqual(geoQueryFields(), { continent: undefined, geo_region: undefined, country: undefined });
  assert.deepEqual(geoQueryFields({ continent: 'all', geo_region: 'all', country: 'all' }), {
    continent: undefined, geo_region: undefined, country: undefined,
  });
  assert.deepEqual(geoQueryFields({ continent: 'EU', geo_region: 'west', country: 'de' }), {
    continent: 'EU', geo_region: 'west', country: 'de',
  });
  assert.equal(gameQueryValue('all'), undefined);
  assert.equal(gameQueryValue('cs2'), 'cs2');
});

test('buildServerListEndpoint keeps search, category and default paths', () => {
  assert.equal(
    buildServerListEndpoint({ searchQuery: 'kz a', selectedRegion: 'cn', page: 2, perPage: 20, selectedGameType: 'cs2' }),
    '/api/servers/search?q=kz%20a&region=cn&page=2&per_page=20&game=cs2',
  );
  assert.equal(
    buildServerListEndpoint({ selectedCategory: 'ze', selectedRegion: 'all', selectedGameType: 'all', geoFilter: { country: 'jp' } }),
    '/api/servers/by-category?category=ze&region=all&country=jp',
  );
  assert.equal(
    buildServerListEndpoint({ selectedRegion: 'global', page: 1 }),
    '/api/servers?region=global&page=1',
  );
});
