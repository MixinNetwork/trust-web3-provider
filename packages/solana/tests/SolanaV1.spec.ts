import { expect, jest, test } from 'bun:test';
import { generateKeyPairSync, sign, verify } from 'node:crypto';
import {
  AccountRole,
  address,
  appendTransactionMessageInstruction,
  blockhash,
  compileTransaction,
  createTransactionMessage,
  getTransactionDecoder,
  getTransactionEncoder,
  pipe,
  setTransactionMessageConfig,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type SignatureBytes,
} from '@solana/kit';
import {
  SolanaSignAndSendTransaction,
  SolanaSignTransaction,
} from '@solana/wallet-standard-features';
import { StandardConnect } from '@wallet-standard/features';
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { Web3Provider } from '@trustwallet/web3-provider-core';
import { AdapterStrategy } from '@trustwallet/web3-provider-core/adapter/Adapter';
import type { IHandlerParams } from '@trustwallet/web3-provider-core/adapter/CallbackAdapter';
import * as bs58 from 'bs58';
import { SolanaProvider } from '../SolanaProvider';
import type { ISolanaProviderConfig } from '../types/SolanaProvider';
import { window } from './mocks/window';

global.window = window;

const key = generateKeyPairSync('ed25519');
const otherKey = generateKeyPairSync('ed25519');
const account = address(
  bs58.encode(
    key.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32),
  ),
);
const otherAccount = address(
  bs58.encode(
    otherKey.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32),
  ),
);
const recentBlockhash = blockhash(
  '6VdVbpsv7b5cSekEimjMTddydrikUsbeXQcizEk6LqSn',
);

function v1Transaction({
  multisigner = false,
  presigned = false,
  dataSize = 10,
} = {}) {
  let transaction = compileTransaction(
    pipe(
      createTransactionMessage({ version: 1 }),
      (message) => setTransactionMessageFeePayer(account, message),
      (message) =>
        setTransactionMessageLifetimeUsingBlockhash(
          { blockhash: recentBlockhash, lastValidBlockHeight: 100n },
          message,
        ),
      (message) =>
        setTransactionMessageConfig(
          {
            computeUnitLimit: 200_000,
            loadedAccountsDataSizeLimit: 1_000_000,
            priorityFeeLamports: 500n,
          },
          message,
        ),
      (message) =>
        appendTransactionMessageInstruction(
          {
            programAddress: address(
              'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
            ),
            accounts: multisigner
              ? [{ address: otherAccount, role: AccountRole.READONLY_SIGNER }]
              : [],
            data: new Uint8Array(dataSize).fill(42),
          },
          message,
        ),
    ),
  );
  if (presigned) {
    transaction = {
      ...transaction,
      signatures: {
        ...transaction.signatures,
        [otherAccount]: new Uint8Array(
          sign(null, transaction.messageBytes, otherKey.privateKey),
        ) as SignatureBytes,
      },
    };
  }
  return new Uint8Array(getTransactionEncoder().encode(transaction));
}

function oldTransaction(version: 'legacy' | 0) {
  const publicKey = new PublicKey(account);
  const instruction = SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: publicKey,
    lamports: 1,
  });
  if (version === 0) {
    return new VersionedTransaction(
      new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash,
        instructions: [instruction],
      }).compileToV0Message(),
    ).serialize();
  }
  const transaction = new Transaction({
    feePayer: publicKey,
    recentBlockhash,
  }).add(instruction);
  return new Uint8Array(
    transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }),
  );
}

async function setup(
  config: ISolanaProviderConfig = { supportsV1Transactions: true },
) {
  const provider = new SolanaProvider(config);
  const handler = jest.fn((request: IHandlerParams) => {
    if (request.name === 'requestAccounts') return Promise.resolve([account]);
    const { rawMessage } = request.params as { rawMessage: string };
    return Promise.resolve(
      bs58.encode(
        sign(null, Buffer.from(rawMessage, 'base64'), key.privateKey),
      ),
    );
  });
  new Web3Provider({
    strategy: AdapterStrategy.PROMISES,
    handler,
  }).registerProvider(provider);
  const wallet = provider.getInstanceWithAdapter();
  const { accounts } = await wallet.features[StandardConnect].connect();
  handler.mockClear();
  return { provider, wallet, handler, connectedAccount: accounts[0] };
}

