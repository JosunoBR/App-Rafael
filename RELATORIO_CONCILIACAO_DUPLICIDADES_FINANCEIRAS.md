# Relatório de Conciliação e Integridade Financeira (Modo Dry-Run)

> **Data de Emissão:** 09/10/2026  
> **Ambiente:** Servidor de Produção (Hostinger)  
> **Base de Dados:** `mega12.db` (2.362 lançamentos)  
> **Modo de Execução:** `DRY-RUN` (Auditoria e simulação preventiva — **zero registros excluídos**)  
> **Critérios Canônicos:** Descrição, Valor, Data de Vencimento, Loja, Parcela (`parcelaNumero` / `parcelaTotal` / `parcelaDesc`) e Forma de Pagamento (`formaPagamento`).

---

## 1. 📊 Resumo Executivo

| Métrica | Quantidade | Observação |
| :--- | :---: | :--- |
| **Total de Registros Analisados** | `2.362` | Todos os lançamentos da tabela `financial_entries` |
| **Clones Confirmados para Remoção** | `0` | Nenhuma duplicata idêntica (mesmo doc, parcela, forma e horário) |
| **Conflitos Cruzados (BOLETO vs DEPÓSITO /E)** | `10 grupos` | 20 registros preservados para conferência contábil |
| **Títulos com Parcelas Prorrogadas** | `Preservados` | Caso **MM PASSERINI** (6/7 e 7/7) confirmado como legítimo |
| **Registros Excluídos do Banco** | `0` | Integridade do banco 100% mantida no modo simulação |

---

## 2. 🛡️ Caso Esclarecido: MM PASSERINI (Parcelas Prorrogadas)

Na análise preliminar anterior, o título da empresa **MM PASSERINI** (R$ 7.311,05 em 21/09/2026) havia aparecido como duplicidade em potencial. 

Com o aprimoramento do script para avaliar formalmente o campo de **Parcela**:
- **Registro 1 (`fin_imp_..._321`):** Doc `59282` | Parcela **`6/7`** | Vencimento original prorrogado para 21/09/2026 com obs "PRORROGADO PAGAR EM DIA".
- **Registro 2 (`fin_imp_..._315`):** Doc `59282` | Parcela **`7/7`** | Vencimento normal em 21/09/2026.
- **Total Pago somado:** R$ 14.622,10 (R$ 7.311,05 × 2).

✅ **Conclusão:** Tratava-se de parcelas distintas da mesma nota fiscal. Com a inclusão da parcela na chave, o script reconheceu a legitimidade e **não mais aponta falso positivo para este caso**.

---

## 3. ⚠️ Detalhamento dos 10 Conflitos Cruzados Identificados

Todos os 10 casos abaixo envolvem a **mesma compra/parcela** que foi lançada simultaneamente na planilha legada de **BOLETO** e na planilha de **DEPÓSITO (com sufixo contábil `/E`)**.

Nenhum desses registros foi excluído no dry-run.

---

### Grupo 1: BG PLAS INDUSTRIA — Parcela 3/5
- **Valor:** R$ 9.971,00 | **Vencimento:** 29/09/2026 | **Loja:** ALS
- **Lançamento A (Depósito):** ID `fin_imp_1790621419643_432_a7xc` | Doc: `8448/E` | Forma: `DEPOSITO` | Status: `A Vencer`
- **Lançamento B (Boleto):** ID `fin_imp_1790621419643_443_2z1p` | Doc: `8448` | Forma: `BOLETO` | Status: `A Vencer`
- **Diagnóstico:** Parcela 3 de 5 da NF 8448 duplicada entre abas de Boleto e Depósito bancário.

---

### Grupo 2: BG PLAS INDUSTRIA — Parcela 4/5
- **Valor:** R$ 9.971,00 | **Vencimento:** 14/10/2026 | **Loja:** ALS
- **Lançamento A (Depósito):** ID `fin_imp_1790364810625_167_ikqh` | Doc: `8448/E` | Forma: `DEPOSITO` | Status: `A Vencer`
- **Lançamento B (Boleto):** ID `fin_imp_1790364810625_168_5q0l` | Doc: `8448` | Forma: `BOLETO` | Status: `A Vencer`
- **Diagnóstico:** Parcela 4 de 5 da NF 8448 presente em ambas as modalidades.

---

### Grupo 3: BG PLAS INDUSTRIA — Parcela 5/5
- **Valor:** R$ 9.971,00 | **Vencimento:** 29/10/2026 | **Loja:** ALS
- **Lançamento A (Depósito):** ID `fin_imp_1790364810647_300_irvx` | Doc: `8448/E` | Forma: `DEPOSITO` | Status: `A Vencer`
- **Lançamento B (Boleto):** ID `fin_imp_1790364810647_301_p9wv` | Doc: `8448` | Forma: `BOLETO` | Status: `A Vencer`
- **Diagnóstico:** Parcela 5 de 5 da NF 8448 presente em ambas as modalidades.

---

