import SwiftUI

struct LoginView: View {
    @ObservedObject var viewModel: Mega12ViewModel
    @State private var email = "comprador@mega12.com.br"
    @State private var senha = "••••••••"
    @State private var selectedRole = "Comprador"
    @State private var showServerConfig = false

    var body: some View {
        NavigationView {
            ZStack {
                Color(red: 0.96, green: 0.97, blue: 0.98).ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        Spacer(minLength: 40)

                        // Logotipo e Cabeçalho Corporativo
                        VStack(spacing: 10) {
                            ZStack {
                                Circle()
                                    .fill(Color(red: 0.02, green: 0.59, blue: 0.41))
                                    .frame(width: 86, height: 86)
                                    .shadow(color: Color(red: 0.02, green: 0.59, blue: 0.41).opacity(0.35), radius: 10, x: 0, y: 5)
                                Image(systemName: "shippingbox.fill")
                                    .font(.system(size: 40))
                                    .foregroundColor(.white)
                            }

                            Text("REDE MEGA 12")
                                .font(.system(size: 28, weight: .black, design: .rounded))
                                .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))

                            Text("Operações de Compras & Doca de Galpão")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.secondary)
                        }

                        // Card de Formulário
                        VStack(spacing: 18) {
                            // Seletor de Perfil
                            VStack(alignment: .leading, spacing: 6) {
                                Text("PERFIL DE ACESSO")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.secondary)

                                Picker("Perfil", selection: $selectedRole) {
                                    Text("Comprador").tag("Comprador")
                                    Text("Conferente").tag("Conferente")
                                    Text("Diretoria").tag("Diretoria")
                                }
                                .pickerStyle(.segmented)
                            }

                            // Campo E-mail / Usuário
                            VStack(alignment: .leading, spacing: 6) {
                                Text("USUÁRIO CORPORATIVO")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.secondary)

                                HStack {
                                    Image(systemName: "person.fill")
                                        .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                                    TextField("E-mail ou Usuário", text: $email)
                                        .autocapitalization(.none)
                                        .disableAutocorrection(true)
                                }
                                .padding(12)
                                .background(Color(UIColor.secondarySystemBackground))
                                .cornerRadius(10)
                            }

                            // Campo Senha
                            VStack(alignment: .leading, spacing: 6) {
                                Text("SENHA")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.secondary)

                                HStack {
                                    Image(systemName: "lock.fill")
                                        .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                                    SecureField("Senha", text: $senha)
                                }
                                .padding(12)
                                .background(Color(UIColor.secondarySystemBackground))
                                .cornerRadius(10)
                            }

                            // Indicador de Servidor
                            HStack {
                                Circle().fill(Color.green).frame(width: 8, height: 8)
                                Text("Servidor: \(viewModel.serverUrl)")
                                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                                Spacer()
                                Button(action: { showServerConfig = true }) {
                                    Image(systemName: "slider.horizontal.3")
                                        .font(.system(size: 14))
                                        .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                                }
                            }
                            .padding(.top, 4)

                            // Botão Entrar
                            Button(action: {
                                let generator = UIImpactFeedbackGenerator(style: .medium)
                                generator.impactOccurred()
                                viewModel.login(email: email, role: selectedRole)
                            }) {
                                HStack {
                                    if viewModel.isLoading {
                                        ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    } else {
                                        Text("Acessar Sistema")
                                            .font(.system(size: 16, weight: .bold))
                                        Image(systemName: "arrow.right")
                                    }
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .background(Color(red: 0.02, green: 0.59, blue: 0.41))
                                .cornerRadius(12)
                                .shadow(color: Color(red: 0.02, green: 0.59, blue: 0.41).opacity(0.3), radius: 8, x: 0, y: 4)
                            }
                            .disabled(viewModel.isLoading)
                        }
                        .padding(22)
                        .background(Color.white)
                        .cornerRadius(18)
                        .shadow(color: Color.black.opacity(0.06), radius: 12, x: 0, y: 5)
                        .padding(.horizontal, 20)

                        Spacer(minLength: 20)

                        Text("Rede Mega 12 • Versão 1.0.0 (Build 1)")
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showServerConfig) {
                ServerConfigView(viewModel: viewModel)
            }
        }
    }
}

