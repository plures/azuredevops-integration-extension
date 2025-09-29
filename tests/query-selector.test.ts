import { expect } from 'chai';

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
    description: 'Work items updated in the last 14 days',
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
    /update\s+set/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return { isValid: false, error: 'Query contains potentially dangerous operations' };
    }
  }

  return { isValid: true };
}

// Test query validation
console.log('Testing query validation...');

// Test known query options
const knownQueries = ['My Activity', 'My Work Items', 'Assigned to me', 'Current Sprint'];
knownQueries.forEach((query) => {
  const result = validateQuery(query);
  if (!result.isValid) {
    throw new Error(`Expected query "${query}" to be valid, but got error: ${result.error}`);
  }
});
console.log('✓ Known query options validation passed');

// Test empty queries
const emptyQueries = ['', '   ', null as any, undefined as any];
emptyQueries.forEach((query) => {
  const result = validateQuery(query);
  if (result.isValid) {
    throw new Error(`Expected query "${query}" to be invalid, but it was valid`);
  }
  if (!result.error?.includes('empty')) {
    throw new Error(`Expected error to mention "empty", but got: ${result.error}`);
  }
});
console.log('✓ Empty query validation passed');

// Test short queries
const shortQueries = ['a', 'ab', 'xy'];
shortQueries.forEach((query) => {
  const result = validateQuery(query);
  if (result.isValid) {
    throw new Error(`Expected query "${query}" to be invalid, but it was valid`);
  }
  if (!result.error?.includes('too short')) {
    throw new Error(`Expected error to mention "too short", but got: ${result.error}`);
  }
});
console.log('✓ Short query validation passed');

// Test dangerous SQL patterns
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
  if (result.isValid) {
    throw new Error(`Expected query "${query}" to be invalid, but it was valid`);
  }
  if (!result.error?.includes('dangerous operations')) {
    throw new Error(`Expected error to mention "dangerous operations", but got: ${result.error}`);
  }
});
console.log('✓ Dangerous SQL pattern validation passed');

// Test valid custom queries
const validCustomQueries = [
  'SELECT * FROM WorkItems WHERE State = "Active"',
  'My Custom Query',
  'Work Items for Sprint 1',
  'SELECT [System.Id] FROM WorkItems',
];
validCustomQueries.forEach((query) => {
  const result = validateQuery(query);
  if (!result.isValid) {
    throw new Error(`Expected query "${query}" to be valid, but got error: ${result.error}`);
  }
});
console.log('✓ Valid custom query validation passed');

// Test query options structure
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
  if (!actualValues.includes(expectedValue)) {
    throw new Error(`Expected query option "${expectedValue}" not found`);
  }
});
console.log('✓ All expected query options present');

// Test that all options have descriptions
QUERY_OPTIONS.forEach((option) => {
  if (typeof option.description !== 'string' || option.description.length === 0) {
    throw new Error(`Query option "${option.value}" missing description`);
  }
});
console.log('✓ All query options have descriptions');

// Test unique values
const values = QUERY_OPTIONS.map((option) => option.value);
const uniqueValues = new Set(values);
if (uniqueValues.size !== values.length) {
  throw new Error('Query options have duplicate values');
}
console.log('✓ All query option values are unique');

console.log('All query selector tests passed!');
