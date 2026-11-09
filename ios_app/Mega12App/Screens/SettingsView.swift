import SwiftUI

struct SettingsView: View {
    @ObservedObject var viewModel: Mega12ViewModel
    @State private var showDeleteConfirmation = false
    @State private var showServerConfig = false

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Usuário Conectado")) {
                    HStack(spacing: 12) {
                        Circle()
                            .fill(Color(red: 0.02, green: 0.59, blue: 0.41))
                            .frame(width: 44, height: 44)
                            .overlay(
                                Text(String(viewModel.currentUser?.nome.prefix(1) ?? "R"))
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(.white)
                            )

                        VStack(alignment: .leading, spacing: 2) {
                            Text(viewModel.currentUser?.nome ?? "Rafael")
                                .font(.system(size: 15, weight: .bold))
                            Text(viewModel.currentUser?.email ?? "comprador@mega12.com.br")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                            Text("Perfil: \(viewModel.currentUser?.role ?? "Comprador")")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                        }
                    }
                    .padding(.vertical, 4)
                }

                Section(header: Text("Servidor & Conectividade")) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("URL da API").font(.system(size: 13, weight: .medium))
                            Text(viewModel.serverUrl).font(.system(size: 11, design: .monospaced)).foregroundColor(.secondary)
                        }
                        Spacer()
                        Button("Alterar") {
                            showServerConfig = true
                        }
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                    }
                }

                Section(header: Text("Privacidade & Termos Apple (App Store)")) {
                    Link(destination: URL(string: "https://grupomega.cloud")!) {
                        HStack {
                            Image(systemName: "hand.raised.fill")
                                .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                            Text("Política de Privacidade")
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                        }
                    }

                    // Conformidade Obrigatória da Apple (Account Deletion)
                    Button(role: .destructive, action: {
                        showDeleteConfirmation = true
                    }) {
                        HStack {
                            Image(systemName: "person.crop.circle.badge.xmark")
                            Text("Solicitar Exclusão da Conta")
                        }
                    }
                }

                Section(header: Text("Sessão")) {
                    Button(action: {
                        viewModel.logout()
                    }) {
                        HStack {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                            Text("Sair do Aplicativo")
                        }
                        .foregroundColor(.red)
                    }
                }

                Section(footer: Text("Rede Mega 12 • Sistema Integrado de Compras e Galpão • Versão 1.0.0 (Build 1)")) {
                    EmptyView()
                }
            }
            .navigationTitle("Configurações")
            .sheet(isPresented: $showServerConfig) {
                ServerConfigView(viewModel: viewModel)
            }
            .alert(isPresented: $showDeleteConfirmation) {
                Alert(
                    title: Text("Excluir Conta"),
                    message: Text("Tem certeza de que deseja solicitar a exclusão de sua conta e a remoção dos dados armazenados?"),
                    primaryButton: .destructive(Text("Confirmar Exclusão")) {
                        viewModel.deleteAccount()
                    },
                    secondaryButton: .cancel(Text("Cancelar"))
                )
            }
        }
    }
}

