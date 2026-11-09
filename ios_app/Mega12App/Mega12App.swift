import SwiftUI

@main
struct Mega12App: App {
    init() {
        // Configuração inicial de aparência para iPhone
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(red: 0.02, green: 0.59, blue: 0.41, alpha: 1.0)
        appearance.titleTextAttributes = [.foregroundColor: UIColor.white]
        appearance.largeTitleTextAttributes = [.foregroundColor: UIColor.white]
        
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance
        UINavigationBar.appearance().tintColor = .white
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.light)
        }
    }
}

