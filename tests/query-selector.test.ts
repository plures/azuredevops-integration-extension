import { describe, it, expect } from 'vitest';

// Mock the query options and functions from main.ts
const QUERY_OPTIONS = [
  {
    value: 'My Activity',
    label: 'My Activity',
    description: "Work items I've created, assigned to, or recently changed",
  },
  {
    value: 'My Work Items',
    label: 'My Work Items',
    description: 'Work items currently assigned to me',
  },
  {
    value: 'Assigned to me',
    label: 'Assigned to me',
    description: 'Work items currently assigned to me',
  },
  {
    value: 'Current Sprint',
    label: 'Current Sprint',
    description: 'Work items in the current iteration',
  },
  { value: 'All Active', label: 'All Active', description: 'All active work items in the project' },
  {
    value: 'Recently Updated',
    label: 'Recently Updated',
    description: 'Work items updated in the last 3 days',
  },
  { value: 'Following', label: 'Following', description: "Work items I'm following" },
  { value: 'Mentioned', label: 'Mentioned', description: "Work items where I've been mentioned" },
];

// Test functions (copied from main.ts for testing)
function validateQuery(query: string): { isValid: boolean; error?: string } {
  if (!query || typeof query !== 'string') {
    return { isValid: false, error: 'Query cannot be empty' };
  }

  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Query cannot be empty' };
  }

  // Check if it's a known query option
  const knownQuery = QUERY_OPTIONS.find((option) => option.value === trimmed);
  if (knownQuery) {
    return { isValid: true };
  }

  // For custom queries, do basic validation
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Query too short' };
  }

  // Check for potentially dangerous SQL patterns (basic security check)
  const dangerousPatterns = [
    /drop\s+table/i,
    /delete\s+from/i,
    /truncate\s+table/i,
    /alter\s+table/i,
    /create\s+table/i,
    /insert\s+into/i,
    /update\s+.+\s+set/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return { isValid: false, error: 'Query contains potentially dangerous operations' };
    }
  }

  return { isValid: true };
}

describe('Query Selector', () => {
  it('should validate known query options', () => {
    const knownQueries = ['My Activity', 'My Work Items', 'Assigned to me', 'Current Sprint'];
    knownQueries.forEach((query) => {
      const result = validateQuery(query);
      expect(result.isValid, `Expected query "${query}" to be valid`).toBe(true);
    });
  });

  it('should invalidate empty queries', () => {
    const emptyQueries = ['', '   ', null as any, undefined as any];
    emptyQueries.forEach((query) => {
      const result = validateQuery(query);
      expect(result.isValid, `Expected query "${query}" to be invalid`).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  it('should invalidate short queries', () => {
    const shortQueries = ['a', 'ab', 'xy'];
    shortQueries.forEach((query) => {
      const result = validateQuery(query);
      expect(result.isValid, `Expected query "${query}" to be invalid`).toBe(false);
      expect(result.error).toContain('too short');
    });
  });

  it('should invalidate dangerous SQL patterns', () => {
    const dangerousQueries = [
      'DROP TABLE WorkItems',
      'DELETE FROM WorkItems',
      'TRUNCATE TABLE WorkItems',
      'ALTER TABLE WorkItems',
      'CREATE TABLE WorkItems',
      'INSERT INTO WorkItems',
      'UPDATE WorkItems SET',
    ];
    dangerousQueries.forEach((query) => {
      const result = validateQuery(query);
      expect(result.isValid, `Expected query "${query}" to be invalid`).toBe(false);
      expect(result.error).toContain('dangerous operations');
    });
  });

  it('should validate valid custom queries', () => {
    const validCustomQueries = [
      'SELECT * FROM WorkItems WHERE State = "Active"',
      'My Custom Query',
      'Work Items for Sprint 1',
      'SELECT [System.Id] FROM WorkItems',
    ];
    validCustomQueries.forEach((query) => {
      const result = validateQuery(query);
      expect(result.isValid, `Expected query "${query}" to be valid`).toBe(true);
    });
  });

  it('should have all expected query options', () => {
    const expectedValues = [
      'My Activity',
      'My Work Items',
      'Assigned to me',
      'Current Sprint',
      'All Active',
      'Recently Updated',
      'Following',
      'Mentioned',
    ];

    const actualValues = QUERY_OPTIONS.map((option) => option.value);
    expectedValues.forEach((expectedValue) => {
      expect(actualValues).toContain(expectedValue);
    });
  });

  it('should have descriptions for all options', () => {
    QUERY_OPTIONS.forEach((option) => {
      expect(option.description).toBeDefined();
      expect(option.description.length).toBeGreaterThan(0);
    });
  });

  it('should have unique values', () => {
    const values = QUERY_OPTIONS.map((option) => option.value);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});
