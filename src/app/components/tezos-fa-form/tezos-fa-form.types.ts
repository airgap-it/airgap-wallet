import { UIResource } from '@airgap/angular-core'
import { ICoinProtocol, TezosNetwork } from '@airgap/coinlib-core'
import { TezosFATokenMetadata } from '@airgap/coinlib-core/protocols/tezos/types/fa/TezosFATokenMetadata'

export enum TokenInterface {
  FA1p2 = 'TZIP-007',
  FA2 = 'TZIP-012'
}

export interface TokenDetails {
  id: number
  name: string
}

export interface TokenDetailsInput { 
  address: string
  network: TezosNetwork
  tokenInterface?: TokenInterface
  tokenID?: number
}

export interface TezosFAFormState {
  tokenInterface: UIResource<TokenInterface>
  tokenID: UIResource<number>

  tokenInterfaces: TokenInterface[]
  tokens: TokenDetails[]
  networks: TezosNetwork[]

  protocol: UIResource<ICoinProtocol>
  
  errorDescription: string | undefined
}

// error

export enum TezosFAFormErrorType {
  CONTRACT_NOT_FOUND = 'contract-not-found',
  INTERFACE_UNKNOWN = 'interface-unknown',
  TOKEN_METADATA_MISSING = 'token-metadata-missing',
  TOKEN_VAGUE = 'token-vague',
  UNKNOWN = 'unknown'
}

interface TezosFAFormBaseError<T extends TezosFAFormErrorType> {
  type: T
}

interface ContractNotFoundError extends TezosFAFormBaseError<TezosFAFormErrorType.CONTRACT_NOT_FOUND> {}
interface InterfaceUnknownError extends TezosFAFormBaseError<TezosFAFormErrorType.INTERFACE_UNKNOWN> { tokenInterfaces: TokenInterface[] }
interface TokenMetadataMissingError extends TezosFAFormBaseError<TezosFAFormErrorType.TOKEN_METADATA_MISSING> {}
interface TokenVagueError extends TezosFAFormBaseError<TezosFAFormErrorType.TOKEN_VAGUE> { tokens: TokenDetails[] }
interface UnknownError extends TezosFAFormBaseError<TezosFAFormErrorType.UNKNOWN> {}

export type TezosFAFormError = 
  | ContractNotFoundError 
  | InterfaceUnknownError 
  | TokenMetadataMissingError 
  | TokenVagueError 
  | UnknownError

export function contractNotFoundError(): ContractNotFoundError {
  return { type: TezosFAFormErrorType.CONTRACT_NOT_FOUND }
}

export function interfaceUnknownError(tokenInterfaces: TokenInterface[] = Object.values(TokenInterface)): InterfaceUnknownError {
  return { type: TezosFAFormErrorType.INTERFACE_UNKNOWN, tokenInterfaces }
}

export function tokenMetadataMissingError(): TokenMetadataMissingError {
  return { type: TezosFAFormErrorType.TOKEN_METADATA_MISSING }
}

export function tokenVaugeError(tokenMetadataRegistry: Record<number, TezosFATokenMetadata>): TokenVagueError {
  const tokens = Object.entries(tokenMetadataRegistry).map(([tokenID, tokenMetadata]) => ({
    id: parseInt(tokenID),
    name: tokenMetadata.name
  }))
  return { type: TezosFAFormErrorType.TOKEN_VAGUE, tokens }
}

export function unknownError(): UnknownError {
  return { type: TezosFAFormErrorType.UNKNOWN }
}

export function isTezosFAFormError(error: unknown): error is TezosFAFormError {
  return typeof error === 'object' && Object.values(TezosFAFormErrorType).includes(error['type'])
}