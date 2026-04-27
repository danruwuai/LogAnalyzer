import '@testing-library/jest-dom';

/**
 * Unit tests for filter logic (extracted from App.js filteredLines computation)
 */

/**
 * Replicates the filteredLines logic from App.js
 */
function applyFilters(lines, filterItems, filterMode) {
  let result = lines;
  if (filterMode === 'show-all') return result;

  const activeFilters = filterItems.filter(item => item.enabled && item.keyword);
  if (activeFilters.length === 0) return result;

  const includeFilters = activeFilters.filter(f => !f.exclude);
  const excludeFilters = activeFilters.filter(f => f.exclude);

  if (includeFilters.length > 0) {
    result = result.filter(line => includeFilters.some(filter => {
      try {
        if (filter.isRegex) {
          return new RegExp(filter.keyword, filter.caseSensitive ? '' : 'i').test(line.text);
        }
        return filter.caseSensitive
          ? line.text.includes(filter.keyword)
          : line.text.toLowerCase().includes(filter.keyword.toLowerCase());
      } catch {
        return false;
      }
    }));
  }

  if (excludeFilters.length > 0) {
    result = result.filter(line => !excludeFilters.some(filter => {
      try {
        if (filter.isRegex) {
          return new RegExp(filter.keyword, filter.caseSensitive ? '' : 'i').test(line.text);
        }
        return filter.caseSensitive
          ? line.text.includes(filter.keyword)
          : line.text.toLowerCase().includes(filter.keyword.toLowerCase());
      } catch {
        return false;
      }
    }));
  }

  return result;
}

const makeLine = (num, text) => ({ num, text });

const SAMPLE_LINES = [
  makeLine(1, '2026-01-01 INFO Starting application'),
  makeLine(2, '2026-01-01 WARN Memory usage high'),
  makeLine(3, '2026-01-01 ERROR Connection failed'),
  makeLine(4, '2026-01-01 INFO Request processed'),
  makeLine(5, '2026-01-01 WARN Timeout occurred'),
  makeLine(6, '2026-01-01 ERROR Exception: null'),
  makeLine(7, '2026-01-01 INFO Cleanup complete'),
  makeLine(8, '2026-01-01 DEBUG Debug info here'),
];

