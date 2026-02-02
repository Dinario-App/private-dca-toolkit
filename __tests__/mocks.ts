// mocks.ts
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, TransactionSignature } from '@solana/web3';
import { getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction, createTransferInstruction, Account } from '@solana/spl-token';
import { TOKEN_DECIMALS } from '../types'; // Assuming TOKEN_DECIMALS is exported from types

// Mocking Solana Web3 and SPL Token functions
jest.mock('@solana/web3', () => ({
  ...jest.requireActual('@solana/web3'),
  Connection: jest.fn().mockImplementation(() => ({
    getBalance: jest.fn(),
    sendAndConfirmTransaction: jest.fn(),
    getLatestBlockhash: jest.fn(),
    confirmTransaction: jest.fn(),
  })),
  Keypair: {
    generate: jest.fn().mockImplementation(() => ({
      publicKey: { toBase58: () => 'mockUserPublicKey' },
      secretKey: new Uint8Array(32),
    })),
  },
  PublicKey: jest.fn().mockImplementation((key: string = 'mockPublicKey') => ({
    toBase58: () => key,
  })),
  LAMPORTS_PER_SOL: 1000000000,
}));

jest.mock('@solana/spl-token', () => ({
  ...jest.requireActual('@solana/spl-token'),
  getAssociatedTokenAddress: jest.fn(),
  getAccount: jest.fn(),
  createAssociatedTokenAccountInstruction: jest.fn(),
  createTransferInstruction: jest.fn(),
}));

// Mocking fetch for JupiterService
global.fetch = jest.fn();

// Setup for each test suite
export const mockConnection = new Connection('https://mocknet. Example.com'); // Use the mock implementation
export const mockEphemeralKeypair = Keypair.generate(); // Use the mocked Keypair.generate
export const mockUserKeypair = mockKeypair; // Alias for clarity
export const mockEphemeralPubkey = new PublicKey('mockEphemeralPubkey');
export const mockDestinationPubkey = new PublicKey('mockDestinationPubkey');

export const mockGetAssociatedTokenAddress = getAssociatedTokenAddress as jest.Mock;
export const mockGetAccount = getAccount as jest.Mock;
export const mockCreateAssociatedTokenAccountInstruction = createAssociatedTokenAccountInstruction as jest.Mock;
export const mockCreateTransferInstruction = createTransferInstruction as jest.Mock;

// Mock TOKEN_DECIMALS object
export const mockTokenDecimals = {
  SOL: 9,
  USDC: 6,
  USDT: 6,
  BONK: 5,
  WIF: 1,
  JUP: 6,
  ORCA: 6,
  UNKNOWN: 9,
};

// Helper to mock the entire module if needed
export const mockSolanaServices = () => {
  // Mock getAssociatedTokenAddress and getAccount to return placeholder values
  mockGetAssociatedTokenAddress.mockResolvedValue(new PublicKey(`mockAtaAddress${Math.random().toString().substring(2, 8)}`));
  mockGetAccount.mockResolvedValue({ amount: BigInt(0), decimals: 9 } as Account); // Mock account with 0 balance initially
};
