import { omit, pickBy } from 'lodash'
const WALLETCONNECT = 'walletconnect'

interface Dictionary<WalletconnectSession> {
  [Key: string]: WalletconnectSession
}

export const getAllValidWalletConnectSessions = async (): Promise<Dictionary<WalletconnectSession>> => {
  const allSessions = await getAllWalletConnectSessions()
  const now = Date.now()
  return pickBy(allSessions, (value) => value.connected && now < value.expirationDate)
}

export const getAllWalletConnectSessions = async (): Promise<Dictionary<WalletconnectSession>> => {
  const local = localStorage ? await localStorage.getItem(WALLETCONNECT) : null

  let sessions = null
  if (local) {
    try {
      sessions = JSON.parse(local)
    } catch (error) {
      throw error
    }
  }

  return sessions
}

export const saveWalletConnectSession = async (peerId, session) => {
  const allSessions = await getAllValidWalletConnectSessions()
  const expirationDate = Date.now() + 24 * 60 * 60 * 1000
  session = { ...session, expirationDate }
  allSessions[peerId] = session
  await localStorage.setItem(WALLETCONNECT, JSON.stringify(allSessions))
}

export const removeWalletConnectSessions = async (sessionIds) => {
  const allSessions = await getAllWalletConnectSessions()
  const resultingSessions = omit(allSessions, sessionIds)
  await localStorage.setItem(WALLETCONNECT, resultingSessions)
}

export type EMPTY = {}

export const clientMeta = {
  description: 'AirGapped Transactions',
  url: 'https://airgap.it',
  icons: ['https://airgap.it/wp-content/uploads/2018/05/Airgap_Logo_sideways_color.png'],
  name: 'AirGap'
}

export interface ClientMeta {
  description: string
  url: string
  icons: string[]
  name: string
}

export interface PeerMeta {
  description: string
  url: string
  icons: string[]
  name: string
}

export interface WalletconnectSession {
  connected: boolean
  accounts: string[]
  chainId: number
  bridge: string
  key: string
  clientId: string
  clientMeta: ClientMeta
  peerId: string
  peerMeta: PeerMeta
  handshakeId: number
  handshakeTopic: string
}

export interface WalletConnectRequestApproval {
  id: number
  result: string
}
