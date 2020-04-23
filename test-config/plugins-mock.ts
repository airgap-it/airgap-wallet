import { newSpy } from './unit-test-helper'

export class SplashScreenMock {
  public hide: jasmine.Spy = newSpy('hide', Promise.resolve())
}
