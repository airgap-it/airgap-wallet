export class OperationsServiceMock {
  public prepareTransaction: jasmine.Spy = jasmine.createSpy('prepareTransaction').and.returnValue(
    new Promise((resolve) => {
      resolve({
        airGapTxs: [],
        unsignedTx: 'test'
      })
    })
  )
}
