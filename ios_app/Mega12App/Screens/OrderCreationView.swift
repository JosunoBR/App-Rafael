import SwiftUI

struct OrderCreationView: View {
    @ObservedObject var viewModel: Mega12ViewModel
    @Environment(\.dismiss) var dismiss

    // Cabeçalho do Pedido
    @State private var selectedSupplier = ""
    @State private var condicaoPagamento = "30/60/90 Dias"
    @State private var previsaoEntrega = "15/11/2026"
    @State private var tipoFrete = "FOB"
    @State private var aliquotaStPct: Double = 0.0

    // Item em Digitação
    @State private var itemCodigo = ""
    @State private var itemDescricao = ""
    @State private var precoCompraStr = "5.50"
    @State private var pdvAlvoStr = "12.00"
    @State private var qtdCaixasStr = "10"
    @State private var qtdPorCaixaStr = "12"

    // Itens adicionados ao Pedido
    @State private var addedItems: [OrderItem] = []
    @State private var showGradeSheet = false
    @State private var currentSeparation: SeparationResult? = nil

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // 1. Informações Principais do Pedido
                    VStack(alignment: .leading, spacing: 14) {
                        Text("DADOS DO FORNECEDOR & CONDIÇÃO")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)

                        VStack(spacing: 12) {
                            // Seletor de Fornecedor
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Fornecedor").font(.system(size: 11, weight: .bold)).foregroundColor(.secondary)
                                Picker("Fornecedor", selection: $selectedSupplier) {
                                    Text("Selecione um fornecedor...").tag("")
                                    ForEach(viewModel.suppliers) { s in
                                        Text(s.razaoSocial).tag(s.razaoSocial)
                                    }
                                }
                                .pickerStyle(.menu)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(10)
                                .background(Color(UIColor.secondarySystemBackground))
                                .cornerRadius(8)
                            }

                            HStack(spacing: 12) {
                                // Condição de Pagamento
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Prazo").font(.system(size: 11, weight: .bold)).foregroundColor(.secondary)
                                    Picker("Condição", selection: $condicaoPagamento) {
                                        ForEach(viewModel.paymentConditions) { c in
                                            Text(c.descricao).tag(c.descricao)
                                        }
                                    }
                                    .pickerStyle(.menu)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(10)
                                    .background(Color(UIColor.secondarySystemBackground))
                                    .cornerRadius(8)
                                }