test('V1 capability requires explicit native support on both signing features', () => {
  for (const config of [
    {},
    { supportsV1Transactions: true, useLegacySign: true },
    { supportsV1Transactions: true, disableMobileAdapter: true },
  ]) {
    const wallet = new SolanaProvider(config).getInstanceWithAdapter();
    expect(
      wallet.features[SolanaSignTransaction].supportedTransactionVersions,
    ).toEqual(['legacy', 0]);
    expect(
      wallet.features[SolanaSignAndSendTransaction]
        .supportedTransactionVersions,
    ).toEqual(['legacy', 0]);
  }
  const wallet = new SolanaProvider({
    supportsV1Transactions: true,
  }).getInstanceWithAdapter();
  expect(
    wallet.features[SolanaSignTransaction].supportedTransactionVersions,
  ).toEqual(['legacy', 0, 1]);
  expect(
    wallet.features[SolanaSignAndSendTransaction].supportedTransactionVersions,
  ).toEqual(['legacy', 0, 1]);
});

test('V1 signs a transaction larger than V0 without changing its message or other signatures', async () => {
  const { wallet, handler, connectedAccount } = await setup();
  const bytes = v1Transaction({
    multisigner: true,
    presigned: true,
    dataSize: 1400,
  });
  const original = getTransactionDecoder().decode(new Uint8Array(bytes));
  expect(bytes.length).toBeGreaterThan(1232);
  const [result] = await wallet.features[SolanaSignTransaction].signTransaction(
    { account: connectedAccount, transaction: bytes, chain: 'solana:mainnet' },
  );
  const signed = getTransactionDecoder().decode(result.signedTransaction);
  expect(result.signedTransaction[0]).toBe(0x81);
  expect(signed.messageBytes).toEqual(original.messageBytes);
  expect(signed.signatures[otherAccount]).toEqual(
    original.signatures[otherAccount],
  );
  expect(
    verify(
      null,
      signed.messageBytes,
      key.publicKey,
      signed.signatures[account]!,
    ),
  ).toBeTrue();
  expect(getTransactionDecoder().decode(bytes).signatures[account]).toBeNull();
  expect(handler).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'signRawTransaction',
      network: 'solana',
      params: {
        version: 1,
        broadcast: false,
        raw: Buffer.from(bytes).toString('base64'),
        rawMessage: Buffer.from(original.messageBytes).toString('base64'),
      },
    }),
  );
});

test('Wallet Standard mixed batch preserves legacy, V0 and V1 order', async () => {
  const { wallet, connectedAccount } = await setup();
  const transactions = [
    oldTransaction('legacy'),
    v1Transaction(),
    oldTransaction(0),
  ];
  const results = await wallet.features[SolanaSignTransaction].signTransaction(
    ...transactions.map((transaction) => ({
      account: connectedAccount,
      transaction,
      chain: 'solana:mainnet' as const,
    })),
  );
  expect(results.length).toBe(3);
  results.forEach((result, i) => {
    const decoded = getTransactionDecoder().decode(result.signedTransaction);
    expect(decoded.messageBytes).toEqual(
      getTransactionDecoder().decode(transactions[i]).messageBytes,
    );
    expect(
      verify(
        null,
        decoded.messageBytes,
        key.publicKey,
        decoded.signatures[account]!,
      ),
    ).toBeTrue();
  });
});

