import { Component, ViewChild } from '@angular/core'
import { Deeplinks } from '@ionic-native/deeplinks'
import { SplashScreen } from '@ionic-native/splash-screen'
import { StatusBar } from '@ionic-native/status-bar'
import { TranslateService } from '@ngx-translate/core'
import { Platform, Nav } from 'ionic-angular'

import { TabsPage } from '../pages/tabs/tabs'
import { TransactionConfirmPage } from '../pages/transaction-confirm/transaction-confirm'
import { WalletImportPage } from '../pages/wallet-import/wallet-import'

@Component({
  templateUrl: 'app.html'
})
export class MyApp {

  @ViewChild(Nav) nav: Nav

  rootPage: any = TabsPage

  constructor(private platform: Platform, statusBar: StatusBar, splashScreen: SplashScreen, private translate: TranslateService, private deeplinks: Deeplinks) {
    this.translate.setDefaultLang('en')
    this.platform.ready().then(() => {
      if (platform.is('cordova')) {
        statusBar.styleLightContent()
        statusBar.backgroundColorByHexString('#00e8cc')
        splashScreen.hide()
      }
    }).catch(err => console.log(err))
  }

  ngAfterViewInit() {
    this.platform.ready().then(() => {
      this.deeplinks.routeWithNavController(this.nav, {
        '/broadcast': TransactionConfirmPage,
        '/import': WalletImportPage
      }).subscribe((match) => {
        // match.$route - the route we matched, which is the matched entry from the arguments to route()
        // match.$args - the args passed in the link
        // match.$link - the full link data
        console.log('Successfully matched route', match)
      }, (nomatch) => {
        // nomatch.$link - the full link data
        console.error('Got a deeplink that didn\'t match', nomatch)
      })
    })
  }

}
