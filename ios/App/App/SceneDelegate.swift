import UIKit
import Capacitor

// Apps built with the iOS 27 SDK must use the UIScene life cycle, otherwise UIKit refuses to launch them.
// The window and the root view controller come from the Main storyboard (UISceneStoryboardFile in Info.plist).
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

  var window: UIWindow?

  // URLs and universal links that launched the app. They arrive before the bridge and its plugins are loaded,
  // so they are held back until the scene is active; Capacitor then keeps them until the web app subscribes.
  private var pendingURLContexts: Set<UIOpenURLContext> = []
  private var pendingUserActivities: [NSUserActivity] = []

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    pendingURLContexts = connectionOptions.urlContexts
    pendingUserActivities = Array(connectionOptions.userActivities)
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    let urlContexts = pendingURLContexts
    let userActivities = pendingUserActivities
    pendingURLContexts = []
    pendingUserActivities = []

    openURLContexts(urlContexts)
    userActivities.forEach { continueUserActivity($0) }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    openURLContexts(URLContexts)
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    continueUserActivity(userActivity)
  }

  // Forward to Capacitor so the App API keeps reporting app URL opens.

  private func openURLContexts(_ URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [.openInPlace: context.options.openInPlace]
      if let sourceApplication = context.options.sourceApplication {
        options[.sourceApplication] = sourceApplication
      }
      if let annotation = context.options.annotation {
        options[.annotation] = annotation
      }
      _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: options)
    }
  }

  private func continueUserActivity(_ userActivity: NSUserActivity) {
    _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