test('V1 sends fully signed bytes and forwards RPC options', async () => {
  const { provider, wallet, connectedAccount } = await setup();
  const sendRawTransaction = jest.fn(
    async (bytes: Uint8Array, _options?: unknown) =>
      bs58.encode(getTransactionDecoder().decode(bytes).signatures[account]!),
  );
  provider.connection = {
    sendRawTransaction,
  } as unknown as typeof provider.connection;
  const [result] = await wallet.features[
    SolanaSignAndSendTransaction
  ].signAndSendTransaction({
    account: connectedAccount,
    transaction: v1Transaction(),
    chain: 'solana:mainnet',
    options: {
      skipPreflight: true,
      preflightCommitment: 'confirmed',
      minContextSlot: 42,
      maxRetries: 2,
    },
  });
  expect(sendRawTransaction).toHaveBeenCalledTimes(1);
  expect(sendRawTransaction.mock.calls[0][1]).toEqual({
    skipPreflight: true,
    preflightCommitment: 'confirmed',
    minContextSlot: 42,
    maxRetries: 2,
  });
  expect(result.signature).toEqual(
    new Uint8Array(
      getTransactionDecoder().decode(
        sendRawTransaction.mock.calls[0][0],
      ).signatures[account]!,
    ),
  );
});

test('V1 never broadcasts a partially signed transaction', async () => {
  const { provider } = await setup();
  const sendRawTransaction = jest.fn();
  provider.connection = {
    sendRawTransaction,
  } as unknown as typeof provider.connection;
  await expect(
    provider.signAndSendV1Transaction(v1Transaction({ multisigner: true })),
  ).rejects.toThrow();
  expect(sendRawTransaction).not.toHaveBeenCalled();
});

test('Unsupported V1 batches are rejected before any native approval', async () => {
  const { wallet, handler, connectedAccount } = await setup({});
  await expect(
    wallet.features[SolanaSignTransaction].signTransaction(
      { account: connectedAccount, transaction: oldTransaction(0) },
      { account: connectedAccount, transaction: v1Transaction() },
    ),
  ).rejects.toThrow('not supported');
  expect(handler).not.toHaveBeenCalled();
});

test('V1 rejects malformed bytes and a connected account that is not a signer', async () => {
  const { provider, handler } = await setup();
  const bytes = v1Transaction();
  for (const invalid of [
    new Uint8Array(),
    bytes.slice(0, -1),
    new Uint8Array([...bytes, 0]),
    new Uint8Array(4097).fill(0x81),
    new Uint8Array([0x82]),
  ]) {
    await expect(provider.signV1Transaction(invalid)).rejects.toThrow();
  }
  provider.publicKey = new PublicKey(otherAccount);
  await expect(provider.signV1Transaction(bytes)).rejects.toThrow(
    'not a required signer',
  );
  expect(handler).not.toHaveBeenCalled();
});

test('V1 validates Wallet Standard account and chain before approval', async () => {
  const { wallet, handler, connectedAccount } = await setup();
  await expect(
    wallet.features[SolanaSignTransaction].signTransaction({
      account: { ...connectedAccount },
      transaction: v1Transaction(),
    }),
  ).rejects.toThrow('invalid account');
  await expect(
    wallet.features[SolanaSignTransaction].signTransaction({
      account: connectedAccount,
      transaction: v1Transaction(),
      chain: 'ethereum:mainnet',
    }),
  ).rejects.toThrow('invalid chain');
  expect(handler).not.toHaveBeenCalled();
});

test('V1 propagates native rejection and rejects invalid signatures', async () => {
  const { provider, handler } = await setup();
  handler.mockRejectedValueOnce(new Error('User rejected'));
  await expect(provider.signV1Transaction(v1Transaction())).rejects.toThrow(
    'User rejected',
  );
  handler.mockResolvedValueOnce(bs58.encode(new Uint8Array(63)));
  await expect(provider.signV1Transaction(v1Transaction())).rejects.toThrow(
    'invalid V1 transaction signature',
  );
  handler.mockResolvedValueOnce(bs58.encode(new Uint8Array(64)));
  await expect(provider.signV1Transaction(v1Transaction())).rejects.toThrow(
    'invalid V1 transaction signature',
  );
});

test('V1 snapshots message bytes and signer while native approval is pending', async () => {
  const { provider, handler } = await setup();
  const bytes = v1Transaction();
  const original = getTransactionDecoder().decode(new Uint8Array(bytes));
  handler.mockImplementationOnce(async () => {
    bytes.fill(0);
    provider.publicKey = new PublicKey(otherAccount);
    return bs58.encode(sign(null, original.messageBytes, key.privateKey));
  });
  const result = getTransactionDecoder().decode(
    await provider.signV1Transaction(bytes),
  );
  expect(result.messageBytes).toEqual(original.messageBytes);
  expect(
    verify(
      null,
      result.messageBytes,
      key.publicKey,
      result.signatures[account]!,
    ),
  ).toBeTrue();
});


