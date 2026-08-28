import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API_BASE_URL } from './config';
import { PurchaseOrder, StoreConfig } from '../shared/types';
import { DEFAULT_STORES } from '../shared/constants';

export function exportRomaneioPDF(order: PurchaseOrder, fallbackStores?: StoreConfig[]) {
  const numeroPedido = (order.header?.numeroPedido || 'PED-0001').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanFornecedor = (order.header?.fornecedor || 'Fornecedor').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Romaneio_${numeroPedido}_${cleanFornecedor}.pdf`;

  // 1. Download nativo via Formulário POST HTTP (O navegador salva com o nome real e extensão .pdf)
  try {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${API_BASE_URL}/export/pdf`;
    form.target = '_self';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payload';
    input.value = JSON.stringify({ order, stores: fallbackStores });

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
      if (document.body.contains(form)) {
        document.body.removeChild(form);
      }
    }, 1500);

    return true;
  } catch (backendErr) {
    console.warn('Fallback para download PDF local:', backendErr);
  }

  // 2. Fallback de Contingência Local via jsPDF
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const storesList = (order.storeConfigs && order.storeConfigs.length > 0) 
      ? order.storeConfigs 
      : (fallbackStores && fallbackStores.length > 0 ? fallbackStores : DEFAULT_STORES);

    const activeStores = storesList.filter(s => s.active);

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 297, 18, 'F');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('MEGA 12 - ROMANEIO DE SEPARAÇÃO E EXPEDIÇÃO (20 LOJAS)', 14, 12);

    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Erro ao gerar PDF local:', err);
    throw err;
  }
}
