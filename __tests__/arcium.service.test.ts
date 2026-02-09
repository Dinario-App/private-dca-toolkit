// __tests__/arcium.service.test.ts
// Tests for Arcium service: availability checks, encryption fallback, initialization
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

// We need to control the dynamic import of @arcium-hq/client
// Use a variable to toggle whether the import succeeds or fails
let mockArciumAvailable = false;
let mockRescueCipher: any = null;
let mockX25519: any = null;

jest.mock('@arcium-hq/client', () => {
  // This factory runs at mock setup time; the actual behavior is
  // controlled by the mockArciumAvailable flag at test time
  return {
    // The module itself will be dynamically imported, so we need __esModule
    __esModule: true,
    get RescueCipher() {
      if (!mockArciumAvailable) throw new Error('Cannot find module \'@arcium-hq/client\'');
      return mockRescueCipher;
    },
    get x25519() {
      if (!mockArciumAvailable) throw new Error('Cannot find module \'@arcium-hq/client\'');
      return mockX25519;
    },
  };
}, { virtual: true });

// We also need to handle the dynamic import() call in initialize()
// Jest's module mock handles require(), but dynamic import() needs special treatment
// Since ts-jest compiles import() to require() in commonjs mode, the mock above should work

jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    Connection: jest.fn().mockImplementation(() => ({
      getBalance: jest.fn().mockResolvedValue(0),
    })),
  };
});

import { ArciumService, ArciumSimulated } from '../src/services/arcium.service';

