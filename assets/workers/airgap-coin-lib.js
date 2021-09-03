var window = self;

// available as airgapCoinLib due to browserify postInstall hook
self.importScripts("../libs/airgap-coin-lib.browserify.js");

airgapCoinLib.addSupportedProtocol(new airgapCoinLib.AeternityProtocol())
airgapCoinLib.addSupportedProtocol(new airgapCoinLib.BitcoinProtocol())
airgapCoinLib.addSupportedProtocol(new airgapCoinLib.EthereumProtocol())
airgapCoinLib.addSupportedProtocol(new airgapCoinLib.GroestlcoinProtocol())
airgapCoinLib.addSupportedProtocol(new airgapCoinLib.TezosProtocol())
airgapCoinLib.addSupportedProtocol(new airgapCoinLib.CosmosProtocol())
airgapCoinLib.addSupportedProtocol(new airgapCoinLib.KusamaProtocol())
airgapCoinLib.addSupportedProtocol(new airgapCoinLib.PolkadotProtocol())
airgapCoinLib.addSupportedProtocol(new airgapCoinLib.MoonriverProtocol())
airgapCoinLib.addSupportedProtocol(new airgapCoinLib.TezosShieldedTezProtocol())

self.onmessage = event => {

  airgapCoinLib.isCoinlibReady().then(async() => {
    const wallets = event.data;

    Promise.all(wallets.map(wallet => {
      const protocol = airgapCoinLib.getProtocolByIdentifier(wallet.protocolIdentifier)

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
  })

}

               
