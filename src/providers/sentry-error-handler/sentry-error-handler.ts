import { IonicErrorHandler } from 'ionic-angular'
import { init, captureException, configureScope } from '@sentry/browser'

init({
  dsn: process.env.SENTRY_DSN,
  release: 'unknown',
  beforeSend: data => {
    let stacktrace = data.stacktrace || (data.exception && data.exception.values[0].stacktrace)

    if (stacktrace) {
      stacktrace.frames.forEach(function(frame) {
        frame.filename = frame.filename.substring(frame.filename.lastIndexOf('/'))
      })
    }
    return data
  }
})

export enum ErrorCategory {
  CORDOVA_PLUGIN = 'cordova_plugin',
  IONIC_MODAL = 'ionic_modal',
  IONIC_ALERT = 'ionic_alert',
  IONIC_LOADER = 'ionic_loader',
  NAVIGATION = 'navigation',
  WALLET_PROVIDER = 'wallet_provider',
  SCHEME_ROUTING = 'scheme_routing',
  COINLIB = 'coinlib',
  DEEPLINK_PROVIDER = 'deeplink_provider',
  OTHER = 'other'
}

const handleErrorSentry = (category?: ErrorCategory) => {
  return error => {
    try {
      console.debug('sending error to sentry, category', category)
      console.debug(error.originalError || error)
      captureException(error.originalError || error)
    } catch (e) {
      console.debug('Error reporting exception to sentry: ', e)
    }
  }
}

const handleErrorIgnore = error => {
  console.debug('ignoring error')
  console.debug(error.originalError || error)
}

const setSentryRelease = (release: string) => {
  configureScope(scope => {
    scope.addEventProcessor(async event => {
      event.release = release
      return event
    })
  })
}

export { setSentryRelease, handleErrorIgnore, handleErrorSentry }

export class SentryErrorHandler extends IonicErrorHandler {
  handleError(error) {
    super.handleError(error)
    handleErrorSentry(error)
  }
}
