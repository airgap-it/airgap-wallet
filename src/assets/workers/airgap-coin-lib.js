var window = self;

// available as airgapCoinLib due to browserify postInstall hook
self.importScripts("../libs/airgap-coin-lib.browserify.js");

self.onmessage = function(event) {
  console.log("start deriving addresses");
  let wallet = event.data;
  let airGapWallet = new airgapCoinLib.AirGapWallet(
    wallet.protocolIdentifier,
    wallet.publicKey,
    wallet.isExtendedPublicKey,
    wallet.derivationPath
  );

  let addresses = airGapWallet.deriveAddresses(50);
  console.log(
    "derived addresses for",
    wallet.protocolIdentifier,
    wallet.publicKey,
    addresses
  );

  self.postMessage({ addresses });
};
