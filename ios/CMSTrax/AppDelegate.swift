import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    configureFirebase()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "cmstrax",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  /// Initialises Firebase (required by @react-native-firebase/messaging) when
  /// GoogleService-Info.plist is bundled. Without the file the app still runs,
  /// push notifications are simply unavailable.
  private func configureFirebase() {
    guard FirebaseApp.app() == nil else { return }
    guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else {
      NSLog("[CMSTrax] GoogleService-Info.plist not found - Firebase push notifications are disabled.")
      return
    }
    FirebaseApp.configure()
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
