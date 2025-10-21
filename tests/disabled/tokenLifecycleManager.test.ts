import { expect } from 'chai';
import { TokenLifecycleManager, TokenInfo, RefreshSchedule, LifecycleEvents } from '../src/auth/tokenLifecycleManager.js';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('TokenLifecycleManager', function () {
  let manager: TokenLifecycleManager;
  let mockEvents: LifecycleEvents;
  let eventCalls: Array<{ method: string; args: any[] }>;

  beforeEach(function () {
    eventCalls = [];
    mockEvents = {
      onRefreshNeeded: async (connectionId: string) => {
        eventCalls.push({ method: 'onRefreshNeeded', args: [connectionId] });
        return null;
      },
      onDeviceCodeFlowNeeded: async (connectionId: string) => {
        eventCalls.push({ method: 'onDeviceCodeFlowNeeded', args: [connectionId] });
      },
      onStatusUpdate: (connectionId: string, status: RefreshSchedule) => {
        eventCalls.push({ method: 'onStatusUpdate', args: [connectionId, status] });
      }
    };
    manager = new TokenLifecycleManager(mockEvents);
  });

  afterEach(function () {
    manager.dispose();
  });

  describe('Token Registration', function () {
    it('should register token and schedule refresh', function () {
      const tokenInfo: TokenInfo = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        acquiredAt: new Date(),
        expiresInSeconds: 3600
      };

      manager.registerToken('test-connection', tokenInfo);
      
      expect(eventCalls.some(call => call.method === 'onStatusUpdate')).to.be.true;
    });

    it('should update existing token registration', function () {
      const tokenInfo1: TokenInfo = {
        accessToken: 'access-token-1',
        expiresAt: new Date(Date.now() + 3600000),
        acquiredAt: new Date(),
        expiresInSeconds: 3600
      };

      const tokenInfo2: TokenInfo = {
        accessToken: 'access-token-2',
        expiresAt: new Date(Date.now() + 7200000), // 2 hours from now
        acquiredAt: new Date(),
        expiresInSeconds: 7200
      };

      manager.registerToken('test-connection', tokenInfo1);
      manager.registerToken('test-connection', tokenInfo2);

      const status = manager.getStatus('test-connection');
      expect(status).to.exist;
    });
  });

  describe('Progressive Refresh Scheduling', function () {
    it('should calculate progressive refresh intervals', function () {
      const tokenInfo: TokenInfo = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        acquiredAt: new Date(),
        expiresInSeconds: 3600
      };

      manager.registerToken('test-connection', tokenInfo);
      
      const status = manager.getStatus('test-connection');
      expect(status).to.exist;
      expect(status!.attemptCount).to.equal(0);
      expect(status!.nextRefreshAt).to.exist;
    });

    it('should respect minimum refresh interval', function () {
      const tokenInfo: TokenInfo = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() + 120000), // 2 minutes from now
        acquiredAt: new Date(),
        expiresInSeconds: 120
      };

      manager.registerToken('test-connection', tokenInfo);
      
      const status = manager.getStatus('test-connection');
      const timeUntilRefresh = status!.timeUntilNextRefresh;
      
      // Should be at least 1 minute (60000ms) even though token expires in 2 minutes
      expect(timeUntilRefresh).to.be.greaterThanOrEqual(60000);
    });
  });

  describe('Refresh Triggering', function () {
    it('should trigger refresh when scheduled time arrives', async function () {
      this.timeout(10000); // Allow more time for this test
      
      const tokenInfo: TokenInfo = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() + 2000), // 2 seconds from now
        acquiredAt: new Date(),
        expiresInSeconds: 2
      };

      manager.registerToken('test-connection', tokenInfo);
      
      // Wait for refresh to be triggered (should happen at ~1 second)
      await sleep(1500);
      
      expect(eventCalls.some(call => 
        call.method === 'onRefreshNeeded' && 
        call.args[0] === 'test-connection'
      )).to.be.true;
    });

    it('should trigger device code flow when token expires', async function () {
      this.timeout(10000); // Allow more time for this test
      
      const tokenInfo: TokenInfo = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() + 1000), // 1 second from now
        acquiredAt: new Date(),
        expiresInSeconds: 1
      };

      manager.registerToken('test-connection', tokenInfo);
      
      // Wait for expiry and device code flow trigger
      await sleep(1500);
      
      expect(eventCalls.some(call => 
        call.method === 'onDeviceCodeFlowNeeded' && 
        call.args[0] === 'test-connection'
      )).to.be.true;
    });
  });

  describe('Status Updates', function () {
    it('should provide comprehensive token status', function () {
      const tokenInfo: TokenInfo = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        acquiredAt: new Date(),
        expiresInSeconds: 3600
      };

      manager.registerToken('test-connection', tokenInfo);
      
      const status = manager.getStatus('test-connection');
      expect(status).to.exist;
      expect(status).to.have.property('nextRefreshAt');
      expect(status).to.have.property('attemptCount');
      expect(status).to.have.property('originalExpiresAt');
      expect(status).to.have.property('isExpired');
      expect(status).to.have.property('timeUntilExpiry');
      expect(status).to.have.property('timeUntilNextRefresh');
    });

    it('should return null for unregistered connection', function () {
      const status = manager.getStatus('non-existent-connection');
      expect(status).to.be.null;
    });
  });

  describe('Cleanup', function () {
    it('should clear all timers and tokens on dispose', function () {
      const tokenInfo: TokenInfo = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() + 3600000),
        acquiredAt: new Date(),
        expiresInSeconds: 3600
      };

      manager.registerToken('test-connection', tokenInfo);
      expect(manager.getStatus('test-connection')).to.exist;
      
      manager.dispose();
      expect(manager.getStatus('test-connection')).to.be.null;
    });
  });

  describe('Lifecycle Events', function () {
    it('should emit status updates on token registration', function () {
      const tokenInfo: TokenInfo = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() + 3600000),
        acquiredAt: new Date(),
        expiresInSeconds: 3600
      };

      manager.registerToken('test-connection', tokenInfo);
      
      expect(eventCalls.some(call => 
        call.method === 'onStatusUpdate' && 
        call.args[0] === 'test-connection'
      )).to.be.true;
    });
  });
});