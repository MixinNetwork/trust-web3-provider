// Copyright © 2017-2022 Trust Wallet.
//
// This file is part of Trust. The full Trust copyright notice, including
// terms governing use, modification, and redistribution, is contained in the
// file LICENSE at the root of the source code distribution tree.

import Foundation
import WebKit

public struct TrustWeb3Provider {
    public struct Config: Equatable {
        public let ethereum: EthereumConfig
        public let solana: SolanaConfig
        public let aptos: AptosConfig
        public let ton: TonConfig
        public let tron: TronConfig
        public let appVersion: String
        public let autoConnect: Bool

        public init(
            ethereum: EthereumConfig,
            solana: SolanaConfig,
            aptos: AptosConfig = AptosConfig(network: "Mainnet", chainId: "1"),
            ton: TonConfig,
            // No default: an empty nodeURL silently disables the TRON provider
            // (tronWeb never constructed), so every call site must decide.
            tron: TronConfig,
            appVersion: String,
            autoConnect: Bool
        ) {
            self.ethereum = ethereum
            self.solana = solana
            self.aptos = aptos
            self.ton = ton
            self.tron = tron
            self.appVersion = appVersion
            self.autoConnect = autoConnect
        }

        public struct EthereumConfig: Equatable {
            public let address: String
            public let chainId: Int
            public let rpcUrl: String

            public init(address: String, chainId: Int, rpcUrl: String) {
                self.address = address
                self.chainId = chainId
                self.rpcUrl = rpcUrl
            }
        }

        public struct SolanaConfig: Equatable {
            public let cluster: String

            public init(cluster: String) {
                self.cluster = cluster
            }
        }

        public struct TonConfig: Equatable {
            public init() {
            }
        }

        public struct AptosConfig: Equatable {
            public let network: String
            public let chainId: String

            public init(network: String, chainId: String) {
                self.network = network
                self.chainId = chainId
            }
        }

        public struct TronConfig: Equatable {
            public let nodeURL: String

            public init(nodeURL: String) {
                self.nodeURL = nodeURL
            }
        }
    }

    private class dummy {}
    private static let filename = "mixin-min"
    public static let scriptHandlerName = "_mw_"
    public let config: Config

    public var providerJsUrl: URL {
        Self.providerJsUrl
    }

    public static var providerJsUrl: URL {
#if COCOAPODS
        let bundle = Bundle(for: TrustWeb3Provider.dummy.self)
        let bundleURL = bundle.resourceURL?.appendingPathComponent("TrustWeb3Provider.bundle")
        let resourceBundle = Bundle(url: bundleURL!)!
        return resourceBundle.url(forResource: filename, withExtension: "js")!
#else
        return Bundle.module.url(forResource: filename, withExtension: "js")!
#endif
    }

    public var providerScript: WKUserScript {
        Self.cachedProviderScript
    }

