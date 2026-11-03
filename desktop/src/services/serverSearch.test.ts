import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {defaultSearchConfig, matchesServerSearch, type SearchAlias} from '../../../shared/server-search.ts';
const cases=JSON.parse(readFileSync(new URL('../../../shared/server-search-cases.json',import.meta.url),'utf8')) as {query:string;name:string;fields:string[];expected:boolean;aliases?:SearchAlias[]}[];
for(const fixture of cases)test(`shared search: ${fixture.query} / ${fixture.name}`,()=>assert.equal(matchesServerSearch(fixture.query,fixture.name,fixture.fields,{revision:1,aliases:fixture.aliases??defaultSearchConfig.aliases}),fixture.expected));
