var window = self

// available as airgapCoinLib due to browserify postInstall hook
self.importScripts('../libs/airgap-coin-lib.browserify.js')
self.importScripts('../libs/airgap-aeternity.browserify.js')
self.importScripts('../libs/airgap-astar.browserify.js')
self.importScripts('../libs/airgap-bitcoin.browserify.js')
self.importScripts('../libs/airgap-cosmos.browserify.js')
self.importScripts('../libs/airgap-ethereum.browserify.js')
self.importScripts('../libs/airgap-groestlcoin.browserify.js')
self.importScripts('../libs/airgap-moonbeam.browserify.js')
self.importScripts('../libs/airgap-polkadot.browserify.js')
self.importScripts('../libs/airgap-tezos.browserify.js')
self.importScripts('../libs/airgap-icp.browserify.js')
self.importScripts('../libs/airgap-coreum.browserify.js')

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

const getProtocolByIdentifier = async (identifier) => {
  if (identifier === 'icp' || identifier === 'icp_ckbtc') {
    const module = new airgapCoinLibICP.ICPModule()
    let protocol = await module.createOnlineProtocol(identifier)
    protocol.getAddressesFromPublicKey = async (publicKey, cursor) => {
      const address = await protocol.getAddressFromPublicKey({ value: publicKey })
      return [{ address: address }]
    }
    return protocol
  }
  if (identifier === 'coreum') {
    const module = new airgapCoinLibCoreum.CoreumModule()
    let protocol = await module.createOnlineProtocol(identifier)
    protocol.getAddressesFromPublicKey = async (publicKey, cursor) => {
      const address = await protocol.getAddressFromPublicKey({ value: publicKey, type: 'pub', format: 'hex' })
      return [{ address: address }]
    }
    return protocol
  }
  return protocols.find((protocol) => protocol.identifier === identifier)
}

self.onmessage = (event) => {
  const wallets = event.data
  if (wallets.map === undefined) {
    return;
  }

  Promise.all(
    wallets.map(async (wallet) => {
      let protocol = await getProtocolByIdentifier(wallet.protocolIdentifier)

      const airGapWallet = new airgapCoinLib.AirGapWallet(
        protocol,
        wallet.publicKey,
        wallet.isExtendedPublicKey,
        wallet.derivationPath,
        wallet.masterFingerprint,
        wallet.status
      )

      return airGapWallet.deriveAddresses(50).then((addresses) => {
        return { addresses: addresses, key: `${wallet.protocolIdentifier}_${wallet.publicKey}` }
      })
    })
  ).then(async (addressesByKeys) => {
    const derivedAddressesMap = addressesByKeys.reduce(
      (obj, addressesByKey) => Object.assign(obj, { [addressesByKey.key]: addressesByKey.addresses }),
      {}
    )

    self.postMessage(derivedAddressesMap)
  })
}
