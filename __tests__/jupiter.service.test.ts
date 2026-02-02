// __tests__/jupiter.service.test.ts
import { Connection, Keypair, PublicKey, VersionedTransaction, TransactionSignature } from '@solana/web3.js';
import { JupiterService } from '../src/services/jupiter.service';

// Mocking global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Mocking Solana Connection
const mockConnection = {
  sendRawTransaction: jest.fn(),
  confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }), // Default to success
  getLatestBlockhash: jest.fn().mockResolvedValue({ blockhash: 'mockBlockhash', lastValidBlockHeight: 123 }),
} as Partial<Connection>;

// Mock VersionedTransaction
const mockVersionedTransaction = {
  serialize: jest.fn(),
  sign: jest.fn(),
  message: { recentBlockhash: 'mockBlockhash' },
};
jest.mock('@solana/web3.js', () => ({
  ...jest.requireActual('@solana/web3.js'),
  VersionedTransaction: {
    deserialize: jest.fn().mockImplementation(() => mockVersionedTransaction),
  },
  Keypair: {
      generate: jest.fn().mockImplementation(() => ({
          publicKey: { toBase58: () => 'mockUserPublicKey' },
          secretKey: new Uint8Array(32),
      })),
  },
}));

describe('JupiterService', () => {
  let jupiterService: JupiterService;

  beforeEach(() => {
    jest.clearAllMocks();
    const connection = mockConnection as Connection;
    jupiterService = new JupiterService(connection);

    // Reset mocks for fetch and Solana methods
    (mockFetch as jest.Mock).mockClear();
    (mockConnection.sendRawTransaction as jest.Mock).mockClear();
    (mockConnection.confirmTransaction as jest.Mock).mockResolvedValue({ value: { err: null } });
    (mockConnection.getLatestBlockhash as jest.Mock).mockResolvedValue({ blockhash: 'mockBlockhash', lastValidBlockHeight: 123 });
    mockVersionedTransaction.serialize.mockClear();
    mockVersionedTransaction.sign.mockClear();
    (VersionedTransaction.deserialize as jest.Mock).mockClear();
  });

  describe('getQuote', () => {
    const mockQuoteResponse = {
      inputMint: 'SOL',
      inAmount: '1000000000',
      outputMint: 'USDC',
      outAmount: '990000000',
      priceImpactPct: '1.0',
      routePlan: [{
        swapInfo: {
          ammKey: 'mockAmmKey',
          label: 'mockAmm',
          inputMint: 'SOL',
          outputMint: 'USDC',
          inAmount: '1000000000',
          outAmount: '990000000',
          feeAmount: '1000000',
          feeMint: 'SOL',
        },
        percent: 100,
      }],
      slippageBps: 50,
    };

    it('should fetch quote successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockQuoteResponse),
      });

      const quote = await jupiterService.getQuote('SOL', 'USDC', 1000000000);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/quote?'));
      expect(quote).toEqual(mockQuoteResponse);
    });

    it('should throw an error if quote fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('API error'),
      });

      await expect(jupiterService.getQuote('SOL', 'USDC', 1000000000))
        .rejects
        .toThrow('Jupiter quote failed: API error');
    });
  });

  describe('executeSwap', () => {
    const mockQuoteResponse = {
      inputMint: 'SOL',
      inAmount: '1000000000',
      outputMint: 'USDC',
      outAmount: '990000000',
      priceImpactPct: '1.0',
      routePlan: [{
        swapInfo: {
          ammKey: 'mockAmmKey',
          label: 'mockAmm',
          inputMint: 'SOL',
          outputMint: 'USDC',
          inAmount: '1000000000',
          outAmount: '990000000',
          feeAmount: '1000000',
          feeMint: 'SOL',
        },
        percent: 100,
      }],
      slippageBps: 50,
    };

    const mockUserKeypair = Keypair.generate(); // Generate a mock keypair

    it('should execute swap successfully', async () => {
      const mockSerializedTransaction = Buffer.from('mockSerializedTransaction');
      const mockSignature: TransactionSignature = 'mockSignature';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          swapTransaction: mockSerializedTransaction.toString('base64'),
          lastValidBlockHeight: 123,
        }),
      });

      mockVersionedTransaction.serialize.mockReturnValue(mockSerializedTransaction);
      mockVersionedTransaction.sign.mockImplementation(() => {}); // Mock sign method completion

      const signature = await jupiterService.executeSwap(mockQuoteResponse, mockUserKeypair);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/swap'), expect.any(Object));

      expect(VersionedTransaction.deserialize).toHaveBeenCalledWith(mockSerializedTransaction);
      expect(mockVersionedTransaction.sign).toHaveBeenCalledWith([mockUserKeypair]);

      expect(mockConnection.sendRawTransaction).toHaveBeenCalledWith(mockSerializedTransaction, { skipPreflight: true, maxRetries: 2 });
      expect(mockConnection.confirmTransaction).toHaveBeenCalledWith({
        signature,
        blockhash: 'mockBlockhash',
        lastValidBlockHeight: 123,
      }, 'confirmed');
      expect(signature).toBe(mockSignature); // Asserting the returned signature
    });

    it('should throw an error if swap fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('API error'),
      });

      await expect(jupiterService.executeSwap(mockQuoteResponse, mockUserKeypair))
        .rejects
        .toThrow('Jupiter swap failed: API error');
    });

    it('should throw an error if transaction confirmation fails', async () => {
      const mockSerializedTransaction = Buffer.from('mockSerializedTransaction');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          swapTransaction: mockSerializedTransaction.toString('base64'),
          lastValidBlockHeight: 123,
        }),
      });

      mockVersionedTransaction.serialize.mockReturnValue(mockSerializedTransaction);
      mockVersionedTransaction.sign.mockImplementation(() => {});

      (mockConnection.confirmTransaction as jest.Mock).mockResolvedValue({ value: { err: 'TransactionFailed' } });

      await expect(jupiterService.executeSwap(mockQuoteResponse, mockUserKeypair))
        .rejects
        .toThrow('Transaction failed: {\"err\":\"TransactionFailed\"}'); // Exact error message check
    });
  });
});
