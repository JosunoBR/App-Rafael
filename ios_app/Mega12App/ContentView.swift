import SwiftUI

#if canImport(Mega12AppShared)
import Mega12AppShared

struct ComposeView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        return MainViewControllerKt.MainViewController()
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
#endif

struct ContentView: View {
    @StateObject private var viewModel = Mega12ViewModel()
    @State private var selectedTab = 0

    var body: some View {
        #if canImport(Mega12AppShared)
        ComposeView()
            .ignoresSafeArea(.keyboard)
        #else
        Group {
            if viewModel.currentUser == nil {
                LoginView(viewModel: viewModel)
            } else if viewModel.currentUser?.role == "Conferente" {
                // Perfil Exclusivo de Doca & Separação
                DocaSeparationView(viewModel: viewModel)
            } else {
                // Perfil de Comprador e Diretoria: Hub Completo com 5 Abas Oficiais
                TabView(selection: $selectedTab) {
                    BuyerHomeView(viewModel: viewModel)
                        .tabItem {
                            Label("Início", systemImage: "house.fill")
                        }
                        .tag(0)

                    OrderHistoryView(viewModel: viewModel)
                        .tabItem {
                            Label("Pedidos", systemImage: "doc.text.fill")
                        }
                        .tag(1)

                    ProductsCatalogView(viewModel: viewModel)
                        .tabItem {
                            Label("Catálogo", systemImage: "photo.stack.fill")
                        }
                        .tag(2)

                    FinancialBoletosView(viewModel: viewModel)
                        .tabItem {
                            Label("Boletos", systemImage: "barcode.viewfinder")
                        }
                        .tag(3)

                    SettingsView(viewModel: viewModel)
                        .tabItem {
                            Label("Ajustes", systemImage: "gearshape.fill")
                        }
                        .tag(4)
                }
                .accentColor(Color(red: 0.02, green: 0.59, blue: 0.41))
            }
        }
        #endif
    }
}

#Preview {
    ContentView()
}