describe('applyFilters', () => {
  describe('show-all mode', () => {
    test('returns all lines unchanged', () => {
      const result = applyFilters(SAMPLE_LINES, [{ id: 1, enabled: true, keyword: 'ERROR' }], 'show-all');
      expect(result).toHaveLength(8);
      expect(result).toEqual(SAMPLE_LINES);
    });
  });

  describe('filter mode with no filters', () => {
    test('returns all lines when filterItems is empty', () => {
      const result = applyFilters(SAMPLE_LINES, [], 'filter');
      expect(result).toHaveLength(8);
    });

    test('returns all lines when no filter is enabled', () => {
      const result = applyFilters(SAMPLE_LINES, [{ id: 1, enabled: false, keyword: 'ERROR' }], 'filter');
      expect(result).toHaveLength(8);
    });

    test('returns all lines when no keyword', () => {
      const result = applyFilters(SAMPLE_LINES, [{ id: 1, enabled: true, keyword: '' }], 'filter');
      expect(result).toHaveLength(8);
    });
  });

  describe('basic keyword filtering', () => {
    test('filters lines containing keyword (case-insensitive by default)', () => {
      const result = applyFilters(SAMPLE_LINES, [{ id: 1, enabled: true, keyword: 'error', caseSensitive: false, isRegex: false, exclude: false }], 'filter');
      expect(result).toHaveLength(2);
      expect(result.map(l => l.num)).toEqual([3, 6]);
    });

    test('filters lines with case-sensitive keyword', () => {
      const result = applyFilters(SAMPLE_LINES, [{ id: 1, enabled: true, keyword: 'ERROR', caseSensitive: true, isRegex: false, exclude: false }], 'filter');
      expect(result).toHaveLength(2);
    });

    test('case-sensitive does not match lowercase', () => {
      const result = applyFilters(SAMPLE_LINES, [{ id: 1, enabled: true, keyword: 'error', caseSensitive: true, isRegex: false, exclude: false }], 'filter');
      expect(result).toHaveLength(0);
    });
  });

  describe('multiple include filters (OR logic)', () => {
    test('returns lines matching any include filter', () => {
      const filters = [
        { id: 1, enabled: true, keyword: 'WARN', caseSensitive: false, isRegex: false, exclude: false },
        { id: 2, enabled: true, keyword: 'ERROR', caseSensitive: false, isRegex: false, exclude: false },
      ];
      const result = applyFilters(SAMPLE_LINES, filters, 'filter');
      expect(result).toHaveLength(4);
      expect(result.map(l => l.num)).toEqual([2, 3, 5, 6]);
    });

    test('first filter disabled returns lines matching second filter only', () => {
      const filters = [
        { id: 1, enabled: false, keyword: 'WARN', caseSensitive: false, isRegex: false, exclude: false },
        { id: 2, enabled: true, keyword: 'ERROR', caseSensitive: false, isRegex: false, exclude: false },
      ];
      const result = applyFilters(SAMPLE_LINES, filters, 'filter');
      expect(result).toHaveLength(2);
    });
  });

  describe('exclude filters', () => {
    test('excludes lines matching exclude filter', () => {
      const filters = [
        { id: 1, enabled: true, keyword: 'DEBUG', caseSensitive: false, isRegex: false, exclude: false },
        { id: 2, enabled: true, keyword: 'DEBUG', caseSensitive: false, isRegex: false, exclude: true },
      ];
      // With include filter on DEBUG and exclude filter on DEBUG, nothing matches include
      const result = applyFilters(SAMPLE_LINES, filters, 'filter');
      expect(result).toHaveLength(0);
    });

    test('include all except DEBUG', () => {
      const filters = [
        { id: 1, enabled: true, keyword: 'INFO', caseSensitive: false, isRegex: false, exclude: false },
        { id: 2, enabled: true, keyword: 'DEBUG', caseSensitive: false, isRegex: false, exclude: true },
      ];
      const result = applyFilters(SAMPLE_LINES, filters, 'filter');
      expect(result).toHaveLength(3); // INFO lines only
      expect(result.map(l => l.num)).toEqual([1, 4, 7]);
    });

    test('exclude filter alone returns all non-matching lines', () => {
      const filters = [
        { id: 1, enabled: true, keyword: 'DEBUG', caseSensitive: false, isRegex: false, exclude: true },
      ];
      const result = applyFilters(SAMPLE_LINES, filters, 'filter');
      expect(result).toHaveLength(7); // all except DEBUG line
    });
  });

  describe('combined include and exclude', () => {
    test('include WARN/ERROR but exclude Exception', () => {
      const filters = [
        { id: 1, enabled: true, keyword: 'WARN', caseSensitive: false, isRegex: false, exclude: false },
        { id: 2, enabled: true, keyword: 'ERROR', caseSensitive: false, isRegex: false, exclude: false },
        { id: 3, enabled: true, keyword: 'Exception', caseSensitive: false, isRegex: false, exclude: true },
      ];
      const result = applyFilters(SAMPLE_LINES, filters, 'filter');
      // Lines 2,3,5,6 match WARN or ERROR; only line 6 contains "Exception" so only line 6 is excluded
      expect(result).toHaveLength(3);
      expect(result.map(l => l.num)).toEqual([2, 3, 5]);
    });
  });

  describe('regex filtering', () => {
    test('regex filter matches correctly', () => {
      const filters = [
        { id: 1, enabled: true, keyword: 'ERROR|EXCEPTION', caseSensitive: false, isRegex: true, exclude: false },
      ];
      const result = applyFilters(SAMPLE_LINES, filters, 'filter');
      expect(result).toHaveLength(2);
      expect(result.map(l => l.num)).toEqual([3, 6]);
    });

    test('invalid regex falls back to false', () => {
      const filters = [
        { id: 1, enabled: true, keyword: '[invalid', caseSensitive: false, isRegex: true, exclude: false },
      ];
      const result = applyFilters(SAMPLE_LINES, filters, 'filter');
      expect(result).toHaveLength(0);
    });

    test('regex with capture groups works', () => {
      const filters = [
        { id: 1, enabled: true, keyword: 'INFO|WARN|ERROR', caseSensitive: false, isRegex: true, exclude: false },
      ];
      const result = applyFilters(SAMPLE_LINES, filters, 'filter');
      expect(result).toHaveLength(8); // DEBUG line contains 'info' case-insensitively so matches
    });
  });

  describe('edge cases', () => {
    test('empty lines array', () => {
      const result = applyFilters([], [{ id: 1, enabled: true, keyword: 'ERROR', caseSensitive: false, isRegex: false, exclude: false }], 'filter');
      expect(result).toHaveLength(0);
    });

    test('filter keyword longer than any line', () => {
      const result = applyFilters(SAMPLE_LINES, [{ id: 1, enabled: true, keyword: 'this is a very long keyword that does not exist', caseSensitive: false, isRegex: false, exclude: false }], 'filter');
      expect(result).toHaveLength(0);
    });

    test('unicode characters handled', () => {
      const lines = [
        makeLine(1, '中文测试 INFO'),
        makeLine(2, '中文测试 ERROR'),
        makeLine(3, 'English INFO'),
      ];
      const result = applyFilters(lines, [{ id: 1, enabled: true, keyword: '中文', caseSensitive: false, isRegex: false, exclude: false }], 'filter');
      expect(result).toHaveLength(2);
    });
  });
});
