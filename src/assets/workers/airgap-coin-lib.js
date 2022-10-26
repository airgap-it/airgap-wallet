var window = self;

// available as airgapCoinLib due to browserify postInstall hook
self.importScripts("../libs/airgap-coin-lib.browserify.js");
self.importScripts("../libs/airgap-aeternity.browserify.js");
self.importScripts("../libs/airgap-astar.browserify.js");
self.importScripts("../libs/airgap-bitcoin.browserify.js");
self.importScripts("../libs/airgap-cosmos.browserify.js");
self.importScripts("../libs/airgap-ethereum.browserify.js");
self.importScripts("../libs/airgap-groestlcoin.browserify.js");
self.importScripts("../libs/airgap-moonbeam.browserify.js");
self.importScripts("../libs/airgap-polkadot.browserify.js");
self.importScripts("../libs/airgap-tezos.browserify.js");

const protocols = [
  new airgapCoinLibAeternity.AeternityProtocol(),
  new airgapCoinLibBitcoin.BitcoinProtocol(),
  new airgapCoinLibBitcoin.BitcoinSegwitProtocol(),
  new airgapCoinLibEthereum.EthereumProtocol(),
  new airgapCoinLibGroestlcoin.GroestlcoinProtocol(),
  new airgapCoinLibTezos.TezosProtocol(),
  new airgapCoinLibCosmos.CosmosProtocol(),
  new airgapCoinLibPolkadot.KusamaProtocol(),
  new airgapCoinLibPolkadot.PolkadotProtocol(),
  new airgapCoinLibMoonbeam.MoonriverProtocol(),
  new airgapCoinLibMoonbeam.MoonbeamProtocol(),
  new airgapCoinLibAstar.AstarProtocol(),
  new airgapCoinLibAstar.ShidenProtocol(),
  new airgapCoinLibTezos.TezosShieldedTezProtocol()
]

const getProtocolByIdentifier = (identifier) => {
  return protocols.find((protocol) => protocol.identifier === identifier)
}

self.onmessage = event => {
  const wallets = event.data;

  Promise.all(wallets.map(wallet => {
    const protocol = getProtocolByIdentifier(wallet.protocolIdentifier)

    const airGapWallet = new airgapCoinLib.AirGapWallet(
      protocol,
      wallet.publicKey,
      wallet.isExtendedPublicKey,
      wallet.derivationPath,
      wallet.masterFingerprint,
      wallet.status
    );
    return airGapWallet.deriveAddresses(50).then(addresses => {
      return {addresses: addresses, key: `${wallet.protocolIdentifier}_${wallet.publicKey}`}
    })
  })).then(async (addressesByKeys) => {
    const derivedAddressesMap = addressesByKeys.reduce((obj, addressesByKey) => Object.assign(obj, { [addressesByKey.key]: addressesByKey.addresses }), {})
    self.postMessage(derivedAddressesMap);
  })
}

               
