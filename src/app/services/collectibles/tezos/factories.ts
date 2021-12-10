import { getMainIdentifier, ProtocolService } from '@airgap/angular-core'
import {
  ICoinProtocol,
  MainProtocolSymbols,
  TezosFA2Protocol,
  TezosFA2ProtocolConfig,
  TezosFA2ProtocolOptions,
  TezosProtocolNetwork
} from '@airgap/coinlib-core'

import { Collectible } from '../collectibles.types'

import { ObjktCollectibleExplorer } from './explorer/ObjktCollectibleExplorer'
import { isTezosCollectibleDetails, TezosCollectibleExplorer } from './explorer/TezosCollectibleExplorer'

export async function createTezosCollectibleProtocol(protocolService: ProtocolService, collectible: Collectible): Promise<ICoinProtocol> {
  if (!isTezosCollectibleDetails(collectible) || getMainIdentifier(collectible.protocolIdentifier) !== MainProtocolSymbols.XTZ) {
    throw new Error('[collectibles#createTezosProtocol] Unrecognized Collectible structure.')
  }

  const protocolNetwork = await protocolService.getNetworkForProtocol(MainProtocolSymbols.XTZ, collectible.networkIdentifier, false)
  if (!(protocolNetwork instanceof TezosProtocolNetwork)) {
    throw new Error('[collectibles#createTezosProtocol] Unsupported protocol network.')
  }

  return new TezosFA2Protocol(
    new TezosFA2ProtocolOptions(
      protocolNetwork,
      new TezosFA2ProtocolConfig(
        collectible.contract.address,
        collectible.protocolIdentifier,
        collectible.symbol,
        collectible.contract.name,
        collectible.symbol,
        undefined,
        0
      )
    )
  )
}

export function tezosCollectibleExplorer(protocolService: ProtocolService): TezosCollectibleExplorer {
  return new ObjktCollectibleExplorer(protocolService)
}