                                // Frete
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Frete").font(.system(size: 11, weight: .bold)).foregroundColor(.secondary)
                                    Picker("Frete", selection: $tipoFrete) {
                                        Text("FOB").tag("FOB")
                                        Text("CIF").tag("CIF")
                                    }
                                    .pickerStyle(.segmented)
                                }
                            }
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(14)
                        .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
                    }

                    // 2. Simulador e Adição de Itens com Termômetro Fiscal
                    VStack(alignment: .leading, spacing: 14) {
                        Text("SIMULADOR & ADIÇÃO DE PRODUTO")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)

                        VStack(spacing: 12) {
                            HStack {
                                TextField("Cód. Item", text: $itemCodigo)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .frame(width: 90)
                                TextField("Descrição do Produto", text: $itemDescricao)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                            }

                            HStack(spacing: 10) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Custo R$").font(.system(size: 10, weight: .bold)).foregroundColor(.secondary)
                                    TextField("0.00", text: $precoCompraStr)
                                        .keyboardType(.decimalPad)
                                        .textFieldStyle(RoundedBorderTextFieldStyle())
                                }
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("PDV Venda").font(.system(size: 10, weight: .bold)).foregroundColor(.secondary)
                                    TextField("0.00", text: $pdvAlvoStr)
                                        .keyboardType(.decimalPad)
                                        .textFieldStyle(RoundedBorderTextFieldStyle())
                                }
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Caixas").font(.system(size: 10, weight: .bold)).foregroundColor(.secondary)
                                    TextField("0", text: $qtdCaixasStr)
                                        .keyboardType(.numberPad)
                                        .textFieldStyle(RoundedBorderTextFieldStyle())
                                }
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Pç/Cx").font(.system(size: 10, weight: .bold)).foregroundColor(.secondary)
                                    TextField("12", text: $qtdPorCaixaStr)
                                        .keyboardType(.numberPad)
                                        .textFieldStyle(RoundedBorderTextFieldStyle())
                                }
                            }

                            // Termômetro de Margem em Tempo Real
                            let custo = Double(precoCompraStr.replacingOccurrences(of: ",", with: ".")) ?? 0.0
                            let pdv = Double(pdvAlvoStr.replacingOccurrences(of: ",", with: ".")) ?? 0.0
                            let fiscal = FiscalEngine.calculateItemFiscal(precoCompra: custo, pdvAlvo: pdv)

                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Custo Efetivo: R$ \(String(format: "%.2f", fiscal.custoRealEfetivo))")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundColor(.secondary)
                                    Text("Lucro Unit: R$ \(String(format: "%.2f", fiscal.margemRealUnit))")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundColor(fiscal.isLucrativo ? .green : .red)
                                }
                                Spacer()
                                Text(String(format: "%.1f%% Margem", fiscal.margemPercentual))
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                                    .background(fiscal.margemPercentual >= 20 ? Color.green : (fiscal.margemPercentual >= 10 ? Color.blue : (fiscal.margemPercentual >= 0 ? Color.orange : Color.red)))
                                    .cornerRadius(6)
                            }
                            .padding(10)
                            .background(Color(UIColor.secondarySystemBackground))
                            .cornerRadius(8)

                            // Botão Rateio nas 20 Lojas e Adicionar
                            HStack {
                                Button(action: {
                                    let boxes = Int(qtdCaixasStr) ?? 10
                                    let pack = Int(qtdPorCaixaStr) ?? 12
                                    currentSeparation = SeparationEngine.calculateBoxesSeparation(totalBoxes: boxes, packSize: pack)
                                    showGradeSheet = true
                                }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "square.grid.3x3.fill")
                                        Text("Ver Grade 20 Lojas")
                                    }
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                                    .padding(.vertical, 8)
                                    .padding(.horizontal, 12)
                                    .background(Color(red: 0.02, green: 0.59, blue: 0.41).opacity(0.1))
                                    .cornerRadius(8)
                                }

                                Spacer()

                                Button(action: {
                                    addItem()
                                }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "plus.circle.fill")
                                        Text("Inserir no Pedido")
                                    }
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.vertical, 8)
                                    .padding(.horizontal, 16)
                                    .background(Color(red: 0.02, green: 0.59, blue: 0.41))
                                    .cornerRadius(8)
                                }
                            }
                            .padding(.top, 4)
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(14)
                        .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
                    }

                    // 3. Itens Já Inseridos no Pedido
                    if !addedItems.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("ITENS DO PEDIDO (\(addedItems.count))")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.secondary)

                            ForEach(addedItems) { item in
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(item.descricao)
                                            .font(.system(size: 13, weight: .bold))
                                        Text("\(item.caixas) cxs (\(item.totalPecas) pçs) • R$ \(String(format: "%.2f", item.precoCompraUnitario)) un")
                                            .font(.system(size: 11))
                                            .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                    VStack(alignment: .trailing, spacing: 2) {
                                        Text("R$ \(String(format: "%.2f", item.subtotal))")
                                            .font(.system(size: 14, weight: .bold))
                                        Button(action: { addedItems.removeAll(where: { $0.id == item.id }) }) {
                                            Text("Remover").font(.system(size: 11)).foregroundColor(.red)
                                        }
                                    }
                                }
                                .padding(12)
                                .background(Color.white)
                                .cornerRadius(10)
                                .shadow(color: Color.black.opacity(0.03), radius: 4, x: 0, y: 1)
                            }
                        }
                    }

                    // 4. Totais e Fechamento com Regra de ST
                    let totalBruto = addedItems.reduce(0.0) { $0 + $1.subtotal }
                    let totalPecas = addedItems.reduce(0) { $0 + $1.totalPecas }
                    let totalVolumes = addedItems.reduce(0) { $0 + $1.caixas }
                    let totalSt = totalBruto * (aliquotaStPct / 100.0)
                    let totalGeral = totalBruto + totalSt

                    VStack(spacing: 8) {
                        HStack {
                            Text("Total Bruto dos Produtos:")
                            Spacer()
                            Text("R$ \(String(format: "%.2f", totalBruto))").fontWeight(.semibold)
                        }
                        if totalSt > 0 {
                            HStack {
                                Text("(+) Substituição Tributária (ST):")
                                Spacer()
                                Text("R$ \(String(format: "%.2f", totalSt))").foregroundColor(.blue).fontWeight(.semibold)
                            }
                        }
                        Divider()
                        HStack {
                            Text("TOTAL GERAL DO PEDIDO:")
                                .font(.system(size: 15, weight: .black))
                            Spacer()
                            Text("R$ \(String(format: "%.2f", totalGeral))")
                                .font(.system(size: 18, weight: .black))
                                .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                        }

                        Button(action: {
                            submitOrder(totalBruto: totalBruto, totalSt: totalSt, totalGeral: totalGeral, totalVolumes: totalVolumes, totalPecas: totalPecas)
                        }) {
                            Text("Salvar e Transmitir Pedido")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 48)
                                .background(Color(red: 0.02, green: 0.59, blue: 0.41))
                                .cornerRadius(12)
                        }
                        .disabled(addedItems.isEmpty || selectedSupplier.isEmpty)
                        .padding(.top, 8)
                    }
                    .padding(16)
                    .background(Color.white)
                    .cornerRadius(14)
                    .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
                }
                .padding(16)
            }
            .navigationTitle("Novo Pedido")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
            }
            .sheet(isPresented: $showGradeSheet) {
                gradeSheetView
            }
        }
    }

    private func addItem() {
        let custo = Double(precoCompraStr.replacingOccurrences(of: ",", with: ".")) ?? 0.0
        let pdv = Double(pdvAlvoStr.replacingOccurrences(of: ",", with: ".")) ?? 12.0
        let caixas = Int(qtdCaixasStr) ?? 10
        let pack = Int(qtdPorCaixaStr) ?? 12
        let pecas = caixas * pack
        let subtotal = Double(pecas) * custo

        let item = OrderItem(
            codigoInterno: itemCodigo.isEmpty ? "PRD-\(Int.random(in: 100...999))" : itemCodigo,
            descricao: itemDescricao.isEmpty ? "Novo Produto Selecionado" : itemDescricao,
            totalPecas: pecas,
            caixas: caixas,
            qtdPorCaixa: pack,
            precoCompraUnitario: custo,
            pdvAlvo: pdv,
            subtotal: subtotal
        )

        addedItems.append(item)
        itemCodigo = ""
        itemDescricao = ""
    }

    private func submitOrder(totalBruto: Double, totalSt: Double, totalGeral: Double, totalVolumes: Int, totalPecas: Int) {
        let num = "PED-\(Int.random(in: 141021...141999))"
        let order = PurchaseOrder(
            id: num,
            status: "Em Cotação",
            header: OrderHeader(
                id: UUID().uuidString,
                numeroPedido: num,
                dataEmissao: ISO8601DateFormatter().string(from: Date()),
                dataPrevisaoEntrega: previsaoEntrega,
                fornecedor: selectedSupplier,
                condicaoPagamento: condicaoPagamento,
                totalBruto: totalBruto,
                totalSt: totalSt,
                totalGeral: totalGeral,
                totalVolumes: totalVolumes,
                totalPecas: totalPecas,
                tipoFrete: tipoFrete
            ),
            items: addedItems
        )
        viewModel.saveOrder(order)
        dismiss()
    }

    private var gradeSheetView: some View {
        NavigationView {
            List {
                if let sep = currentSeparation {
                    Section(header: Text("Resumo do Rateio de Carga")) {
                        HStack {
                            Text("Total Caixas Alocadas:")
                            Spacer()
                            Text("\(sep.totalAllocatedBoxes) cxs (\(sep.totalAllocated) pçs)").fontWeight(.bold)
                        }
                        HStack {
                            Text("Estoque Reserva CD:")
                            Spacer()
                            Text("\(sep.reserveStockBoxes) cxs (\(sep.reserveStock) pçs)").foregroundColor(.secondary)
                        }
                    }

                    Section(header: Text("Distribuição por Loja (20 Lojas)")) {
                        ForEach(SeparationEngine.defaultStores) { store in
                            let b = sep.allocationsBoxes[store.id] ?? 0
                            let u = sep.allocations[store.id] ?? 0
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(store.name).font(.system(size: 13, weight: .bold))
                                    Text("Cluster \(store.cluster) • \(String(format: "%.2f", store.defaultWeight))%")
                                        .font(.system(size: 11)).foregroundColor(.secondary)
                                }
                                Spacer()
                                Text("\(b) cxs (\(u) pçs)")
                                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                                    .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                            }
                        }
                    }
                }
            }
            .navigationTitle("Grade Proporcional")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Concluir") { showGradeSheet = false }
                }
            }
        }
    }
}

