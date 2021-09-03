import { ErrorHandler } from '@angular/core'
import * as Sentry from '@sentry/browser'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  release: 'unknown',
  beforeSend: (data: Sentry.Event): Sentry.Event => {
    const stacktrace: Sentry.Stacktrace | undefined =
      data.stacktrace || (data.exception && data.exception.values && data.exception.values[0].stacktrace)

    if (stacktrace && stacktrace.frames) {
      stacktrace.frames.forEach((frame: Sentry.StackFrame) => {
        if (frame.filename) {
          frame.filename = frame.filename.substring(frame.filename.lastIndexOf('/'))
        }
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
  IONIC_TOAST = 'ionic_toast',
  NAVIGATION = 'navigation',
  WALLET_PROVIDER = 'wallet_provider',
  SCHEME_ROUTING = 'scheme_routing',
  COINLIB = 'coinlib',
  DEEPLINK_PROVIDER = 'deeplink_provider',
  STORAGE = 'storage',
  OPERATIONS_PROVIDER = 'operations_provider',
  PUSH = 'push',
  OTHER = 'other',
  BEACON = 'beacon'
}

const AIRGAP_ERROR_CATEGORY: string = 'airgap-error-category'

const handleErrorSentry = (category: ErrorCategory = ErrorCategory.OTHER) => {
  return (error: any) => {
    try {
      console.debug('sending error to sentry, category', category)
      console.debug(error.originalError || error)
      Sentry.withScope((scope) => {
        scope.setTag(AIRGAP_ERROR_CATEGORY, category)
        Sentry.captureException(error.originalError || error)
      })
    } catch (e) {
      console.debug('Error reporting exception to sentry: ', e)
    }
  }
}

const handleErrorIgnore = (error) => {
  console.debug('ignoring error')
  console.debug(error.originalError || error)
}

const setSentryRelease = (release: string) => {
  Sentry.configureScope((scope) => {
    scope.addEventProcessor(async (event) => {
      event.release = release

      return event
    })
  })
}

const setSentryUser = (UUID: string) => {
  Sentry.configureScope((scope) => {
    scope.setUser({ id: UUID })
  })
}

export { setSentryRelease, setSentryUser, handleErrorIgnore, handleErrorSentry }

export class SentryErrorHandler extends ErrorHandler {
  public handleError(error: any): void {
    super.handleError(error)
    handleErrorSentry(error)
  }
}
