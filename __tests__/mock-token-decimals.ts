# Mock Token Decimals for Testing

This file provides mock token decimal values for Jest tests, intended to be used with `__tests__/mocks.ts`.

## Token Decimals

```typescript
export const mockTokenDecimals = {
  SOL: 9,
  USDC: 6,
  USDT: 6,
  BONK: 5,
  WIF: 1,
  JUP: 6,
  ORCA: 6,
  UNKNOWN: 9, // Default for unknown tokens
};
```

**Usage:**
Import and use `mockTokenDecimals` in your test files or mock modules where `TOKEN_DECIMALS` is required.
