var window = self;

// available as airgapCoinLib due to browserify postInstall hook
self.importScripts("../libs/airgap-coin-lib.browserify.js");

self.onmessage = function(event) {
  airgapCoinLib.isCoinlibReady().then(function() {
    console.log("start deriving addresses");

    var wallet = event.data;
    var airGapWallet = new airgapCoinLib.AirGapWallet(
      wallet.protocolIdentifier,
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
