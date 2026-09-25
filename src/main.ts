import '@angular/compiler'

import { enableProdMode } from '@angular/core'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'
import * as Sentry from '@sentry/capacitor'
// eslint-disable-next-line import/no-extraneous-dependencies
import * as SentryAngular from '@sentry/angular'

import { AppModule } from './app/app.module'
import { environment } from './environments/environment'

Sentry.init(
  {
    dsn: 'https://20fcaea4b311d1e1d7a2abfc7d246b56@watcher.papers.tech/9',
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 1.0
  },
  SentryAngular.init
)

if (environment.production) {
  enableProdMode()
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.log(err))
