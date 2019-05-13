import { SplashScreen } from '@ionic-native/splash-screen/ngx'
import { StatusBar } from '@ionic-native/status-bar/ngx'

class ComponentMock {}

export type Spied<T> = { [Method in keyof T]: jasmine.Spy }

export class RouterMock {
  public navigateByUrl = jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve())
  public navigate = jasmine.createSpy('navigate').and.returnValue(Promise.resolve())
}

export class ModalControllerMock {
  public create = jasmine.createSpy('create').and.returnValue(
    Promise.resolve({
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve())
    })
  )
  public dismiss = jasmine.createSpy('dismiss').and.returnValue(Promise.resolve())
}

export class AlertControllerMock {
  public create = jasmine.createSpy('create').and.returnValue(
    Promise.resolve({
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve())
    })
  )
  public dismiss = jasmine.createSpy('dismiss').and.returnValue(Promise.resolve())
}

export class LoadingControllerMock {
  public create = jasmine.createSpy('create').and.returnValue(
    Promise.resolve({
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve())
    })
  )
}

export class ToastControllerMock {
  public create = jasmine.createSpy('create').and.returnValue(
    Promise.resolve({
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve())
    })
  )
}

export class MockActivatedRouteSnapshot {
  private readonly _data: any

  constructor(data: any) {
    this._data = data
  }

  get data() {
    return this._data
  }
}
export class DeviceProviderMock {
  public isRooted = 0

  public checkForRoot() {
    return Promise.resolve(this.isRooted)
  }
}

export class NavParamsMock {
  public static params: any = {}

  public static setParams(value: any) {
    NavParamsMock.params = value
  }

  public get(key: string): any {
    if (NavParamsMock.params[key]) {
      return NavParamsMock.params[key]
    }

    return undefined
  }
}

export class PlatformMock {
  public ready(): Promise<string> {
    return new Promise(resolve => {
      resolve('READY')
    })
  }

  public getQueryParam() {
    return true
  }

  public registerBackButtonAction(fn: Function, priority?: number): Function {
    return () => true
  }

  public hasFocus(ele: HTMLElement): boolean {
    return true
  }

  public doc(): HTMLDocument {
    return document
  }

  public is(): boolean {
    return true
  }

  public getElementComputedStyle(container: any): any {
    return {
      paddingLeft: '10',
      paddingTop: '10',
      paddingRight: '10',
      paddingBottom: '10'
    }
  }

  public onResize(callback: any) {
    return callback
  }

  public registerListener(ele: any, eventName: string, callback: any): Function {
    return () => true
  }

  public win(): Window {
    return window
  }

  public raf(callback: any): number {
    return 1
  }

  public timeout(callback: any, timer: number): any {
    return setTimeout(callback, timer)
  }

  public cancelTimeout(id: any) {
    // do nothing
  }

  public getActiveElement(): any {
    return document.activeElement
  }
}

export class NavMock {
  public pop(): any {
    return new Promise(function(resolve: Function): void {
      resolve()
    })
  }

  public push(ctrl: any, args: any): any {
    return new Promise(function(resolve: Function): void {
      resolve()
    })
  }

  public getActive(): any {
    return {
      instance: {
        model: 'something'
      }
    }
  }

  public setRoot(): any {
    return true
  }

  public registerChildNav(nav: any): void {
    return
  }
}

export class StatusBarMock extends StatusBar {
  public styleDefault() {
    return
  }
}

export class SplashScreenMock extends SplashScreen {
  public hide() {
    return
  }
}

export class DeepLinkerMock {}
