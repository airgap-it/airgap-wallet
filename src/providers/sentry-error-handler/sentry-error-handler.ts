import { IonicErrorHandler } from 'ionic-angular'
import { init, captureException } from '@sentry/browser'

init({
  dsn: process.env.SENTRY_DSN,
  release: 'unknown',
  beforeSend: data => {
    console.log(data)

    let stacktrace = data.stacktrace || (data.exception && data.exception.values[0].stacktrace)

    if (stacktrace) {
      stacktrace.frames.forEach(function(frame) {
        frame.filename = frame.filename.substring(frame.filename.lastIndexOf('/'))
      })
    }
    return data
  }
})

export class SentryErrorHandler extends IonicErrorHandler {
  handleError(error) {
    console.log('sending error')
    super.handleError(error)

    try {
      captureException(error.originalError || error)
    } catch (e) {
      console.error('Error reporting exception to sentry: ', e)
    }
  }
}
