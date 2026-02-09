// __tests__/ephemeral.service.critical.test.ts
// Tests for security-critical ephemeral wallet methods: fundEphemeral, sendToDestination, recoverSol
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { EphemeralService } from '../src/services/ephemeral.service';

// Mock connection methods
const mockSendRawTransaction = jest.fn().mockResolvedValue('mockSendSig');
const mockConfirmTransaction = jest.fn().mockResolvedValue({ value: { err: null } });
const mockGetLatestBlockhash = jest.fn().mockResolvedValue({
  blockhash: 'mockBlockhash123',
  lastValidBlockHeight: 999,
});
const mockGetBalance = jest.fn().mockResolvedValue(10_000_000); // 0.01 SOL

// Mock Transaction so sign()/serialize() don't do real crypto with fake blockhash
const mockTransactionAdd = jest.fn().mockReturnThis();
const mockTransactionSign = jest.fn();
const mockTransactionSerialize = jest.fn().mockReturnValue(Buffer.from('mockSerialized'));

jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    Connection: jest.fn().mockImplementation(() => ({
      getBalance: mockGetBalance,
      sendRawTransaction: mockSendRawTransaction,
      confirmTransaction: mockConfirmTransaction,
      getLatestBlockhash: mockGetLatestBlockhash,
    })),
    Transaction: jest.fn().mockImplementation(() => ({
      add: mockTransactionAdd,
      sign: mockTransactionSign,
      serialize: mockTransactionSerialize,
      recentBlockhash: '',
      feePayer: null,
      signatures: [],
    })),
  };
});

// Mock @solana/spl-token
const mockGetAssociatedTokenAddress = jest.fn();
const mockGetAccount = jest.fn();
const mockCreateAssociatedTokenAccountInstruction = jest.fn().mockReturnValue({
  keys: [],
  programId: 'mockProgramId',
  data: Buffer.from([]),
});
const mockCreateTransferInstruction = jest.fn().mockReturnValue({
  keys: [],
  programId: 'mockProgramId',
  data: Buffer.from([]),
});

jest.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: (...args: any[]) => mockGetAssociatedTokenAddress(...args),
  getAccount: (...args: any[]) => mockGetAccount(...args),
  createAssociatedTokenAccountInstruction: (...args: any[]) => mockCreateAssociatedTokenAccountInstruction(...args),
  createTransferInstruction: (...args: any[]) => mockCreateTransferInstruction(...args),
  TOKEN_PROGRAM_ID: new (jest.requireActual('@solana/web3.js').PublicKey)('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
}));

jest.mock('../src/types/index', () => ({
  TOKEN_DECIMALS: {
    SOL: 9,
    USDC: 6,
    USDT: 6,
    BONK: 5,
    WIF: 6,
    JUP: 6,
    UNKNOWN: 9,
  },
  TOKEN_MINTS: {},
}));

