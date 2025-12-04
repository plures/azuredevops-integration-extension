import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AzureDevOpsIntClient } from './azure-client.js';
import { AzureHttpClient } from './http-client.js';
import { WorkItemsService } from './work-items-service.js';
import type { WorkItem, WorkItemCreateData } from './types.js';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    })),
  },
}));

// Mock dependencies
vi.mock('../../rateLimiter.js', () => {
  return {
    RateLimiter: class {
      wait = vi.fn().mockResolvedValue(undefined);
      acquire = vi.fn().mockResolvedValue(undefined);
    },
  };
});

vi.mock('../../cache.js', () => ({
  workItemCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../../performance.js', () => ({
  measureAsync: vi.fn((fn) => fn),
}));

describe('AzureDevOpsIntClient', () => {
  let client: AzureDevOpsIntClient;

  beforeEach(() => {
    client = new AzureDevOpsIntClient('test-org', 'test-project', 'test-token', 'pat');
  });

  describe('constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(client.organization).toBe('test-org');
      expect(client.project).toBe('test-project');
    });

    it('should create HTTP client and work items service', () => {
      expect(client['httpClient']).toBeInstanceOf(AzureHttpClient);
      expect(client['workItemsService']).toBeInstanceOf(WorkItemsService);
    });
  });

  describe('work items operations', () => {
    it('should delegate getWorkItems to work items service', async () => {
      const mockWorkItems: WorkItem[] = [
        {
          id: 1,
          url: 'https://test.com/1',
          fields: {
            'System.Title': 'Test Work Item',
            'System.State': 'Active',
            'System.AssignedTo': 'Test User',
            'System.WorkItemType': 'Bug',
            'System.ChangedDate': '2023-01-01T00:00:00Z',
          },
        },
      ];

      const getWorkItemsSpy = vi
        .spyOn(client['workItemsService'], 'getWorkItemsByQuery')
        .mockResolvedValue(mockWorkItems as any);

      const result = await client.getWorkItems('My Activity');

      expect(getWorkItemsSpy).toHaveBeenCalledWith('My Activity');
      expect(result).toEqual(mockWorkItems);
    });

    it('should delegate createWorkItem to work items service', async () => {
      const createData: WorkItemCreateData = {
        title: 'New Work Item',
        description: 'Test description',
        assignedTo: 'Test User',
      };

      const mockWorkItem: WorkItem = {
        id: 2,
        url: 'https://test.com/2',
        fields: {
          'System.Title': 'New Work Item',
          'System.State': 'New',
          'System.AssignedTo': 'Test User',
          'System.WorkItemType': 'Bug',
          'System.ChangedDate': '2023-01-01T00:00:00Z',
        },
      };

      const createWorkItemSpy = vi
        .spyOn(client['workItemsService'], 'createWorkItem')
        .mockResolvedValue(mockWorkItem as any);

      const result = await client.createWorkItem(createData);

      expect(createWorkItemSpy).toHaveBeenCalledWith(createData);
      expect(result).toEqual(mockWorkItem);
    });
  });
});
