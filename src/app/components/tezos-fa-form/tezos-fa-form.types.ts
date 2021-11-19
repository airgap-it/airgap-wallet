import { UIResource } from '@airgap/angular-core'
import { ICoinProtocol, ProtocolNetwork } from '@airgap/coinlib-core'

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
  networkIdentifier: string
  tokenInterface?: TokenInterface
  tokenID?: number
}

export interface TezosFAFormState {
  tokenInterface: UIResource<TokenInterface>
  tokenID: UIResource<number>

  tokenInterfaces: TokenInterface[]
  tokens: TokenDetails[]
  networks: ProtocolNetwork[]

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

export interface ContractNotFoundError extends TezosFAFormBaseError<TezosFAFormErrorType.CONTRACT_NOT_FOUND> {}
export interface InterfaceUnknownError extends TezosFAFormBaseError<TezosFAFormErrorType.INTERFACE_UNKNOWN> { tokenInterfaces: TokenInterface[] }
export interface TokenMetadataMissingError extends TezosFAFormBaseError<TezosFAFormErrorType.TOKEN_METADATA_MISSING> {}
export interface TokenVagueError extends TezosFAFormBaseError<TezosFAFormErrorType.TOKEN_VAGUE> { tokens: TokenDetails[] }
export interface UnknownError extends TezosFAFormBaseError<TezosFAFormErrorType.UNKNOWN> {
  error?: any
}

export type TezosFAFormError = 
  | ContractNotFoundError 
  | InterfaceUnknownError 
  | TokenMetadataMissingError 
  | TokenVagueError 
  | UnknownError
