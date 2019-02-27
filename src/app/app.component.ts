import { Component, ViewChild } from '@angular/core'
import { Deeplinks } from '@ionic-native/deeplinks'
import { SplashScreen } from '@ionic-native/splash-screen'
import { StatusBar } from '@ionic-native/status-bar'
import { TranslateService } from '@ngx-translate/core'
import { Platform, Nav } from 'ionic-angular'

import { TabsPage } from '../pages/tabs/tabs'

import { AppVersion } from '@ionic-native/app-version'
import { SchemeRoutingProvider } from '../providers/scheme-routing/scheme-routing'
import { setSentryRelease, handleErrorSentry, ErrorCategory } from '../providers/sentry-error-handler/sentry-error-handler'
import { ProtocolsProvider } from '../providers/protocols/protocols'

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
    private schemeRoutingProvider: SchemeRoutingProvider,
    private protocolsProvider: ProtocolsProvider
  ) {
    this.initializeApp().catch(handleErrorSentry(ErrorCategory.OTHER))
  }

  async initializeApp() {
    const supportedLanguages = ['en', 'de', 'zh-cn']

    this.loadLanguages(supportedLanguages)
    this.protocolsProvider.addProtocols()

    await this.platform.ready()

    if (this.platform.is('cordova')) {
      this.statusBar.styleLightContent()
      if (this.platform.is('ios')) {
        this.statusBar.backgroundColorByHexString('#00E8CC')
      } else if (this.platform.is('android')) {
        this.statusBar.backgroundColorByHexString('#FFFFFF')
      }
      this.splashScreen.hide()
      setSentryRelease(await this.appVersion.getVersionNumber())
    } else {
      setSentryRelease('browser') // TODO: Set version in CI once we have browser version
    }
  }

  loadLanguages(supportedLanguages: string[]) {
    this.translate.setDefaultLang('en')

    const language = this.translate.getBrowserLang()

    if (language) {
      const lowerCaseLanguage = language.toLowerCase()
      supportedLanguages.forEach(supportedLanguage => {
        if (supportedLanguage.startsWith(lowerCaseLanguage)) {
          this.translate.use(supportedLanguage)
        }
      })
    }
  }

  async ngAfterViewInit() {
    await this.platform.ready()
    if (this.platform.is('cordova')) {
      const handleMatch = match => {
        // match.$route - the route we matched, which is the matched entry from the arguments to route()
        // match.$args - the args passed in the link
        // match.$link - the full link data
        console.log('Successfully matched route', JSON.stringify(match))
        this.schemeRoutingProvider.handleNewSyncRequest(this.nav, match.$link.url).catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))
      }

      const handleNoMatch = nomatch => {
        // nomatch.$link - the full link data
        handleErrorSentry(ErrorCategory.DEEPLINK_PROVIDER)('route not matched: ' + JSON.stringify(nomatch))
      }

      this.deeplinks
        .route({
          '/': null
        })
        .subscribe(handleMatch, handleNoMatch)
    }
  }
}
