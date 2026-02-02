import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';

interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  slippageBps: number;
}

interface SwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
}

export class JupiterService {
  private connection: Connection;
  private baseUrl = 'https://public.jupiterapi.com';

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 50
  ): Promise<QuoteResponse> {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps: slippageBps.toString(),
    });

    const response = await fetch(`${this.baseUrl}/quote?${params}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jupiter quote failed: ${error}`);
    }

    return response.json() as Promise<QuoteResponse>;
  }

  async executeSwap(quote: QuoteResponse, keypair: Keypair): Promise<string> {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Get a fresh swap transaction each attempt (fresh blockhash)
      const swapResponse = await fetch(`${this.baseUrl}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: keypair.publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: {
            priorityLevelWithMaxLamports: {
              maxLamports: 1000000,
              priorityLevel: 'medium'
            }
          },
        }),
      });

      if (!swapResponse.ok) {
        const error = await swapResponse.text();
        throw new Error(`Jupiter swap failed: ${error}`);
      }

      const { swapTransaction, lastValidBlockHeight } =
        (await swapResponse.json()) as SwapResponse;

      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      transaction.sign([keypair]);

      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: true, maxRetries: 3 }
      );

      try {
        const confirmation = await this.connection.confirmTransaction(
          {
            signature,
            blockhash: transaction.message.recentBlockhash,
            lastValidBlockHeight,
          },
          'confirmed'
        );

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        return signature;
      } catch (error: any) {
        if (attempt === maxAttempts || !error.message?.includes('block height exceeded')) {
          throw error;
        }
        // Block height exceeded — retry with fresh transaction
      }
    }

    throw new Error('Swap failed after retries');
  }
}
