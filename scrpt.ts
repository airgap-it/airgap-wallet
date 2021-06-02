import { getProtocolByIdentifier, MainProtocolSymbols } from '@airgap/coinlib-core'

export {}
const run = () => {
  const protocol = getProtocolByIdentifier('polkadot' as MainProtocolSymbols)
  console.log(protocol)
}

run()