### Grupo 4: INGÁ — Parcela 3/8
- **Valor:** R$ 1.771,86 | **Vencimento:** 07/09/2026 | **Loja:** ALS
- **Lançamento A (Boleto):** ID `fin_imp_1790621419621_76_3hap` | Doc: `86682` | Forma: `BOLETO` | Status: **`Pago`**
- **Lançamento B (Depósito):** ID `fin_imp_1790621419622_79_kt94` | Doc: `86682/E` | Forma: `DEPOSITO` | Status: **`Pago`**
- **Diagnóstico:** Ambos os registros constam como pagos na importação legada. Recomenda-se conferir o extrato bancário para verificar se houve pagamento duplo real ou se é duplicação de registro contábil.

---

### Grupo 5: INGÁ — Parcela 4/8
- **Valor:** R$ 1.771,86 | **Vencimento:** 21/09/2026 | **Loja:** ALS
- **Lançamento A (Boleto):** ID `fin_imp_1790621419636_316_o2bs` | Doc: `86682` | Forma: `BOLETO` | Status: **`Pago`**
- **Lançamento B (Depósito):** ID `fin_imp_1790621419636_317_yfwr` | Doc: `86682/E` | Forma: `DEPOSITO` | Status: `A Vencer`
- **Diagnóstico:** O boleto bancário foi liquidado (`Pago`), enquanto a linha espelhada com `/E` permaneceu aberta (`A Vencer`).

---

### Grupo 6: INGÁ — Parcela 5/8
- **Valor:** R$ 1.771,86 | **Vencimento:** 05/10/2026 | **Loja:** ALS
- **Lançamento A (Boleto):** ID `fin_imp_1790364810609_53_u8lf` | Doc: `86682` | Forma: `BOLETO` | Status: `A Vencer`
- **Lançamento B (Depósito):** ID `fin_imp_1790364810609_54_kxbi` | Doc: `86682/E` | Forma: `DEPOSITO` | Status: `A Vencer`
- **Diagnóstico:** Parcela 5 de 8 com vencimento em outubro aberta em duplicidade nas duas formas de pagamento.

---

### Grupo 7: INGÁ — Parcela 6/8
- **Valor:** R$ 1.771,86 | **Vencimento:** 19/10/2026 | **Loja:** ALS
- **Lançamento A (Boleto):** ID `fin_imp_1790364810636_218_i8cr` | Doc: `86682` | Forma: `BOLETO` | Status: `A Vencer`
- **Lançamento B (Depósito):** ID `fin_imp_1790364810636_219_civr` | Doc: `86682/E` | Forma: `DEPOSITO` | Status: `A Vencer`
- **Diagnóstico:** Parcela 6 de 8 aberta em duplicidade nas duas formas de pagamento.

---

### Grupo 8: INGÁ — Parcela 8/8
- **Valor:** R$ 1.771,86 | **Vencimento:** 11/11/2026 | **Loja:** ALS
- **Lançamento A (Boleto):** ID `fin_imp_1790626458321_103_cbzy` | Doc: `86682` | Forma: `BOLETO` | Status: `A Vencer`
- **Lançamento B (Depósito):** ID `fin_imp_1790626458321_104_lgyb` | Doc: `86682/E` | Forma: `DEPOSITO` | Status: `A Vencer`
- **Diagnóstico:** Parcela 8 de 8 (última) aberta em duplicidade nas duas formas de pagamento.

---

### Grupo 9: JMD — Parcela 9/12
- **Valor:** R$ 2.700,00 | **Vencimento:** 07/09/2026 | **Loja:** ALS
- **Lançamento A (Boleto):** ID `fin_imp_1790621419621_75_h9um` | Doc: `53` | Forma: `BOLETO` | Status: **`Pago`**
- **Lançamento B (Depósito):** ID `fin_imp_1790621419622_81_lhv6` | Doc: `053/E` | Forma: `DEPOSITO` | Status: `A Vencer`
- **Diagnóstico:** O boleto de R$ 2.700,00 foi pago normalmente, enquanto a linha `/E` permaneceu em aberto.

---

### Grupo 10: JMD — Parcela 10/12
- **Valor:** R$ 2.700,00 | **Vencimento:** 14/09/2026 | **Loja:** ALS
- **Lançamento A (Boleto):** ID `fin_imp_1790621419629_194_wvop` | Doc: `53` | Forma: `BOLETO` | Status: **`Pago`**
- **Lançamento B (Depósito):** ID `fin_imp_1790621419629_195_jq2x` | Doc: `053/E` | Forma: `DEPOSITO` | Status: **`Em Atraso`**
- **Diagnóstico:** O boleto foi liquidado (`Pago`), e a linha duplicada `053/E` ficou pendente, virando `Em Atraso` no sistema indevidamente.

---

## 4. 📌 Recomendações e Próximos Passos

1. **Blindagem do Sistema:** As correções implementadas no frontend (`useRef` anti-duplo clique) e no backend (validação atômica de parcelas + índices únicos de pedidos) já impedem que qualquer novo lançamento ou pedido gere duplicatas a partir de agora.
2. **Tratamento dos Registros `/E`:** Para os 10 casos listados acima, o financeiro pode optar por:
   - **Opção A (Recomendada):** Cancelar ou excluir os lançamentos com sufixo `/E` onde o boleto correspondente já foi pago (como os de JMD e INGÁ parcelas 3 e 4), evitando alertas falsos de "Em Atraso" na listagem.
   - **Opção B:** Manter ambos caso representem contabilizações fiscais distintas solicitadas pela contabilidade da empresa.

---
*Relatório gerado automaticamente através da rotina de auditoria de integridade do App Rafael.*
