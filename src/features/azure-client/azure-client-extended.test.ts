import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AzureDevOpsIntClient } from './azure-client.js';
import type { WorkItem as _WorkItem, WorkItemCreateData as _WorkItemCreateData } from './types.js';

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
vi.mock('../../rateLimiter.js', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    wait: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../cache.js', () => ({
  workItemCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../../performance.js', () => ({
  measureAsync: vi.fn((fn) => fn),
}));

describe('AzureDevOpsIntClient Authentication', () => {
  let client: AzureDevOpsIntClient;
  let mockHttpClient: any;

  beforeEach(() => {
    client = new AzureDevOpsIntClient('test-org', 'test-project', 'test-token', 'pat');
    mockHttpClient = client['httpClient'];
  });

  it('should get authenticated identity', async () => {
    const mockIdentity = {
      id: 'test-id',
      displayName: 'Test User',
      uniqueName: 'test@example.com',
      descriptor: 'test-descriptor',
    };

    mockHttpClient.get.mockResolvedValue({
      data: {
        authenticatedUser: mockIdentity,
      },
    });

    const result = await client.getAuthenticatedIdentity();

    expect(mockHttpClient.get).toHaveBeenCalledWith('/connectionData');
    expect(result).toEqual(mockIdentity);
    expect(client['cachedIdentity']).toEqual(mockIdentity);
  });

  it('should return cached identity if available', async () => {
    const cachedIdentity = {
      id: 'cached-id',
      displayName: 'Cached User',
      uniqueName: 'cached@example.com',
      descriptor: 'cached-descriptor',
    };

    client['cachedIdentity'] = cachedIdentity;

    const result = await client.getAuthenticatedIdentity();

    expect(result).toEqual(cachedIdentity);
    expect(mockHttpClient.get).not.toHaveBeenCalled();
  });
});

describe('AzureDevOpsIntClient Repositories', () => {
  let client: AzureDevOpsIntClient;
  let mockHttpClient: any;

  beforeEach(() => {
    client = new AzureDevOpsIntClient('test-org', 'test-project', 'test-token', 'pat');
    mockHttpClient = client['httpClient'];
  });

  it('should get repositories', async () => {
    const mockRepos = [
      {
        id: 'repo-1',
        name: 'test-repo',
        url: 'https://test.com/repo-1',
        defaultBranch: 'main',
      },
    ];

    mockHttpClient.get.mockResolvedValue({
      data: {
        value: [
          {
            id: 'repo-1',
            name: 'test-repo',
            url: 'https://test.com/repo-1',
            defaultBranch: 'main',
          },
        ],
      },
    });

    const result = await client.getRepositories();

    expect(mockHttpClient.get).toHaveBeenCalledWith('/git/repositories');
    expect(result).toEqual(mockRepos);
  });

  it('should return cached repositories if available', async () => {
    const cachedRepos = [
      {
        id: 'cached-repo',
        name: 'cached-repo',
        url: 'https://test.com/cached-repo',
        defaultBranch: 'main',
      },
    ];

    client['_repoCache'] = cachedRepos;

    const result = await client.getRepositories();

    expect(result).toEqual(cachedRepos);
    expect(mockHttpClient.get).not.toHaveBeenCalled();
  });
});

describe('AzureDevOpsIntClient Utility Methods', () => {
  let client: AzureDevOpsIntClient;
  let mockHttpClient: any;

  beforeEach(() => {
    client = new AzureDevOpsIntClient('test-org', 'test-project', 'test-token', 'pat');
    mockHttpClient = client['httpClient'];
  });

  it('should update credential', () => {
    const updateCredentialSpy = vi.spyOn(mockHttpClient, 'updateCredential');

    client.updateCredential('new-token');

    expect(updateCredentialSpy).toHaveBeenCalledWith('new-token');
  });

  it('should build URLs correctly', () => {
    const buildFullUrlSpy = vi
      .spyOn(mockHttpClient, 'buildFullUrl')
      .mockReturnValue('https://test.com/api/path');
    const getBrowserUrlSpy = vi
      .spyOn(mockHttpClient, 'getBrowserUrl')
      .mockReturnValue('https://test.com/browser/path');

    expect(client.buildFullUrl('/api/path')).toBe('https://test.com/api/path');
    expect(client.getBrowserUrl('/browser/path')).toBe('https://test.com/browser/path');

    expect(buildFullUrlSpy).toHaveBeenCalledWith('/api/path');
    expect(getBrowserUrlSpy).toHaveBeenCalledWith('/browser/path');
  });

  it('should set team', () => {
    const setTeamSpy = vi.spyOn(mockHttpClient, 'setTeam');

    client.setTeam('test-team');

    expect(setTeamSpy).toHaveBeenCalledWith('test-team');
  });
});
