export class StorageMock {

  private data = {
    'wallets': [{ 'protocolIdentifier': 'btc', 'publicKey': 'xpub6EWbRuGLw9bTVVU9HE2MqT5QQ7zm9G64QgeZ5SY7qPWbciM7FyyG9BP2id1ewqZipXVWx2racXMMRvF1jB8S4syc1RzYRjnBhuq425KKYx5', 'isExtendedPublicKey': true, 'derivationPath': 'm/44\'/0\'/0\'', 'addresses': [], 'marketSample': [], 'minuteMarketSample': [], 'dailyMarketSample': [], 'hourlyMarketSample': [] }]
  }

  get(key: string) {
    return new Promise((resolve, reject) => {
      resolve(this.data[key])
    })
  }

  set(key: string, value: any) {
    return new Promise((resolve, reject) => {
      this.data[key] = value
      resolve()
    })
  }

}
