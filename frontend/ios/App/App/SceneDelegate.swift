import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    // La fenêtre est créée automatiquement à partir de l'écran "Main" (Info.plist).
    var window: UIWindow?

    func scene(_ scene: UIScene,
               willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        guard scene is UIWindowScene else { return }

        // Lien reçu au lancement de l'app (retour de Google, lien externe…)
        if let url = connectionOptions.urlContexts.first?.url {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
        }
        if let activity = connectionOptions.userActivities.first {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared,
                                                            continue: activity,
                                                            restorationHandler: { _ in })
        }
    }

    // Lien reçu pendant que l'app est ouverte (ex. retour de la connexion Google)
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: [:])
        }
    }

    // Liens universels
    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared,
                                                        continue: userActivity,
                                                        restorationHandler: { _ in })
    }
}
