# AirGap Wallet

<p align="left">
    <img src="./banner.png" />
</p>

> Your old smartphone is your new ‘hardware wallet’

[AirGap](https://airgap.it) is a crypto wallet system, that let's you secure cypto assets with one secret on an offline device. The AirGap Wallet application is installed installed on an everyday smartphonem whereas [AirGap Vault](https://github.com/airgap-it/airgap-vault) is installed on a is installed on a dedicated or old smartphone that has no connection to any network, thus it is air gapped.

## Description

AirGap Wallet has an overview of all accounts with their respective balances and transactions and is responsible for transaction creation and for the broadcasting of signed transactions. The mobile application, AirGap Wallet is a hybrid application (using the same codebase for Android and iOS which helps with coordinated development). Created using Ionic framework and AirGap's coin-lib to interact with different protocols.

<p align="left">
    <img src="./devices.png" />
</p>

## Download

- [Google Play](https://play.google.com/store/apps/details?id=it.airgap.wallet)
- [App Store](https://itunes.apple.com/us/app/airgap-wallet/id1420996542?l=de&ls=1&mt=8)

## Features

- Portfolio Overview of accounts synced from AirGap Vault
- Communication with the Vault application over QR codes if installed on a second device or app switching if installed on the same device
- Create transactions for all supported currencies like Aeternity, Ethereum, Bitcoin etc.
- Broadcast signed transactions
- Transaction history for each account

## Build

First follow the steps below to install the dependencies:

```bash
$ npm install -g ionic
$ npm install -g cordova
$ npm install
```

Run locally in browser:

```bash
$ ionic serve
```

Run on device:

```bash
$ ionic cordova platform run android
$ ionic cordova platform run ios
```

## Testing

To run the unit tests:

```bash
$ npm test
```

## Building the Chrome Extension

To build and run the chrome extension, you have to use a different `@ionic/storage` module. Change the following line in your `package.json`:

```
    "@ionic/storage": "2.2.0",
```

to

```
    "@ionic/storage": "git+https://github.com/bb4L/ionic-storage.git#1499e2d3d81626ca61793b01a66b12a9494137bf",
```

After that, you need to run

```bash
npm install
```

You can now build the extension:

```bash
npm run extension:prepare
npm run extension:build:dev
```

**Make sure you have node 11 or later installed, otherwise it might fail during the last step.**

Now you can load the unpacked extension from the `./extension/` folder.

## Security

If you discover a security vulnerability within this application, please send an e-mail to hi@airgap.it. All security vulnerabilities will be promptly addressed.

## Contributing

- If you find any bugs, submit an [issue](../../issues) or open [pull-request](../../pulls), helping us catch and fix them.
- Engage with other users and developers on the [AirGap Telegram](https://t.me/AirGap).
