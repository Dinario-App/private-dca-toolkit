// __tests__/ephemeral.service.test.ts
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { EphemeralService } from '../src/services/ephemeral.service';

// Mock the entire @solana/web3.js module
jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    Connection: jest.fn().mockImplementation(() => ({
      getBalance: jest.fn().mockResolvedValue(10000000),
      sendAndConfirmTransaction: jest.fn().mockResolvedValue('mockSignature'),
      getLatestBlockhash: jest.fn().mockResolvedValue({ blockhash: 'mockBlockhash', lastValidBlockHeight: 123 }),
      confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    })),
  };
});

// Mock @solana/spl-token
jest.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: jest.fn().mockResolvedValue(new (jest.requireActual('@solana/web3.js').PublicKey)('mockAtaAddress11111111111111111111111111111')),
  getAccount: jest.fn().mockResolvedValue({ amount: BigInt(0), decimals: 9 }),
  createAssociatedTokenAccountInstruction: jest.fn().mockReturnValue({ keys: [], programId: 'mockProgramId', data: Buffer.from([]) }),
  createTransferInstruction: jest.fn().mockReturnValue({ keys: [], programId: 'mockProgramId', data: Buffer.from([]) }),
  TOKEN_PROGRAM_ID: new (jest.requireActual('@solana/web3.js').PublicKey)('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
}));

// Mock ../types/index
jest.mock('../src/types/index', () => ({
  TOKEN_DECIMALS: {
    SOL: 9,
    USDC: 6,
    USDT: 6,
    BONK: 5,
    WIF: 1,
    JUP: 6,
    ORCA: 6,
    UNKNOWN: 9,
  },
  TOKEN_MINTS: {},
}));

describe('EphemeralService', () => {
  let ephemeralService: EphemeralService;
  let mockConnection: Connection;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection = new Connection('https://mock.solana.com');
    ephemeralService = new EphemeralService(mockConnection);
  });

  describe('generateEphemeralWallet', () => {
    it('should generate a valid ephemeral wallet', () => {
      const wallet = ephemeralService.generateEphemeralWallet();
      expect(wallet).toHaveProperty('keypair');
      expect(wallet).toHaveProperty('publicKey');
      expect(typeof wallet.publicKey).toBe('string');
      expect(wallet.publicKey.length).toBeGreaterThan(30); // Base58 public keys are ~44 chars
    });

    it('should generate unique wallets each time', () => {
      const wallet1 = ephemeralService.generateEphemeralWallet();
      const wallet2 = ephemeralService.generateEphemeralWallet();
      expect(wallet1.publicKey).not.toBe(wallet2.publicKey);
    });
  });

  describe('getRecommendedSolFunding', () => {
    it('should return the correct recommended SOL amount', () => {
      const recommended = ephemeralService.getRecommendedSolFunding();
      expect(recommended).toBe(0.01);
    });
  });

  describe('getPrivacyScore', () => {
    it('should calculate score correctly with all privacy factors', () => {
      const result = ephemeralService.getPrivacyScore(true, true);
      expect(result.score).toBe(80); // 40 (ephemeral) + 20 (screening) + 20 (non-custodial)
      expect(result.factors).toContain('Ephemeral wallet breaks on-chain linkability');
      expect(result.factors).toContain('Range screening ensures compliant counterparties');
      expect(result.factors).toContain('Non-custodial: you control your keys');
    });

    it('should calculate score correctly with ephemeral only', () => {
      const result = ephemeralService.getPrivacyScore(true, false);
      expect(result.score).toBe(60); // 40 (ephemeral) + 20 (non-custodial)
      expect(result.factors).toContain('Ephemeral wallet breaks on-chain linkability');
      expect(result.factors).not.toContain('Range screening ensures compliant counterparties');
    });

    it('should calculate score correctly with screening only', () => {
      const result = ephemeralService.getPrivacyScore(false, true);
      expect(result.score).toBe(40); // 20 (screening) + 20 (non-custodial)
      expect(result.factors).toContain('Direct wallet exposed in transaction');
      expect(result.factors).toContain('Range screening ensures compliant counterparties');
    });

    it('should calculate score with no privacy factors', () => {
      const result = ephemeralService.getPrivacyScore(false, false);
      expect(result.score).toBe(20); // 20 (non-custodial only)
      expect(result.factors).toContain('Direct wallet exposed in transaction');
      expect(result.factors).toContain('Non-custodial: you control your keys');
    });
  });

  describe('getEphemeralBalance', () => {
    it('should return SOL balance correctly', async () => {
      const mockPubkey = Keypair.generate().publicKey;
      (mockConnection.getBalance as jest.Mock).mockResolvedValue(15000000); // 0.015 SOL in lamports

      const balance = await ephemeralService.getEphemeralBalance(mockPubkey);
      expect(balance).toBe(0.015);
    });

    it('should return 0 for empty wallet', async () => {
      const mockPubkey = Keypair.generate().publicKey;
      (mockConnection.getBalance as jest.Mock).mockResolvedValue(0);

      const balance = await ephemeralService.getEphemeralBalance(mockPubkey);
      expect(balance).toBe(0);
    });
  });

  describe('getEphemeralTokenBalance', () => {
    it('should return 0 if token account does not exist', async () => {
      const { getAccount } = require('@solana/spl-token');
      getAccount.mockRejectedValueOnce(new Error('Account not found'));

      const mockPubkey = Keypair.generate().publicKey;
      const balance = await ephemeralService.getEphemeralTokenBalance(
        mockPubkey,
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC mint
      );
      expect(balance).toBe(0);
    });
  });
});
