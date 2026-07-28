# Mixin Web3 Provider

```
                    ___           ___           ___
      ___          /  /\         /  /\         /  /\          ___
     /__/\        /  /::\       /  /:/        /  /::\        /__/\
     \  \:\      /  /:/\:\     /  /:/        /__/:/\:\       \  \:\
      \__\:\    /  /::\ \:\   /  /:/        _\_ \:\ \:\       \__\:\
      /  /::\  /__/:/\:\_\:\ /__/:/     /\ /__/\ \:\ \:\      /  /::\
     /  /:/\:\ \__\/~|::\/:/ \  \:\    /:/ \  \:\ \:\_\/     /  /:/\:\
    /  /:/__\/    |  |:|::/   \  \:\  /:/   \  \:\_\:\      /  /:/__\/
   /__/:/         |  |:|\/     \  \:\/:/     \  \:\/:/     /__/:/
   \__\/          |__|:|~       \  \::/       \  \::/      \__\/
                   \__\|         \__\/         \__\/

```

A Mixin-flavored modular TypeScript library that offers Web3 interfaces,
enabling Mixin Messenger to connect with decentralized applications.

```
 +----------------+            +------------------+           +---------------+
 |                |            |                  |           |               |
 |      dApps     |  <----->   |   web3 provider  |  <----->  |  your wallet  |
 |                |            |                  |           |               |
 +----------------+            +------------------+           +---------------+

```

## Supported chains

- Cosmos [Docs](/packages/cosmos/README.md)
- Solana - _Wallet Standard fully compatible_ [Docs](/packages/solana/README.md)
- Ethereum _EIP-1193_ [Docs](/packages/ethereum/README.md)
- Aptos [Docs](/packages/aptos/README.md)
- Bitcoin [Docs](/packages/bitcoin/README.md)
- TON [Docs](/packages/ton/README.md)
- TRON [Docs](/packages/tron/README.md)

## Mixin integration

The iOS and Android bundles expose their factories through
`window.mixinwallet`. Embedded dApp browsers use the `_mw_` native message
handler, and the generated provider bundles are named `mixin-min.js` on iOS
and `mixin_min.js` on Android.

# Useful links

[Contributing](/docs/CONTRIBUTING.md)

[Using the library](/docs/USAGE.md)

[Adding a new chain](/docs/ADD_NEW_CHAIN.md)
