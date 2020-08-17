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

self.onmessage = function(event) {
  airgapCoinLib.isCoinlibReady().then(function() {
    console.log("start deriving addresses");

		var wallet = event.data;
    
    const protocol = airgapCoinLib.getProtocolByIdentifier(wallet.protocolIdentifier)

    var airGapWallet = new airgapCoinLib.AirGapWallet(
      protocol,
      wallet.publicKey,
      wallet.isExtendedPublicKey,
      wallet.derivationPath
    );
    
    airGapWallet.deriveAddresses(50).then(addresses => {
      console.log("derived " + addresses.length + " addresses")
  
      self.postMessage({ addresses });
    })
  })
};
