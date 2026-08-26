import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var privacyCover: UIView?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = AppBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    func sceneWillResignActive(_ scene: UIScene) {
        guard let window, privacyCover == nil else { return }
        let cover = UIView(frame: window.bounds)
        cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        cover.backgroundColor = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(red: 0.08, green: 0.08, blue: 0.07, alpha: 1)
                : UIColor(red: 0.98, green: 0.97, blue: 0.94, alpha: 1)
        }

        let mark = UILabel()
        mark.translatesAutoresizingMaskIntoConstraints = false
        mark.text = "杨"
        mark.textAlignment = .center
        mark.font = .systemFont(ofSize: 30, weight: .bold)
        mark.textColor = .systemBackground
        mark.backgroundColor = .label
        mark.layer.cornerRadius = 24
        mark.layer.masksToBounds = true

        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = "杨老师家教"
        label.font = .systemFont(ofSize: 17, weight: .semibold)
        label.textColor = .label

        cover.addSubview(mark)
        cover.addSubview(label)
        NSLayoutConstraint.activate([
            mark.widthAnchor.constraint(equalToConstant: 74),
            mark.heightAnchor.constraint(equalToConstant: 74),
            mark.centerXAnchor.constraint(equalTo: cover.centerXAnchor),
            mark.centerYAnchor.constraint(equalTo: cover.centerYAnchor, constant: -28),
            label.centerXAnchor.constraint(equalTo: cover.centerXAnchor),
            label.topAnchor.constraint(equalTo: mark.bottomAnchor, constant: 18)
        ])
        window.addSubview(cover)
        privacyCover = cover
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        privacyCover?.removeFromSuperview()
        privacyCover = nil
    }
}