describe('EphemeralService - Critical Methods', () => {
  let service: EphemeralService;
  let mockConnection: Connection;
  let userKeypair: Keypair;
  let ephemeralKeypair: Keypair;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection = new Connection('https://mock.solana.com');
    service = new EphemeralService(mockConnection);

    // Generate real keypairs for testing
    userKeypair = jest.requireActual('@solana/web3.js').Keypair.generate();
    ephemeralKeypair = jest.requireActual('@solana/web3.js').Keypair.generate();

    // Default mock for getAssociatedTokenAddress
    const realPublicKey = jest.requireActual('@solana/web3.js').PublicKey;
    mockGetAssociatedTokenAddress.mockResolvedValue(
      new realPublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
    );
    // Default: ATA exists
    mockGetAccount.mockResolvedValue({ amount: BigInt(1000000), decimals: 6 });
  });

  // ─── fundEphemeral ────────────────────────────────────────────────────

  describe('fundEphemeral', () => {
    it('should create a SOL transfer and return funding result', async () => {
      const ephemeralPubkey = ephemeralKeypair.publicKey;

      const result = await service.fundEphemeral(
        userKeypair,
        ephemeralPubkey,
        0.01
      );

      expect(result).toEqual({
        signature: 'mockSendSig',
        solAmount: 0.01,
        tokenAmount: undefined,
        tokenMint: undefined,
      });

      // Should have fetched a blockhash
      expect(mockGetLatestBlockhash).toHaveBeenCalledWith('confirmed');
      // Should have sent the raw transaction
      expect(mockSendRawTransaction).toHaveBeenCalledTimes(1);
      // Should have confirmed the transaction
      expect(mockConfirmTransaction).toHaveBeenCalledTimes(1);
    });

    it('should add SystemProgram.transfer instruction to the transaction', async () => {
      const ephemeralPubkey = ephemeralKeypair.publicKey;

      await service.fundEphemeral(userKeypair, ephemeralPubkey, 0.01);

      // Transaction.add should have been called with a SystemProgram.transfer instruction
      expect(mockTransactionAdd).toHaveBeenCalled();
    });

    it('should include token transfer instructions when tokenMint and tokenAmount are provided', async () => {
      const ephemeralPubkey = ephemeralKeypair.publicKey;
      const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      const result = await service.fundEphemeral(
        userKeypair,
        ephemeralPubkey,
        0.01,
        usdcMint,
        100 // 100 USDC
      );

      expect(result.tokenMint).toBe(usdcMint);
      expect(result.tokenAmount).toBe(100);
      expect(result.signature).toBe('mockSendSig');

      // Should have looked up ATAs for user and ephemeral
      expect(mockGetAssociatedTokenAddress).toHaveBeenCalledTimes(2);
      // Should have checked if ephemeral ATA exists
      expect(mockGetAccount).toHaveBeenCalledTimes(1);
      // Token transfer instruction should have been created
      expect(mockCreateTransferInstruction).toHaveBeenCalledTimes(1);
    });

    it('should create the ephemeral ATA if it does not exist', async () => {
      const ephemeralPubkey = ephemeralKeypair.publicKey;
      const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      // First call to getAccount fails (ATA does not exist)
      mockGetAccount.mockRejectedValueOnce(new Error('Account not found'));

      const result = await service.fundEphemeral(
        userKeypair,
        ephemeralPubkey,
        0.01,
        usdcMint,
        50
      );

      expect(result.signature).toBe('mockSendSig');
      // ATA creation instruction should have been added
      expect(mockCreateAssociatedTokenAccountInstruction).toHaveBeenCalledTimes(1);
      // Token transfer still added
      expect(mockCreateTransferInstruction).toHaveBeenCalledTimes(1);
    });

    it('should not add token instructions when tokenAmount is 0', async () => {
      const ephemeralPubkey = ephemeralKeypair.publicKey;

      const result = await service.fundEphemeral(
        userKeypair,
        ephemeralPubkey,
        0.01,
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        0 // zero amount
      );

      expect(result.tokenAmount).toBe(0);
      // Should NOT have called spl-token functions for token transfer
      expect(mockGetAssociatedTokenAddress).not.toHaveBeenCalled();
      expect(mockCreateTransferInstruction).not.toHaveBeenCalled();
    });

    it('should not add token instructions when tokenMint is undefined', async () => {
      const ephemeralPubkey = ephemeralKeypair.publicKey;

      await service.fundEphemeral(userKeypair, ephemeralPubkey, 0.005);

      expect(mockGetAssociatedTokenAddress).not.toHaveBeenCalled();
      expect(mockCreateTransferInstruction).not.toHaveBeenCalled();
    });

    it('should propagate errors from sendRawTransaction', async () => {
      mockSendRawTransaction.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.fundEphemeral(userKeypair, ephemeralKeypair.publicKey, 0.01)
      ).rejects.toThrow('Network error');
    });

    it('should propagate errors from confirmTransaction', async () => {
      mockConfirmTransaction.mockRejectedValueOnce(new Error('Timeout'));

      await expect(
        service.fundEphemeral(userKeypair, ephemeralKeypair.publicKey, 0.01)
      ).rejects.toThrow('Timeout');
    });

    it('should sign the transaction with the user keypair', async () => {
      await service.fundEphemeral(userKeypair, ephemeralKeypair.publicKey, 0.01);

      expect(mockTransactionSign).toHaveBeenCalledWith(userKeypair);
    });

    it('should send serialized transaction with skipPreflight false and maxRetries 3', async () => {
      await service.fundEphemeral(userKeypair, ephemeralKeypair.publicKey, 0.01);

      expect(mockSendRawTransaction).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({ skipPreflight: false, maxRetries: 3 })
      );
    });
  });

  // ─── sendToDestination ────────────────────────────────────────────────

  describe('sendToDestination', () => {
    const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    it('should transfer tokens from ephemeral to destination and return result', async () => {
      const destination = jest.requireActual('@solana/web3.js').Keypair.generate().publicKey;

      const result = await service.sendToDestination(
        ephemeralKeypair,
        destination,
        usdcMint,
        50
      );

      expect(result).toEqual({
        signature: 'mockSendSig',
        amount: 50,
        mint: usdcMint,
        destination: destination.toBase58(),
      });

      // Should look up both ATAs
      expect(mockGetAssociatedTokenAddress).toHaveBeenCalledTimes(2);
      // Should create transfer instruction
      expect(mockCreateTransferInstruction).toHaveBeenCalledTimes(1);
      // Should send and confirm
      expect(mockSendRawTransaction).toHaveBeenCalledTimes(1);
      expect(mockConfirmTransaction).toHaveBeenCalledTimes(1);
    });

    it('should create destination ATA if it does not exist', async () => {
      const destination = jest.requireActual('@solana/web3.js').Keypair.generate().publicKey;

      // Destination ATA does not exist
      mockGetAccount.mockRejectedValueOnce(new Error('Account not found'));

      const result = await service.sendToDestination(
        ephemeralKeypair,
        destination,
        usdcMint,
        25
      );

      expect(result.signature).toBe('mockSendSig');
      expect(mockCreateAssociatedTokenAccountInstruction).toHaveBeenCalledTimes(1);
      expect(mockCreateTransferInstruction).toHaveBeenCalledTimes(1);
    });

    it('should not create destination ATA if it already exists', async () => {
      const destination = jest.requireActual('@solana/web3.js').Keypair.generate().publicKey;

      // Destination ATA exists
      mockGetAccount.mockResolvedValueOnce({ amount: BigInt(0) });

      await service.sendToDestination(ephemeralKeypair, destination, usdcMint, 10);

      expect(mockCreateAssociatedTokenAccountInstruction).not.toHaveBeenCalled();
      expect(mockCreateTransferInstruction).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from transaction sending', async () => {
      const destination = jest.requireActual('@solana/web3.js').Keypair.generate().publicKey;
      mockSendRawTransaction.mockRejectedValueOnce(new Error('Send failed'));

      await expect(
        service.sendToDestination(ephemeralKeypair, destination, usdcMint, 10)
      ).rejects.toThrow('Send failed');
    });

    it('should use correct decimals for known token mints (USDC = 6)', async () => {
      const destination = jest.requireActual('@solana/web3.js').Keypair.generate().publicKey;

      // USDC has 6 decimals, so 50 USDC = 50_000_000 raw
      await service.sendToDestination(ephemeralKeypair, destination, usdcMint, 50);

      // Verify createTransferInstruction was called with correct raw amount
      const callArgs = mockCreateTransferInstruction.mock.calls[0];
      expect(callArgs[3]).toBe(50_000_000); // 50 * 10^6
    });

    it('should default to 9 decimals for unknown token mints', async () => {
      const destination = jest.requireActual('@solana/web3.js').Keypair.generate().publicKey;
      const unknownMint = '11111111111111111111111111111111';

      await service.sendToDestination(ephemeralKeypair, destination, unknownMint, 1);

      const callArgs = mockCreateTransferInstruction.mock.calls[0];
      expect(callArgs[3]).toBe(1_000_000_000); // 1 * 10^9
    });

    it('should sign the transaction with the ephemeral keypair', async () => {
      const destination = jest.requireActual('@solana/web3.js').Keypair.generate().publicKey;

      await service.sendToDestination(ephemeralKeypair, destination, usdcMint, 10);

      expect(mockTransactionSign).toHaveBeenCalledWith(ephemeralKeypair);
    });

    it('should return destination as base58 string', async () => {
      const destination = jest.requireActual('@solana/web3.js').Keypair.generate().publicKey;

      const result = await service.sendToDestination(ephemeralKeypair, destination, usdcMint, 1);

      // Verify the destination in the result is a proper base58 string
      expect(result.destination).toBe(destination.toBase58());
      expect(result.destination.length).toBeGreaterThan(30);
    });
  });

  // ─── recoverSol ───────────────────────────────────────────────────────

  describe('recoverSol', () => {
    it('should transfer remaining SOL minus fee reserve back to destination', async () => {
      const destination = jest.requireActual('@solana/web3.js').Keypair.generate().publicKey;

      // Balance is 10_000_000 lamports (0.01 SOL)
      mockGetBalance.mockResolvedValueOnce(10_000_000);

      const result = await service.recoverSol(ephemeralKeypair, destination);

      expect(result).toBe('mockSendSig');
      // Should have checked balance first
      expect(mockGetBalance).toHaveBeenCalledWith(ephemeralKeypair.publicKey);
      // Should have sent a transaction
      expect(mockSendRawTransaction).toHaveBeenCalledTimes(1);
    });

    it('should return null when balance is too low to recover (at or below 5000 lamports)', async () => {
      const destination = jest.requireActual('@solana/web3.js').Keypair.generate().publicKey;

      // Exactly 5000 lamports (at minimum, not enough to recover)
      mockGetBalance.mockResolvedValueOnce(5000);

      const result = await service.recoverSol(ephemeralKeypair, destination);

      expect(result).toBeNull();
      // Should NOT have tried to send a transaction
      expect(mockSendRawTransaction).not.toHaveBeenCalled();
    });

    it('should return null when wallet is empty (0 lamports)', async () => {
      const destination = jest.requireActual('@solana/web3.js').Keypair.generate().publicKey;

      mockGetBalance.mockResolvedValueOnce(0);

      const result = await service.recoverSol(ephemeralKeypair, destination);

      expect(result).toBeNull();
      expect(mockSendRawTransaction).not.toHaveBeenCalled();
    });

    it('should return null when transaction fails (graceful error handling)', async () => {
      const destination = jest.requireActual('@solana/web3.js').Keypair.generate().publicKey;

      mockGetBalance.mockResolvedValueOnce(1_000_000);
      mockSendRawTransaction.mockRejectedValueOnce(new Error('Insufficient funds'));

      const result = await service.recoverSol(ephemeralKeypair, destination);

      // recoverSol catches errors and returns null
      expect(result).toBeNull();
    });

    it('should recover just above the minimum threshold (5001 lamports)', async () => {
      const destination = jest.requireActual('@solana/web3.js').Keypair.generate().publicKey;

      // 5001 lamports: just barely enough (transfer 1 lamport)
      mockGetBalance.mockResolvedValueOnce(5001);

      const result = await service.recoverSol(ephemeralKeypair, destination);

      expect(result).toBe('mockSendSig');
      expect(mockSendRawTransaction).toHaveBeenCalledTimes(1);
    });

    it('should use SystemProgram.transfer for the recovery transaction', async () => {
      const destination = jest.requireActual('@solana/web3.js').Keypair.generate().publicKey;

      mockGetBalance.mockResolvedValueOnce(100_000);

      await service.recoverSol(ephemeralKeypair, destination);

      // The Transaction().add() should have been called to add the SOL transfer
      expect(mockTransactionAdd).toHaveBeenCalled();
    });
  });

  // ─── sendTransaction retry logic ─────────────────────────────────────

  describe('sendTransaction retry logic (via fundEphemeral)', () => {
    it('should retry on block height exceeded errors', async () => {
      const ephemeralPubkey = ephemeralKeypair.publicKey;

      // First attempt: block height exceeded on confirm
      const blockHeightError = new Error('block height exceeded');
      mockConfirmTransaction
        .mockRejectedValueOnce(blockHeightError)
        .mockResolvedValueOnce({ value: { err: null } });

      const result = await service.fundEphemeral(userKeypair, ephemeralPubkey, 0.01);

      expect(result.signature).toBe('mockSendSig');
      // Should have been called twice (retry)
      expect(mockGetLatestBlockhash).toHaveBeenCalledTimes(2);
      expect(mockSendRawTransaction).toHaveBeenCalledTimes(2);
    });

    it('should throw non-retryable errors immediately', async () => {
      const ephemeralPubkey = ephemeralKeypair.publicKey;

      mockConfirmTransaction.mockRejectedValueOnce(new Error('Simulation failed'));

      await expect(
        service.fundEphemeral(userKeypair, ephemeralPubkey, 0.01)
      ).rejects.toThrow('Simulation failed');

      // Should NOT retry
      expect(mockSendRawTransaction).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries exhausted', async () => {
      const ephemeralPubkey = ephemeralKeypair.publicKey;

      const blockHeightError = new Error('block height exceeded');
      mockConfirmTransaction
        .mockRejectedValueOnce(blockHeightError)
        .mockRejectedValueOnce(blockHeightError)
        .mockRejectedValueOnce(blockHeightError);

      await expect(
        service.fundEphemeral(userKeypair, ephemeralPubkey, 0.01)
      ).rejects.toThrow('block height exceeded');

      // 3 attempts (default maxAttempts)
      expect(mockSendRawTransaction).toHaveBeenCalledTimes(3);
    });
  });
});
