// __tests__/wallet.test.ts
// Tests for wallet utility functions: loadKeypair, loadConfig, saveConfig, ensureConfigDir
import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Must mock fs before importing the module under test
jest.mock('fs');

// We need the actual wallet module, but with fs mocked
import {
  loadKeypair,
  loadConfig,
  saveConfig,
  ensureConfigDir,
  WalletConfig,
} from '../src/utils/wallet';

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Wallet Utilities', () => {
  const CONFIG_DIR = path.join(os.homedir(), '.private-dca');
  const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── loadKeypair ──────────────────────────────────────────────────────

  describe('loadKeypair', () => {
    it('should load a valid keypair from a JSON file', () => {
      // Generate a real keypair and serialize its secret key
      const realKeypair = Keypair.generate();
      const secretKeyArray = Array.from(realKeypair.secretKey);

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(secretKeyArray));

      const loaded = loadKeypair('/home/user/.config/solana/id.json');

      expect(loaded.publicKey.toBase58()).toBe(realKeypair.publicKey.toBase58());
      expect(mockFs.existsSync).toHaveBeenCalledWith('/home/user/.config/solana/id.json');
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/home/user/.config/solana/id.json', 'utf-8');
    });

    it('should expand tilde (~) in wallet path', () => {
      const realKeypair = Keypair.generate();
      const secretKeyArray = Array.from(realKeypair.secretKey);

      const expandedPath = path.join(os.homedir(), '.config/solana/id.json');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(secretKeyArray));

      const loaded = loadKeypair('~/.config/solana/id.json');

      expect(loaded.publicKey.toBase58()).toBe(realKeypair.publicKey.toBase58());
      expect(mockFs.existsSync).toHaveBeenCalledWith(expandedPath);
    });

    it('should throw when wallet file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => loadKeypair('/nonexistent/wallet.json')).toThrow(
        'Wallet file not found: /nonexistent/wallet.json'
      );

      // Should NOT try to read the file
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
    });

    it('should throw on invalid JSON content', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('not valid json {{{');

      expect(() => loadKeypair('/path/to/bad.json')).toThrow();
    });

    it('should throw on invalid secret key data', () => {
      mockFs.existsSync.mockReturnValue(true);
      // Valid JSON but wrong key length
      mockFs.readFileSync.mockReturnValue(JSON.stringify([1, 2, 3]));

      expect(() => loadKeypair('/path/to/short-key.json')).toThrow();
    });

    it('should throw when file contains non-array JSON', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ key: 'value' }));

      expect(() => loadKeypair('/path/to/object.json')).toThrow();
    });
  });

  // ─── ensureConfigDir ──────────────────────────────────────────────────

  describe('ensureConfigDir', () => {
    it('should create config directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      ensureConfigDir();

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(CONFIG_DIR, { recursive: true });
    });

    it('should not create config directory if it already exists', () => {
      mockFs.existsSync.mockReturnValue(true);

      ensureConfigDir();

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  // ─── loadConfig ───────────────────────────────────────────────────────

  describe('loadConfig', () => {
    it('should return null when config file does not exist', () => {
      // First call: ensureConfigDir checks if dir exists
      // Second call: loadConfig checks if file exists
      mockFs.existsSync
        .mockReturnValueOnce(true)   // config dir exists
        .mockReturnValueOnce(false); // config file does not exist

      const config = loadConfig();

      expect(config).toBeNull();
    });

    it('should load and parse config from file', () => {
      const testConfig: WalletConfig = {
        walletPath: '~/.config/solana/id.json',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
        network: 'mainnet-beta',
        rangeApiKey: 'range-key-123',
      };

      mockFs.existsSync.mockReturnValue(true); // both dir and file exist
      mockFs.readFileSync.mockReturnValue(JSON.stringify(testConfig));

      const config = loadConfig();

      expect(config).toEqual(testConfig);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(CONFIG_FILE, 'utf-8');
    });

    it('should load config without optional rangeApiKey', () => {
      const testConfig: WalletConfig = {
        walletPath: '~/.config/solana/id.json',
        rpcUrl: 'https://api.devnet.solana.com',
        network: 'devnet',
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(testConfig));

      const config = loadConfig();

      expect(config).toEqual(testConfig);
      expect(config!.rangeApiKey).toBeUndefined();
    });

    it('should ensure config directory exists before checking for file', () => {
      mockFs.existsSync.mockReturnValue(false);

      loadConfig();

      // ensureConfigDir should have been called (first existsSync for dir)
      expect(mockFs.existsSync).toHaveBeenCalled();
    });
  });

  // ─── saveConfig ───────────────────────────────────────────────────────

  describe('saveConfig', () => {
    it('should write config to file as formatted JSON', () => {
      mockFs.existsSync.mockReturnValue(true); // dir exists

      const config: WalletConfig = {
        walletPath: '~/.config/solana/id.json',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
        network: 'mainnet-beta',
        rangeApiKey: 'test-key',
      };

      saveConfig(config);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        CONFIG_FILE,
        JSON.stringify(config, null, 2)
      );
    });

    it('should create config directory if it does not exist before saving', () => {
      mockFs.existsSync.mockReturnValue(false);

      const config: WalletConfig = {
        walletPath: '/path/to/wallet.json',
        rpcUrl: 'https://api.devnet.solana.com',
        network: 'devnet',
      };

      saveConfig(config);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(CONFIG_DIR, { recursive: true });
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should persist all config fields including optional ones', () => {
      mockFs.existsSync.mockReturnValue(true);

      const config: WalletConfig = {
        walletPath: '~/wallet.json',
        rpcUrl: 'https://rpc.example.com',
        network: 'mainnet-beta',
        rangeApiKey: 'my-api-key',
      };

      saveConfig(config);

      const writtenData = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writtenData);

      expect(parsed.walletPath).toBe('~/wallet.json');
      expect(parsed.rpcUrl).toBe('https://rpc.example.com');
      expect(parsed.network).toBe('mainnet-beta');
      expect(parsed.rangeApiKey).toBe('my-api-key');
    });
  });
});