    // Built once: the bundled resource is immutable and config-independent,
    // and this sits on the per-navigation path — re-reading the 2MB file on
    // the main actor for every goTo(url:) is pure waste.
    private static let cachedProviderScript: WKUserScript = {
        // Explicit encoding: the no-encoding initializer runs Foundation's
        // encoding *detection*, which fails on this BOM-less 2MB generated
        // file (single 62K-char lines) and turned try! into a crash.
        let source = try! String(contentsOf: providerJsUrl, encoding: .utf8)
        return WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: false)
    }()

    public var injectScript: WKUserScript {
        let source = """
        (function() {
            const config = {
                ethereum: {
                    address: "\(config.ethereum.address)",
                    chainId: \(config.ethereum.chainId),
                    rpcUrl: "\(config.ethereum.rpcUrl)"
                },
                solana: {
                    cluster: "\(config.solana.cluster)",
                    // @todo: remove this when mobile supports versioned transactions
                    useLegacySign: true
                },
                aptos: {
                    network: "\(config.aptos.network)",
                    chainId: "\(config.aptos.chainId)"
                },
                tron: {
                    nodeURL: "\(config.tron.nodeURL)"
                }
            };

            const strategy = 'CALLBACK';

            try {
                const core = mixinwallet.core(strategy, (params) => {
                     // Disabled methods
                    if (params.name === 'wallet_requestPermissions') {
                        core.sendResponse(params.id, null);
                        return;
                    }

                  webkit.messageHandlers._mw_.postMessage(params);
                });

                // Generate instances
                const ethereum = mixinwallet.ethereum(config.ethereum);
                // Route unhandled JSON-RPC reads (eth_blockNumber, eth_call, etc.)
                // through the native bridge instead of fetch(rpcUrl). Page CSP can't
                // reach Trust's RPC subdomain from JS (the original SC-138054 break);
                // native HTTP is outside the WebView's policy boundary.
                if (typeof mixinwallet.nativeRpc === 'function' && typeof ethereum.setRPC === 'function') {
                  ethereum.setRPC(mixinwallet.nativeRpc(ethereum));
                }
                const solana = mixinwallet.solana(config.solana);
                const cosmos = mixinwallet.cosmos();
                const aptos = mixinwallet.aptos(config.aptos);
                const ton = mixinwallet.ton();
                const tron = mixinwallet.tron(config.tron);
                const bitcoin = mixinwallet.bitcoin();

                const mixinLogoDataUrl =
                  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiByeD0iMjU2IiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfMjc2NV8yKSIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTM4MS43NDkgMTU3QzM4My43NTggMTU3IDM4NS4zOTMgMTU4LjU5OCAzODUuNDU0IDE2MC41OTJMMzg1LjQ1NiAxNjAuNzA3VjM1Mi4yOTJDMzg1LjQ1NiAzNTIuODQyIDM4NS4zMzMgMzUzLjM4NiAzODUuMDk3IDM1My44ODNDMzg0LjIzNiAzNTUuNjk2IDM4Mi4wOTQgMzU2LjQ4OCAzODAuMjY4IDM1NS42OUwzODAuMTU4IDM1NS42NEwzMzIuNjM0IDMzMy4wNTZDMzMwLjQyIDMzMi4wMDMgMzI4Ljk5MiAzMjkuNzk1IDMyOC45MzMgMzI3LjM1M0wzMjguOTMxIDMyNy4xOTZWMTgyLjUzOEMzMjguOTMxIDE3OS45NDkgMzMwLjQ3IDE3Ny42MTMgMzMyLjgzNiAxNzYuNTg3TDMzMi45NzYgMTc2LjUyOEwzODAuMzU0IDE1Ny4yNzNDMzgwLjc5NyAxNTcuMDkzIDM4MS4yNzEgMTU3IDM4MS43NDkgMTU3Wk0xMjkuNzA3IDE1N0MxMzAuMTg1IDE1NyAxMzAuNjU5IDE1Ny4wOTMgMTMxLjEwMiAxNTcuMjczTDE3OC40OCAxNzYuNTI4QzE4MC45MjUgMTc3LjUyMiAxODIuNTI0IDE3OS44OTggMTgyLjUyNCAxODEuNTM4VjMyNi4xOTZDMTgyLjUyNCAzMjguNyAxODEuMDgzIDMzMC45ODEgMTc4LjgyMiAzMzIuMDU2TDEzMS4yOTcgMzU0LjY0QzEyOS40NDggMzU1LjUxOSAxMjcuMjM3IDM1NC43MzIgMTI2LjM1OSAzNTIuODgzQzEyNi4xMjMgMzUyLjM4NiAxMjYgMzUxLjg0MiAxMjYgMzUxLjI5MlYxNTkuNzA3QzEyNiAxNTcuNjYgMTI3LjY1OSAxNTYgMTI5LjcwNyAxNTZaTTI1OS44OTggMTk3Ljg0N0wzMDMuNzE5IDIyMy4xNTFDMzA2LjMgMjI0LjY0MSAzMDcuODg5IDIyNy4zOTUgMzA3Ljg4OSAyMzAuMzc1VjI4MC45ODJDMzA3Ljg4OSAyODMuOTYyIDMwNi4zIDI4Ni43MTYgMzAzLjcxOSAyODguMjA2TDI1OS44OTggMzEzLjUxQzI1Ny4zMTcgMzE0Ljk5OSAyNTQuMTM4IDMxNC45OTkgMjUxLjU1OCAzMTMuNTFMMjA3LjczNiAyODguMjA2QzIwNS4xNTYgMjg2LjcxNiAyMDMuNTY2IDI4My45NjIgMjAzLjU2NiAyODAuOTgyVjIzMC4zNzVDMjAzLjU2NiAyMjcuMzk1IDIwNS4xNTYgMjI0LjY0MSAyMDcuNzM2IDIyMy4xNTFMMjUxLjU1OCAxOTcuODQ3QzI1NC4xMzggMTk2LjM1NyAyNTcuMzE3IDE5Ni4zNTcgMjU5Ljg5OCAxOTcuODQ3WiIgZmlsbD0id2hpdGUiLz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8yNzY1XzIiIHgxPSIxMy41IiB5MT0iNTEyIiB4Mj0iNTEyIiB5Mj0iLTEuNjE4NzNlLTA1IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPBlVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMyQTVCRjYiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNTI5RkY5Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg==';

                const walletInfo = {
                  deviceInfo: {
                    platform: 'iphone',
                    appName: 'mixinMessengerTon',
                    appVersion: "\(config.appVersion)",
                    maxProtocolVersion: 2,
                    features: [
                      'SendTransaction',
                      {
                        name: 'SendTransaction',
                        maxMessages: 4,
                      },
                    ],
                  },
                  walletInfo: {
                    name: 'Mixin Messenger',
                    image: mixinLogoDataUrl,
                    about_url: 'https://mixin.one',
                  },
                  isWalletBrowser: \(config.autoConnect),
                };

                const tonBridge = mixinwallet.tonBridge(walletInfo, ton);

                core.registerProviders([ethereum, solana, cosmos, aptos, ton, tron, bitcoin].map(provider => {
                  provider.sendResponse = core.sendResponse.bind(core);
                  provider.sendError = core.sendError.bind(core);
                  return provider;
                }));

                window.mixinwalletTon = { tonconnect: tonBridge, provider: ton };

                // Custom methods
                ethereum.emitChainChanged = (chainId) => {
                  ethereum.setChainId('0x' + parseInt(chainId || '1').toString(16));
                  ethereum.emit('chainChanged', ethereum.getChainId());
                  ethereum.emit('networkChanged', parseInt(chainId || '1'));
                };

                ethereum.setConfig = (config) => {
                  ethereum.setChainId('0x' + parseInt(config.ethereum.chainId || '1').toString(16));
                  ethereum.setAddress(config.ethereum.address);
                    if (config.ethereum.rpcUrl) {
                      ethereum.setRPCUrl(config.ethereum.rpcUrl);
                    }
                };
                // End custom methods

                cosmos.mode = 'extension';
                cosmos.providerNetwork = 'cosmos';
                cosmos.isKeplr = true;
                cosmos.version = "0.12.106";

                cosmos.enable = (chainIds)  => {
                  console.log(`==> enabled for ${chainIds}`);
                };

                // Attach to window
                mixinwallet.ethereum = ethereum;
                mixinwallet.solana = solana;
                mixinwallet.cosmos = cosmos;
                mixinwallet.MixinCosmos = mixinwallet.cosmos;
                mixinwallet.aptos = aptos;
                mixinwallet.ton = ton;
                mixinwallet.tron = tron;
                mixinwallet.bitcoin = bitcoin;

                window.ethereum = mixinwallet.ethereum;
                window.keplr = mixinwallet.cosmos;
                window.aptos = mixinwallet.aptos;
                window.ton = mixinwallet.ton;

                // TRON dapps discover wallets through the TronLink globals
                // (window.tronLink + window.tronWeb + the initialized event),
                // the same way Cosmos dapps find us via window.keplr.
                if (tron.tronWeb) {
                  window.tronLink = tron;
                  window.tronWeb = tron.tronWeb;
                  window.dispatchEvent(new Event('tronLink#initialized'));
                }

                const getDefaultCosmosProvider = (chainId) => {
                  return mixinwallet.cosmos.getOfflineSigner(chainId);
                };

                window.getOfflineSigner = getDefaultCosmosProvider;
                window.getOfflineSignerOnlyAmino = getDefaultCosmosProvider;
                window.getOfflineSignerAuto = getDefaultCosmosProvider;

                Object.assign(window.mixinwallet, {
                  isMixin: true,
                  isMixinWallet: true,
                  request: ethereum.request.bind(ethereum),
                  send: ethereum.send.bind(ethereum),
                  on: (...params) => ethereum.on(...params),
                  off: (...params) => ethereum.off(...params),
                });

                const provider = ethereum;
                const proxyMethods = ['chainId', 'networkVersion', 'address', 'enable', 'send'];

                // Attach properties to the Mixin wallet object (legacy props)
                const proxy = new Proxy(window.mixinwallet, {
                  get(target, prop, receiver) {
                    if (proxyMethods.includes(prop)) {
                      switch (prop) {
                        case 'chainId':
                          return ethereum.getChainId.bind(provider);
                        case 'networkVersion':
                          return ethereum.getNetworkVersion.bind(provider);
                        case 'address':
                          return ethereum.getAddress.bind(provider);
                        case 'enable':
                          return ethereum.enable.bind(provider);
                        case 'send':
                          return ethereum.send.bind(provider);
                      }
                    }

                    return Reflect.get(target, prop, receiver);
                  },
                });

                window.mixinwallet = proxy;

                const info = {
                  uuid: crypto.randomUUID(),
                  name: 'Mixin Messenger',
                  icon: mixinLogoDataUrl,
                  rdns: 'one.mixin.messenger',
                };

                const announceEvent = new CustomEvent('eip6963:announceProvider', {
                  detail: Object.freeze({ info, provider: ethereum }),
                });

                window.dispatchEvent(announceEvent);

                window.addEventListener('eip6963:requestProvider', () => {
                   window.dispatchEvent(announceEvent);
                });
            } catch (e) {
              console.error(e)
            }
        })();
        """
        return WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: false)
    }

    public init(config: Config) {
        self.config = config
    }
}
