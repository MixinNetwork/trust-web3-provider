# Trust Web3 Provider

```

//   __   __
//  /__` /  \ |     /\  |\ |  /\
//  .__/ \__/ |___ /~~\ | \| /~~\
//

```

### Solana JavaScript Provider Implementation that uses Wallet Standard

### Config Object

```typescript
const config: {
  isMixin?: boolean;
  enableAdapter?: boolean;
  cluster?: string;
  disableMobileAdapter?: boolean;
  useLegacySign?: boolean;
  supportsV1Transactions?: boolean;
} = {};
```

### Usage

```typescript
const solana = new SolanaProvider(config);
```

### V1 transactions

V1 is supported through the Wallet Standard `solana:signTransaction` and
`solana:signAndSendTransaction` features. Set `supportsV1Transactions: true`
only after the native client supports V1 parsing, transaction review, fee
handling, and signing. It defaults to false; `useLegacySign` or
`disableMobileAdapter` also disables V1 support. Both signing features advertise
`1` only when this native capability is enabled.

V1 signing uses Solana Kit while legacy/V0 retain the existing web3.js API. The
native `signRawTransaction` request carries `version: 1`, `raw` (base64
serialized transaction) and `rawMessage` (base64 message to sign). The native
signer must return a base58-encoded 64-byte signature over that exact message.
It must not rewrite the message or its resource limits. The provider preserves
other signatures and rejects a transaction that does not require the connected
account to sign. Sending requires all signatures to be present.

The object-based `signTransaction`, `signAllTransactions`, and
`signRawTransactionMulti` APIs retain their web3.js legacy/V0 contract. Dapps
should pass V1 bytes through Wallet Standard.
