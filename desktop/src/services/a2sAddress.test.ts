import assert from 'node:assert/strict';
import test from 'node:test';
import { isDomainName, isIPv4, parseServerAddress } from './a2sAddress.ts';

test('parseServerAddress accepts IPv4 and domain hosts with a valid port', () => {
  assert.deepEqual(parseServerAddress(' 1.2.3.4:27015 '), { ip: '1.2.3.4', port: '27015' });
  assert.deepEqual(parseServerAddress('example.com:27015'), { ip: 'example.com', port: '27015' });
  assert.deepEqual(parseServerAddress('game-1.example.co:1'), { ip: 'game-1.example.co', port: '1' });
});

test('parseServerAddress rejects empty, extra-colon, and out-of-range values', () => {
  assert.equal(parseServerAddress(''), null);
  assert.equal(parseServerAddress('1.2.3.4'), null);
  assert.equal(parseServerAddress('1.2.3.4:27015:1'), null);
  assert.equal(parseServerAddress('1.2.3.4:0'), null);
  assert.equal(parseServerAddress('1.2.3.4:65536'), null);
  assert.equal(parseServerAddress(':27015'), null);
  assert.equal(parseServerAddress('1.2.3.4:'), null);
});

test('malformed dotted numbers are not accepted as domains', () => {
  assert.equal(isIPv4('1.2.3.4'), true);
  assert.equal(isIPv4('1.2.3'), false);
  assert.equal(isIPv4('01.2.3.4'), false);
  assert.equal(isDomainName('example.com'), true);
  assert.equal(isDomainName('1.2.3.4'), false);
  assert.equal(isDomainName('1.2.3'), false);
  assert.equal(parseServerAddress('1.2.3:27015'), null);
  assert.equal(parseServerAddress('01.2.3.4:27015'), null);
});
