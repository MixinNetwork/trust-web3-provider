(function () {
  const config = {
    ethereum: {
      chainId: '0x' + Number($chainId).toString(16),
      rpcUrl: '$rpcUrl',
    },
    solana: {
      cluster: 'mainnet-beta',
    },
  };

  const core = mixinwallet.core('CALLBACK', (params) => {
    window._mw_.postMessage(JSON.stringify(params));
  });
  const ethereum = mixinwallet.ethereum(config.ethereum);
  const solana = mixinwallet.solana(config.solana);

  core.registerProviders([ethereum, solana].map((provider) => {
    provider.sendResponse = core.sendResponse.bind(core);
    provider.sendError = core.sendError.bind(core);
    return provider;
  }));

  mixinwallet.ethereum = ethereum;
  mixinwallet.solana = solana;
  window.ethereum = ethereum;
  window.solana = solana;

  const info = {
    uuid:
      window.crypto && typeof window.crypto.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
            const random = Math.floor(Math.random() * 16);
            const value = char === 'x' ? random : (random & 0x3) | 0x8;
            return value.toString(16);
          }),
    name: 'Mixin Messenger',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiByeD0iMjU2IiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfMjc2NV8yKSIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTM4MS43NDkgMTU3QzM4My43NTggMTU3IDM4NS4zOTMgMTU4LjU5OCAzODUuNDU0IDE2MC41OTJMMzg1LjQ1NiAxNjAuNzA3VjM1Mi4yOTJDMzg1LjQ1NiAzNTIuODQyIDM4NS4zMzMgMzUzLjM4NiAzODUuMDk3IDM1My44ODNDMzg0LjIzNiAzNTUuNjk2IDM4Mi4wOTQgMzU2LjQ4OCAzODAuMjY4IDM1NS42OUwzODAuMTU4IDM1NS42NEwzMzIuNjM0IDMzMy4wNTZDMzMwLjQyIDMzMi4wMDMgMzI4Ljk5MiAzMjkuNzk1IDMyOC45MzMgMzI3LjM1M0wzMjguOTMxIDMyNy4xOTZWMTgyLjUzOEMzMjguOTMxIDE3OS45NDkgMzMwLjQ3IDE3Ny42MTMgMzMyLjgzNiAxNzYuNTg3TDMzMi45NzYgMTc2LjUyOEwzODAuMzU0IDE1Ny4yNzNDMzgwLjc5NyAxNTcuMDkzIDM4MS4yNzEgMTU3IDM4MS43NDkgMTU3Wk0xMjkuNzA3IDE1N0MxMzAuMTg1IDE1NyAxMzAuNjU5IDE1Ny4wOTMgMTMxLjEwMiAxNTcuMjczTDE3OC40OCAxNzYuNTI4QzE4MC45MjUgMTc3LjUyMiAxODIuNTI0IDE3OS44OTggMTgyLjUyNCAxODIuNTM4VjMyNy4xOTZDMTgyLjUyNCAzMjkuNyAxODEuMDgzIDMzMS45ODEgMTc4LjgyMiAzMzMuMDU2TDEzMS4yOTcgMzU0LjY0QzEyOS40NDggMzU1LjUxOSAxMjcuMjM3IDM1NC43MzIgMTI2LjM1OSAzNTIuODgzQzEyNi4xMjMgMzUyLjM4NiAxMjYgMzUxLjg0MiAxMjYgMzUxLjI5MlYxNTkuNzA3QzEyNiAxNTcuNjYgMTI3LjY1OSAxNTYgMTI5LjcwNyAxNTZaTTI1OS44OTggMTk3Ljg0N0wzMDMuNzE5IDIyMy4xNTFDMzA2LjMgMjI0LjY0MSAzMDcuODg5IDIyNy4zOTUgMzA3Ljg4OSAyMzAuMzc1VjI4MC45ODJDMzA3Ljg4OSAyODMuOTYyIDMwNi4zIDI4Ni43MTYgMzAzLjcxOSAyODguMjA2TDI1OS44OTggMzEzLjUxQzI1Ny4zMTcgMzE0Ljk5OSAyNTQuMTM4IDMxNC45OTkgMjUxLjU1OCAzMTMuNTFMMjA3LjczNiAyODguMjA2QzIwNS4xNTYgMjg2LjcxNiAyMDMuNTY2IDI4My45NjIgMjAzLjU2NiAyODAuOTgyVjIzMC4zNzVDMjAzLjU2NiAyMjcuMzk1IDIwNS4xNTYgMjI0LjY0MSAyMDcuNzM2IDIyMy4xNTFMMjUxLjU1OCAxOTcuODQ3QzI1NC4xMzggMTk2LjM1NyAyNTcuMzE3IDE5Ni4zNTcgMjU5Ljg5OCAxOTcuODQ3WiIgZmlsbD0id2hpdGUiLz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8yNzY1XzIiIHgxPSIxMy41IiB5MT0iNTEyIiB4Mj0iNTEyIiB5Mj0iLTEuNjE4NzNlLTA1IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPBlVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMyQTVCRjYiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNTI5RkY5Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg==',
    rdns: 'one.mixin.messenger',
  };
  const announceEvent = new CustomEvent('eip6963:announceProvider', {
    detail: Object.freeze({ info, provider: ethereum }),
  });

  window.dispatchEvent(announceEvent);
  window.addEventListener('eip6963:requestProvider', () => {
    window.dispatchEvent(announceEvent);
  });
})();
