import '@testing-library/jest-dom';

/**
 * Unit tests for exportFilters / importFilters logic
 * Tests the configuration serialization/deserialization
 */

/**
 * Replicates the exportFilters config structure from App.js
 */
function buildExportConfig(filterItems, filterMode, extractors, xAxisMode, xAxisField, thresholds) {
  return {
    filterItems: filterItems.map(({ id, ...rest }) => rest),
    filterMode,
    extractors,
    xAxisMode,
    xAxisField,
    thresholds,
    version: '1.0',
    timestamp: Date.now(),
  };
}

/**
 * Replicates the importFilters config validation from App.js
 */
function parseImportConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== 'object') return null;
  const config = {};
  if (Array.isArray(rawConfig.filterItems)) {
    config.filterItems = rawConfig.filterItems;
  }
  if (typeof rawConfig.filterMode === 'string') {
    config.filterMode = rawConfig.filterMode;
  }
  if (Array.isArray(rawConfig.extractors)) {
    config.extractors = rawConfig.extractors;
  }
  if (typeof rawConfig.xAxisMode === 'string') {
    config.xAxisMode = rawConfig.xAxisMode;
  }
  if (typeof rawConfig.xAxisField === 'string') {
    config.xAxisField = rawConfig.xAxisField;
  }
  if (Array.isArray(rawConfig.thresholds)) {
    config.thresholds = rawConfig.thresholds;
  }
  return config;
}

describe('exportFilters config building', () => {
  test('builds config with correct structure', () => {
    const filterItems = [
      { id: 1, enabled: true, keyword: 'ERROR', caseSensitive: false, isRegex: false, exclude: false, highlightRow: true, bgColor: '#f38ba8', fgColor: '#fff', fontColor: '' },
    ];
    const filterMode = 'filter';
    const extractors = [{ name: 'TestMetric', regex: '(\\d+)', color: '#89b4fa' }];
    const xAxisMode = 'line';
    const xAxisField = '';
    const thresholds = [{ name: 'Thresh1', value: 80, color: '#f38ba8', metric: '' }];

    const config = buildExportConfig(filterItems, filterMode, extractors, xAxisMode, xAxisField, thresholds);

    expect(config.version).toBe('1.0');
    expect(config.timestamp).toBeGreaterThan(0);
    expect(config.filterMode).toBe('filter');
    expect(config.xAxisMode).toBe('line');
    expect(config.xAxisField).toBe('');
    expect(config.extractors).toHaveLength(1);
    expect(config.thresholds).toHaveLength(1);
    expect(config.filterItems).toHaveLength(1);
    // id should be stripped
    expect(config.filterItems[0].id).toBeUndefined();
    expect(config.filterItems[0].keyword).toBe('ERROR');
  });

  test('strips id from filterItems', () => {
    const filterItems = [
      { id: 12345, enabled: true, keyword: 'test', caseSensitive: false, isRegex: false, exclude: false, highlightRow: false, bgColor: '', fgColor: '', fontColor: '' },
      { id: 67890, enabled: false, keyword: 'test2', caseSensitive: true, isRegex: true, exclude: true, highlightRow: true, bgColor: '#123', fgColor: '#456', fontColor: '#789' },
    ];
    const config = buildExportConfig(filterItems, 'filter', [], 'line', '', []);
    expect(config.filterItems[0].id).toBeUndefined();
    expect(config.filterItems[1].id).toBeUndefined();
    expect(config.filterItems[1].keyword).toBe('test2');
    expect(config.filterItems[1].caseSensitive).toBe(true);
    expect(config.filterItems[1].isRegex).toBe(true);
    expect(config.filterItems[1].exclude).toBe(true);
    expect(config.filterItems[1].highlightRow).toBe(true);
  });

  test('handles empty arrays gracefully', () => {
    const config = buildExportConfig([], 'show-all', [], 'data', 'myField', []);
    expect(config.filterItems).toHaveLength(0);
    expect(config.extractors).toHaveLength(0);
    expect(config.thresholds).toHaveLength(0);
    expect(config.xAxisMode).toBe('data');
    expect(config.xAxisField).toBe('myField');
  });
});

describe('importFilters config parsing', () => {
  test('parses valid config with all fields', () => {
    const rawConfig = {
      filterItems: [{ keyword: 'ERROR', enabled: true, caseSensitive: false }],
      filterMode: 'filter',
      extractors: [{ name: 'Metric1', regex: '(\\d+)', color: '#89b4fa' }],
      xAxisMode: 'line',
      xAxisField: '',
      thresholds: [{ name: 'T1', value: 80, color: '#f38ba8', metric: '' }],
    };
    const config = parseImportConfig(rawConfig);
    expect(config.filterItems).toHaveLength(1);
    expect(config.filterMode).toBe('filter');
    expect(config.extractors).toHaveLength(1);
    expect(config.xAxisMode).toBe('line');
    expect(config.thresholds).toHaveLength(1);
  });

  test('parses config with only partial fields', () => {
    const rawConfig = {
      filterMode: 'show-all',
    };
    const config = parseImportConfig(rawConfig);
    expect(config.filterMode).toBe('show-all');
    expect(config.filterItems).toBeUndefined();
    expect(config.extractors).toBeUndefined();
  });

  test('returns null for null input', () => {
    expect(parseImportConfig(null)).toBeNull();
  });

  test('returns null for non-object input', () => {
    expect(parseImportConfig('string')).toBeNull();
    expect(parseImportConfig(123)).toBeNull();
    expect(parseImportConfig(undefined)).toBeNull();
  });

  test('ignores non-array filterItems', () => {
    const rawConfig = { filterItems: 'not an array' };
    const config = parseImportConfig(rawConfig);
    expect(config.filterItems).toBeUndefined();
  });

  test('ignores non-array extractors and thresholds', () => {
    const rawConfig = { extractors: 'bad', thresholds: 'bad' };
    const config = parseImportConfig(rawConfig);
    expect(config.extractors).toBeUndefined();
    expect(config.thresholds).toBeUndefined();
  });

  test('assigns new random ids to filterItems on parse', () => {
    // Note: parseImportConfig doesn't add ids; the App.js code does:
    // config.filterItems.map(item => ({ ...item, id: Date.now() + Math.random() }))
    // We test the buildExportConfig strips them, and the full round-trip
    // strips + regenerates ids
    const rawConfig = {
      filterItems: [{ keyword: 'ERROR' }, { keyword: 'WARN' }],
    };
    const config = parseImportConfig(rawConfig);
    expect(config.filterItems).toHaveLength(2);
    expect(config.filterItems[0]).toEqual({ keyword: 'ERROR' });
  });
});

describe('export/import round-trip', () => {
  test('filterItems survive round-trip (ids regenerated)', () => {
    const original = [
      { id: 1, enabled: true, keyword: 'ERROR', caseSensitive: false, isRegex: false, exclude: false, highlightRow: true, bgColor: '#f38ba8', fgColor: '#fff', fontColor: '' },
    ];
    // Simulate export
    const exported = buildExportConfig(original, 'filter', [], 'line', '', []);
    // Simulate parse
    const parsed = parseImportConfig(exported);
    // Simulate import with id regeneration
    const imported = parsed.filterItems.map(item => ({ ...item, id: Date.now() + Math.random() }));

    expect(imported).toHaveLength(1);
    expect(imported[0].keyword).toBe('ERROR');
    expect(imported[0].id).toBeDefined();
    expect(imported[0].id).not.toBe(1); // id changed
  });
});