for (const version of ['legacy', 0, 1] as const) {
  test(`Native ${version} distinguishes sign-only from send and never broadcasts twice`, async () => {
    const { provider, wallet, handler, connectedAccount } = await setup({
      supportsV1Transactions: true,
      nativeTransactionBroadcast: true,
    });
    const sendRawTransaction = jest.fn();
    provider.connection = { sendRawTransaction } as unknown as typeof provider.connection;
    const input = version === 1 ? v1Transaction() : oldTransaction(version);
    const before = getTransactionDecoder().decode(input);
    const [signed] = await wallet.features[SolanaSignTransaction].signTransaction({
      account: connectedAccount, transaction: input, chain: 'solana:mainnet',
    });
    const decoded = getTransactionDecoder().decode(signed.signedTransaction);
    expect(decoded.messageBytes).toEqual(before.messageBytes);
    expect(verify(null, decoded.messageBytes, key.publicKey, decoded.signatures[account]!)).toBeTrue();
    expect(handler.mock.calls).toHaveLength(1);
    expect(handler.mock.calls[0][0].params).toEqual(expect.objectContaining({ broadcast: false }));
    handler.mockClear();
    const [sent] = await wallet.features[SolanaSignAndSendTransaction].signAndSendTransaction({
      account: connectedAccount, transaction: input, chain: 'solana:mainnet',
    });
    expect(handler.mock.calls).toHaveLength(1);
    expect(handler.mock.calls[0][0].name).toBe('signRawTransaction');
    expect(handler.mock.calls[0][0].params).toEqual(expect.objectContaining({ broadcast: true }));
    expect(sent.signature).toEqual(decoded.signatures[account]!);
    expect(sendRawTransaction).not.toHaveBeenCalled();
  });
}

test('Native send failures are propagated without a public RPC retry', async () => {
  const { provider, handler } = await setup({ supportsV1Transactions: true, nativeTransactionBroadcast: true });
  const sendRawTransaction = jest.fn();
  provider.connection = { sendRawTransaction } as unknown as typeof provider.connection;
  handler.mockRejectedValueOnce(new Error('Route broadcast failed'));
  await expect(provider.signAndSendV1Transaction(v1Transaction())).rejects.toThrow('Route broadcast failed');
  expect(sendRawTransaction).not.toHaveBeenCalled();
});


for (const version of ['legacy', 0, 1] as const) {
  test(`Native ${version} rejects custom RPC options before signing or sending`, async () => {
    const { provider, wallet, handler, connectedAccount } = await setup({
      supportsV1Transactions: true, nativeTransactionBroadcast: true,
    });
    const sendRawTransaction = jest.fn();
    provider.connection = { sendRawTransaction } as unknown as typeof provider.connection;
    const transaction = version === 1 ? v1Transaction() : oldTransaction(version);
    for (const options of [
      { skipPreflight: true }, { skipPreflight: false },
      { preflightCommitment: 'confirmed' as const },
      { minContextSlot: 42 }, { maxRetries: 2 },
    ]) {
      await expect(wallet.features[SolanaSignAndSendTransaction].signAndSendTransaction({
        account: connectedAccount, transaction, chain: 'solana:mainnet', options,
      })).rejects.toThrow('does not support custom RPC options');
    }
    expect(handler).not.toHaveBeenCalled();
    expect(sendRawTransaction).not.toHaveBeenCalled();
    await wallet.features[SolanaSignAndSendTransaction].signAndSendTransaction({
      account: connectedAccount, transaction, chain: 'solana:mainnet',
      options: { skipPreflight: undefined, maxRetries: undefined },
    });
    expect(handler.mock.calls).toHaveLength(1);
    expect(handler.mock.calls[0][0].params).toEqual(expect.objectContaining({ broadcast: true }));
  });
}
