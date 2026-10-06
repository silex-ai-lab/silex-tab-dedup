import { describe, expect, it } from 'vitest';
import { groupByHost, searchTabs } from '../../src/core/search.js';

const items = [
  { title: 'Pull requests · silex', url: 'https://github.com/pulls' },
  { title: 'Gmail - Inbox', url: 'https://mail.google.com/mail/u/0/#inbox' },
  { title: 'Docs', url: 'https://www.github.com/docs/pull-guide' },
  { title: 'Weather', url: 'https://weather.example/today' },
];

describe('searchTabs', () => {
  it('needs every term and ranks title hits first', () => {
    expect(searchTabs(items, 'pull').map((i) => i.title)).toEqual(['Pull requests · silex', 'Docs']);
    expect(searchTabs(items, 'github pull').map((i) => i.title)).toEqual(['Pull requests · silex', 'Docs']);
    expect(searchTabs(items, 'INBOX gmail').map((i) => i.title)).toEqual(['Gmail - Inbox']);
    expect(searchTabs(items, 'nothing')).toEqual([]);
    expect(searchTabs(items, '   ')).toEqual([]);
  });
  it('ignores the scheme and www when matching URL prefixes', () => {
    expect(searchTabs(items, 'github.com/docs').map((i) => i.title)).toEqual(['Docs']);
  });
});

describe('groupByHost', () => {
  it('groups by host without www, biggest first', () => {
    const groups = groupByHost([...items, { title: 'x', url: 'chrome://settings/' }, { title: 'bad', url: 'nope' }]);
    expect(groups[0]).toMatchObject({ host: 'github.com' });
    expect(groups[0].tabs).toHaveLength(2);
    expect(groups.map((g) => g.host)).toContain('settings');
    expect(groups.map((g) => g.host)).toContain('?');
  });
});
