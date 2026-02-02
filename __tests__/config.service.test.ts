// __tests__/config.service.test.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigService } from '../src/services/config.service';

// Mock fs and os modules
jest.mock('fs');
jest.mock('path');
jest.mock('os');

describe('ConfigService', () => {
  let configService: ConfigService;
  const mockConfigPath = path.join(os.homedir(), '.private-dca', 'config.json');

  beforeEach(() => {
    jest.clearAllMocks();
    configService = new ConfigService();

    // Mock os.homedir to return a consistent path
    (os.homedir as jest.Mock).mockReturnValue('/mock/home/dir');
    // Mock path.join to ensure consistent path resolution
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

    // Default mock for existsSync
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    // Default mock for readFileSync to return empty JSON array
    (fs.readFileSync as jest.Mock).mockReturnValue('[]');
  });

  describe('loadConfig', () => {
    it('should load config from file', () => {
      const mockConfigData = [{ id: 'config-1', rpcUrl: 'https://mock.rpc', walletPath: '~/.config/solana/id.json' }];
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfigData));

      const config = configService.loadConfig();
      expect(config).toEqual(mockConfigData);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockConfigPath, 'utf-8');
    });

    it('should return empty array if config file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const config = configService.loadConfig();
      expect(config).toEqual([]);
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it('should handle file read errors gracefully', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File read error');
      });
      const config = configService.loadConfig();
      expect(config).toEqual([]);
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', () => {
      const mockNewConfig = [{ id: 'config-1', rpcUrl: 'https://new.rpc', walletPath: '~/.config/solana/id.json' }];
      configService.saveConfig(mockNewConfig);

      expect(fs.writeFileSync).toHaveBeenCalledWith(mockConfigPath, JSON.stringify(mockNewConfig, null, 2));
    });
  });

  describe('addOrUpdateConfig', () => {
    it('should add a new config entry', () => {
      const newEntry = { id: 'config-1', rpcUrl: 'https://mock.rpc', walletPath: '~/.config/solana/id.json' };
      configService.addOrUpdateConfig(newEntry);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writtenData = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(JSON.parse(writtenData)).toEqual([newEntry]);
    });

    it('should update an existing config entry', () => {
      const existingEntry = { id: 'config-1', rpcUrl: 'https://old.rpc', walletPath: '~/.config/solana/id.json' };
      const updatedEntry = { id: 'config-1', rpcUrl: 'https://new.rpc', walletPath: '~/.config/solana/id.json' };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([existingEntry]));

      configService.addOrUpdateConfig(updatedEntry);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writtenData = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(JSON.parse(writtenData)).toEqual([updatedEntry]);
    });
  });

  describe('removeConfig', () => {
    it('should remove an existing config entry', () => {
      const existingEntry = { id: 'config-1', rpcUrl: 'https://mock.rpc', walletPath: '~/.config/solana/id.json' };
      const existingEntry2 = { id: 'config-2', rpcUrl: 'https://mock.rpc', walletPath: '~/.config/solana/id.json' };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([existingEntry, existingEntry2]));

      configService.removeConfig('config-1');

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writtenData = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(JSON.parse(writtenData)).toEqual([existingEntry2]);
    });

    it('should do nothing if config entry does not exist', () => {
      const existingEntry = { id: 'config-1', rpcUrl: 'https://mock.rpc', walletPath: '~/.config/solana/id.json' };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([existingEntry]));

      configService.removeConfig('non-existent-id');

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('ensureDataDir', () => {
    it('should create directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      configService.ensureDataDir();
      expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(os.homedir(), '.private-dca'), { recursive: true });
    });

    it('should not create directory if it exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      configService.ensureDataDir();
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });
});
