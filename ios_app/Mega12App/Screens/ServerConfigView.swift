import SwiftUI

struct ServerConfigView: View {
    @ObservedObject var viewModel: Mega12ViewModel
    @Environment(\.dismiss) var dismiss

    @State private var inputUrl = ""
    @State private var pingStatus = ""
    @State private var isPinging = false

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Endereço do Servidor da Rede Mega 12")) {
                    TextField("https://grupomega.cloud/api", text: $inputUrl)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .font(.system(size: 13, design: .monospaced))

                    Button(action: {
                        testConnection()
                    }) {
                        HStack {
                            if isPinging {
                                ProgressView()
                            } else {
                                Image(systemName: "network")
                                Text("Testar Conexão em Tempo Real")
                            }
                        }
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                    }

                    if !pingStatus.isEmpty {
                        Text(pingStatus)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(pingStatus.contains("Online") ? .green : .red)
                    }
                }

                Section(header: Text("Servidores Pré-Configurados")) {
                    Button("🌐 Servidor de Produção Oficial (Hostinger)") {
                        inputUrl = "https://grupomega.cloud/api"
                    }
                    Button("💻 Ambiente Local (Localhost:3001)") {
                        inputUrl = "http://localhost:3001/api"
                    }
                }
            }
            .navigationTitle("Configurar Servidor")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                inputUrl = viewModel.serverUrl
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salvar") {
                        viewModel.serverUrl = inputUrl.trimmingCharacters(in: .whitespacesAndNewlines)
                        viewModel.refreshData()
                        dismiss()
                    }
                }
            }
        }
    }

    private func testConnection() {
        guard let url = URL(string: "\(inputUrl)/health") else {
            pingStatus = "URL inválida."
            return
        }
        isPinging = true
        pingStatus = "Verificando..."

        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                isPinging = false
                if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                    pingStatus = "✔ Servidor Online e Respondendo (HTTP 200 OK)"
                } else {
                    pingStatus = "✖ Falha ao conectar no servidor."
                }
            }
        }.resume()
    }
}