describe('ArciumService', () => {
  let service: ArciumService;
  let mockConnection: Connection;

  beforeEach(() => {
    jest.clearAllMocks();
    mockArciumAvailable = false;
    mockRescueCipher = null;
    mockX25519 = null;
    mockConnection = new Connection('https://mock.solana.com');
    service = new ArciumService(mockConnection);
  });

  // ─── checkAvailability ────────────────────────────────────────────────

  describe('checkAvailability', () => {
    it('should return { available: false } when @arcium-hq/client is not installed', async () => {
      mockArciumAvailable = false;

      const result = await service.checkAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Arcium SDK not available');
    });

    it('should return { available: true } when @arcium-hq/client is properly installed', async () => {
      mockArciumAvailable = true;
      mockRescueCipher = class MockCipher {
        encrypt() { return BigInt(12345); }
      };
      mockX25519 = { generateKeyPair: jest.fn() };

      const result = await service.checkAvailability();

      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return { available: false } when SDK exports are null', async () => {
      // SDK is "available" but exports are broken (returns null)
      mockArciumAvailable = true;
      mockRescueCipher = null;
      mockX25519 = null;

      const result = await service.checkAvailability();

      // Should fail because RescueCipher and x25519 are null
      expect(result.available).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ─── initialize ───────────────────────────────────────────────────────

  describe('initialize', () => {
    it('should throw when @arcium-hq/client module is missing', async () => {
      mockArciumAvailable = false;

      await expect(service.initialize()).rejects.toThrow();
    });

    it('should succeed when SDK is available with valid exports', async () => {
      mockArciumAvailable = true;
      mockRescueCipher = class MockCipher {
        encrypt() { return BigInt(0); }
      };
      mockX25519 = { generateKeyPair: jest.fn() };

      // Should not throw
      await service.initialize();

      // Calling again should be a no-op (early return)
      await service.initialize();
    });

    it('should throw when SDK exports RescueCipher as null', async () => {
      mockArciumAvailable = true;
      mockRescueCipher = null;
      mockX25519 = { generateKeyPair: jest.fn() };

      await expect(service.initialize()).rejects.toThrow('Failed to import Arcium SDK');
    });

    it('should throw when SDK exports x25519 as null', async () => {
      mockArciumAvailable = true;
      mockRescueCipher = class MockCipher {};
      mockX25519 = null;

      await expect(service.initialize()).rejects.toThrow('Failed to import Arcium SDK');
    });

    it('should be idempotent - second call is a no-op', async () => {
      mockArciumAvailable = true;
      mockRescueCipher = class MockCipher {
        encrypt() { return BigInt(0); }
      };
      mockX25519 = { generateKeyPair: jest.fn() };

      await service.initialize();
      // After first successful init, even if we break the mock, second call is no-op
      mockArciumAvailable = false;
      await service.initialize(); // should not throw because isInitialized is true
    });
  });

  // ─── encryptAmount ────────────────────────────────────────────────────

  describe('encryptAmount', () => {
    it('should return null when SDK is not initialized', () => {
      // Service just constructed, not initialized
      const result = service.encryptAmount(100);

      expect(result).toBeNull();
    });

    it('should return encrypted string when SDK is initialized', async () => {
      mockArciumAvailable = true;
      mockRescueCipher = class MockCipher {
        constructor(_key: any) {}
        encrypt(_plaintext: any, _nonce: any) {
          return BigInt(999999);
        }
      };
      mockX25519 = { generateKeyPair: jest.fn() };

      await service.initialize();

      const result = service.encryptAmount(50.5);

      expect(result).not.toBeNull();
      expect(result).toContain('[RESCUE: 0x');
    });

    it('should return null if encryption throws an error', async () => {
      mockArciumAvailable = true;
      mockRescueCipher = class MockCipher {
        constructor(_key: any) {}
        encrypt() {
          throw new Error('Encryption failure');
        }
      };
      mockX25519 = { generateKeyPair: jest.fn() };

      await service.initialize();

      const result = service.encryptAmount(100);

      expect(result).toBeNull();
    });

    it('should handle zero amount', async () => {
      mockArciumAvailable = true;
      mockRescueCipher = class MockCipher {
        constructor(_key: any) {}
        encrypt(_plaintext: any, _nonce: any) {
          return BigInt(0);
        }
      };
      mockX25519 = { generateKeyPair: jest.fn() };

      await service.initialize();

      const result = service.encryptAmount(0);

      expect(result).not.toBeNull();
      expect(result).toContain('[RESCUE: 0x');
    });
  });

  // ─── getEncryptionStatus ──────────────────────────────────────────────

  describe('getEncryptionStatus', () => {
    it('should return static encryption metadata', () => {
      const status = service.getEncryptionStatus();

      expect(status.cipherSuite).toBe('RescueCipher');
      expect(status.mxeEndpoint).toBe('https://mxe.arcium.network');
      expect(status.sdkVersion).toBe('0.5.4');
    });
  });

  // ─── getPrivacyMetrics ────────────────────────────────────────────────

  describe('getPrivacyMetrics', () => {
    it('should return maximum privacy when both confidential and ephemeral are true', () => {
      const metrics = service.getPrivacyMetrics(true, true);

      expect(metrics.amountVisibility).toBe('encrypted');
      expect(metrics.senderLinkability).toBe('unlinkable');
      expect(metrics.privacyLevel).toBe('maximum');
      expect(metrics.description).toContain('RescueCipher');
    });

    it('should return standard privacy when confidential is false', () => {
      const metrics = service.getPrivacyMetrics(false, true);

      expect(metrics.amountVisibility).toBe('public');
      expect(metrics.senderLinkability).toBe('linked');
      expect(metrics.privacyLevel).toBe('standard');
    });

    it('should return standard privacy when ephemeral is false', () => {
      const metrics = service.getPrivacyMetrics(true, false);

      expect(metrics.amountVisibility).toBe('public');
      expect(metrics.senderLinkability).toBe('linked');
      expect(metrics.privacyLevel).toBe('standard');
    });

    it('should return standard privacy when both are false', () => {
      const metrics = service.getPrivacyMetrics(false, false);

      expect(metrics.privacyLevel).toBe('standard');
    });
  });

  // ─── getConfidentialBalance ───────────────────────────────────────────

  describe('getConfidentialBalance', () => {
    it('should return encrypted balance placeholder', async () => {
      const mint = new (jest.requireActual('@solana/web3.js').PublicKey)(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      );
      const owner = jest.requireActual('@solana/web3.js').Keypair.generate();

      const balance = await service.getConfidentialBalance(mint, owner);

      expect(balance.available).toBe('[ENCRYPTED]');
      expect(balance.pending).toBe('[ENCRYPTED]');
      expect(balance.encrypted).toBe(true);
    });
  });

  // ─── ArciumSimulated ─────────────────────────────────────────────────

  describe('ArciumSimulated', () => {
    it('should return simulated encryption result', async () => {
      const result = await ArciumSimulated.simulateEncrypt(42);

      expect(result.message).toBe('Encrypted 42');
      expect(result.ciphertext).toContain('[RESCUE: 0x');
    });
  });
});
