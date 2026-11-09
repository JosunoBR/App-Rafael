import SwiftUI

struct DocaSeparationView: View {
    @ObservedObject var viewModel: Mega12ViewModel
    @Environment(\.dismiss) var dismiss

    @State private var selectedOrderId: String = ""
    @State private var selectedStoreId: String = "pg_centro"
    @State private var showAvariaSheet = false

    // Avaria Form
    @State private var avariaItemDesc = ""
    @State private var avariaQtd = "1"
    @State private var avariaUnidade = "UN"
    @State private var avariaMotivo = "Quebra na conferência de carga"

    var separationOrders: [PurchaseOrder] {
        return viewModel.orders.filter { $0.status == "Em Separação" && !$0.header.separacaoConcluida }
    }

    var activeOrder: PurchaseOrder? {
        if selectedOrderId.isEmpty {
            return separationOrders.first
        }
        return viewModel.orders.first(where: { $0.id == selectedOrderId || $0.finalId == selectedOrderId }) ?? separationOrders.first
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Seletor de Carga / Pedido no Topo
                VStack(spacing: 8) {
                    HStack {
                        Text("CARGA EM CONFERÊNCIA:")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)
                        Spacer()
                        Picker("Pedido", selection: $selectedOrderId) {
                            ForEach(separationOrders) { o in
                                Text("\(o.header.numeroPedido) - \(o.header.fornecedor)").tag(o.id.isEmpty ? o.finalId : o.id)
                            }
                        }
                        .pickerStyle(.menu)
                    }

                    if let ord = activeOrder {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(ord.header.fornecedor)
                                    .font(.system(size: 14, weight: .bold))
                                    .lineLimit(1)
                                Text("Previsão: \(ord.header.dataPrevisaoEntrega) • \(ord.header.totalVolumes) Volumes")
                                    .font(.system(size: 11))
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Text(ord.status)
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.blue)
                                .cornerRadius(6)
                        }
                    }
                }
                .padding(14)
                .background(Color.white)
                .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)

                // Barra Horizontal de Lojas (20 Lojas)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(SeparationEngine.defaultStores) { store in
                            let isSelected = selectedStoreId == store.id
                            let isChecked = activeOrder?.inspection.conferenciaLojas[store.id] ?? false

                            Button(action: {
                                selectedStoreId = store.id
                            }) {
                                HStack(spacing: 4) {
                                    if isChecked {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.green)
                                    }
                                    Text(store.name)
                                        .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(isSelected ? Color(red: 0.02, green: 0.59, blue: 0.41) : Color(UIColor.secondarySystemBackground))
                                .foregroundColor(isSelected ? .white : .primary)
                                .cornerRadius(8)
                            }
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                }
                .background(Color(UIColor.systemBackground))

                Divider()

                // Lista de Itens Destinados à Loja Selecionada
                ScrollView {
                    VStack(spacing: 12) {
                        let selectedStore = SeparationEngine.defaultStores.first(where: { $0.id == selectedStoreId })

                        HStack {
                            Text("ITENS DESTINADOS: \(selectedStore?.name.uppercased() ?? "")")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.secondary)
                            Spacer()
                            Button(action: {
                                if let ordId = activeOrder?.id {
                                    viewModel.toggleStoreConferencia(orderId: ordId, lojaId: selectedStoreId)
                                }
                            }) {
                                let isDone = activeOrder?.inspection.conferenciaLojas[selectedStoreId] ?? false
                                HStack(spacing: 4) {
                                    Image(systemName: isDone ? "checkmark.seal.fill" : "circle")
                                    Text(isDone ? "Loja Conferida" : "Marcar Conferida")
                                }
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(isDone ? .green : .secondary)
                            }
                        }
                        .padding(.top, 8)

                        if let ord = activeOrder, !ord.items.isEmpty {
                            ForEach(ord.items) { item in
                                let storeUnits = item.gradeLojas[selectedStoreId] ?? (item.totalPecas / 20)
                                let storeBoxes = max(1, storeUnits / max(1, item.qtdPorCaixa))

                                HStack {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(Color(red: 0.02, green: 0.59, blue: 0.41).opacity(0.12))
                                            .frame(width: 44, height: 44)
                                        Image(systemName: "cube.box.fill")
                                            .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                                    }

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(item.descricao)
                                            .font(.system(size: 13, weight: .bold))
                                            .lineLimit(2)
                                        Text("Cód: \(item.codigoInterno) • \(item.qtdPorCaixa) pçs/cx")
                                            .font(.system(size: 11))
                                            .foregroundColor(.secondary)
                                    }

                                    Spacer()

                                    VStack(alignment: .trailing, spacing: 2) {
                                        Text("\(storeBoxes) Caixas")
                                            .font(.system(size: 14, weight: .black, design: .rounded))
                                            .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                                        Text("\(storeUnits) Peças")
                                            .font(.system(size: 11))
                                            .foregroundColor(.secondary)
                                    }
                                }
                                .padding(12)
                                .background(Color.white)
                                .cornerRadius(12)
                                .shadow(color: Color.black.opacity(0.03), radius: 4, x: 0, y: 1)
                            }
                        } else {
                            Text("Nenhum item alocado para esta doca.")
                                .foregroundColor(.secondary)
                                .padding(.top, 40)
                        }

                        // Lista de Avarias Já Registradas
                        if let avarias = activeOrder?.inspection.avarias, !avarias.isEmpty {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("AVARIAS APONTADAS")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.red)

                                ForEach(avarias) { av in
                                    HStack {
                                        Image(systemName: "exclamationmark.triangle.fill")
                                            .foregroundColor(.red)
                                        Text("\(av.quantidade) \(av.unidade) - \(av.itemDescricao)")
                                            .font(.system(size: 12, weight: .semibold))
                                        Spacer()
                                        Text(av.lojaNome)
                                            .font(.system(size: 11))
                                            .foregroundColor(.secondary)
                                    }
                                    .padding(8)
                                    .background(Color.red.opacity(0.08))
                                    .cornerRadius(6)
                                }
                            }
                            .padding(.top, 10)
                        }
                    }
                    .padding(14)
                }

                // Rodapé com Ações de Galpão
                VStack(spacing: 8) {
                    HStack(spacing: 12) {
                        Button(action: {
                            showAvariaSheet = true
                        }) {
                            HStack {
                                Image(systemName: "camera.fill")
                                Text("Apontar Avaria")
                            }
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(10)
                        }

                        Button(action: {
                            if let ordId = activeOrder?.id {
                                viewModel.concludeSeparation(orderId: ordId)
                                dismiss()
                            }
                        }) {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                Text("Finalizar separação")
                            }
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .background(Color(red: 0.02, green: 0.59, blue: 0.41))
                            .cornerRadius(10)
                        }
                    }
                }
                .padding(14)
                .background(Color.white)
                .shadow(color: Color.black.opacity(0.06), radius: 6, x: 0, y: -2)
            }
            .navigationTitle("Doca & Separação")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fechar") { dismiss() }
                }
            }
            .sheet(isPresented: $showAvariaSheet) {
                avariaSheetView
            }
        }
    }

    private var avariaSheetView: some View {
        NavigationView {
            Form {
                Section(header: Text("Produto com Avaria")) {
                    Picker("Item", selection: $avariaItemDesc) {
                        Text("Selecione o produto...").tag("")
                        if let ord = activeOrder {
                            ForEach(ord.items) { it in
                                Text(it.descricao).tag(it.descricao)
                            }
                        }
                    }
                    HStack {
                        Text("Quantidade:")
                        TextField("1", text: $avariaQtd)
                            .keyboardType(.numberPad)
                        Picker("Unidade", selection: $avariaUnidade) {
                            Text("Peças (UN)").tag("UN")
                            Text("Caixas (CX)").tag("CX")
                        }
                        .pickerStyle(.segmented)
                    }
                }

                Section(header: Text("Motivo da Avaria")) {
                    TextField("Descreva o motivo (ex: quebra no descarregamento)", text: $avariaMotivo)
                }

                Section(header: Text("Registro Fotográfico (Câmera)")) {
                    HStack {
                        Image(systemName: "camera.viewfinder")
                            .font(.system(size: 24))
                            .foregroundColor(Color(red: 0.02, green: 0.59, blue: 0.41))
                        Text("Fotografar avaria na doca")
                            .font(.system(size: 14, weight: .medium))
                    }
                    .padding(.vertical, 8)
                }
            }
            .navigationTitle("Registrar Avaria")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { showAvariaSheet = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salvar Avaria") {
                        if let ordId = activeOrder?.id, !avariaItemDesc.isEmpty {
                            let selectedStore = SeparationEngine.defaultStores.first(where: { $0.id == selectedStoreId })
                            let record = AvariaRecord(
                                itemId: UUID().uuidString,
                                itemDescricao: avariaItemDesc,
                                lojaId: selectedStoreId,
                                lojaNome: selectedStore?.name ?? "Loja",
                                quantidade: Int(avariaQtd) ?? 1,
                                unidade: avariaUnidade,
                                motivo: avariaMotivo,
                                dataRegistro: ISO8601DateFormatter().string(from: Date())
                            )
                            viewModel.registerAvaria(orderId: ordId, avaria: record)
                            showAvariaSheet = false
                        }
                    }
                    .disabled(avariaItemDesc.isEmpty)
                }
            }
        }
    }
}

