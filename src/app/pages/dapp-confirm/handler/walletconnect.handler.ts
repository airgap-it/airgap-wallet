export interface WalletconnectHandler<C> {
  readResult(context: C): Promise<string>
  approveRequest(context: C): Promise<void>
  rejectRequest(context: C): Promise<void>
}
