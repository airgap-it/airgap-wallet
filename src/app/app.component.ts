import { Component, ViewChild } from '@angular/core'
import { Deeplinks } from '@ionic-native/deeplinks'
import { SplashScreen } from '@ionic-native/splash-screen'
import { StatusBar } from '@ionic-native/status-bar'
import { TranslateService } from '@ngx-translate/core'
import { Platform, Nav } from 'ionic-angular'

import { TabsPage } from '../pages/tabs/tabs'
import { TransactionConfirmPage } from '../pages/transaction-confirm/transaction-confirm'
import { WalletImportPage } from '../pages/wallet-import/wallet-import'

import { configureScope } from '@sentry/browser'
import { AppVersion } from '@ionic-native/app-version'
import { SchemeRoutingProvider } from '../providers/scheme-routing/scheme-routing'

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav)
  nav: Nav

  rootPage: any = TabsPage

  constructor(
    private platform: Platform,
    private statusBar: StatusBar,
    private splashScreen: SplashScreen,
    private translate: TranslateService,
    private deeplinks: Deeplinks,
    private appVersion: AppVersion,
    private schemeRoutingProvider: SchemeRoutingProvider
  ) {
    this.translate.setDefaultLang('en')
    this.platform
      .ready()
      .then(() => {
        if (platform.is('cordova')) {
          this.statusBar.styleLightContent()
          this.statusBar.backgroundColorByHexString('#00e8cc')
          this.splashScreen.hide()
          configureScope(scope => {
            scope.addEventProcessor(async event => {
              event.release = await this.appVersion.getVersionNumber()
              return event
            })
          })
        } else {
          configureScope(scope => {
            scope.addEventProcessor(async event => {
              event.release = 'browser'
              return event
            })
          })
        }

        this.translate.setDefaultLang('en')

        const supportedLanguages = ['en', 'de', 'zh-cn']
        const language = this.translate.getBrowserLang()

        if (language) {
          const lowerCaseLanguage = language.toLowerCase()
          supportedLanguages.forEach(supportedLanguage => {
            if (supportedLanguage.startsWith(lowerCaseLanguage)) {
              this.translate.use(supportedLanguage)
            }
          })
        }
      })
      .catch(err => console.log(err))
  }

  async ngAfterViewInit() {
    await this.platform.ready()
    this.deeplinks
      .route({
        '/': null
      })
      .subscribe(
        match => {
          // match.$route - the route we matched, which is the matched entry from the arguments to route()
          // match.$args - the args passed in the link
          // match.$link - the full link data
          console.log('Successfully matched route', JSON.stringify(match))
          this.schemeRoutingProvider.handleNewSyncRequest(this.nav, match.$link.url)
        },
        nomatch => {
          // nomatch.$link - the full link data
          console.error("Got a deeplink that didn't match", JSON.stringify(nomatch))
        }
      )
  }
}
