import { convertNetworkV0ToV1, createV0TezosFA2Protocol, getMainIdentifier, ProtocolService } from '@airgap/angular-core'
import { ICoinProtocol, MainProtocolSymbols } from '@airgap/coinlib-core'
import { TezosProtocolNetwork } from '@airgap/tezos'

import { Collectible } from '../collectibles.types'

import { ObjktCollectibleExplorer } from './explorer/ObjktCollectibleExplorer'
import { isTezosCollectibleDetails, TezosCollectibleExplorer } from './explorer/TezosCollectibleExplorer'

export async function createTezosCollectibleProtocol(protocolService: ProtocolService, collectible: Collectible): Promise<ICoinProtocol> {
  if (!isTezosCollectibleDetails(collectible) || getMainIdentifier(collectible.protocolIdentifier) !== MainProtocolSymbols.XTZ) {
    throw new Error('[collectibles#createTezosProtocol] Unrecognized Collectible structure.')
  }

  const protocolNetworkV0 = await protocolService.getNetworkForProtocol(MainProtocolSymbols.XTZ, collectible.networkIdentifier, false)
  const protocolNetworkV1 = convertNetworkV0ToV1(protocolNetworkV0) as TezosProtocolNetwork

  return createV0TezosFA2Protocol({
    network: {
      ...protocolNetworkV1,
      contractAddress: collectible.contract.address
    },
    identifier: collectible.protocolIdentifier,
    name: collectible.contract.name,
    units: collectible.symbol
      ? {
          [collectible.symbol]: {
            symbol: { value: collectible.symbol },
            decimals: 0
          }
        }
      : undefined,
    mainUnit: collectible.symbol
  })
}

export function tezosCollectibleExplorer(protocolService: ProtocolService): TezosCollectibleExplorer {
  return new ObjktCollectibleExplorer(protocolService)
}
