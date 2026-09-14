import { PaymentCondition } from '../shared/types';
import {
  fetchPaymentConditionsFromDb,
  savePaymentConditionToDb,
  deletePaymentConditionFromDb,
  isOfflineError
} from './api';
import { safeSetItem } from './storage';

const STORAGE_KEY = 'mega12_payment_conditions';

export const DEFAULT_PAYMENT_CONDITIONS: PaymentCondition[] = [];

export async function loadPaymentConditions(onlyActive: boolean = false): Promise<PaymentCondition[]> {
  try {
    const list = await fetchPaymentConditionsFromDb(onlyActive);
    if (Array.isArray(list)) {
      safeSetItem(STORAGE_KEY, JSON.stringify(list));
      return list;
    }
  } catch (err) {
    if (!isOfflineError(err)) {
      console.warn('Falha ao carregar condições do backend, usando cache local:', err);
    }
  }

  // Fallback para cache local
  const localRaw = localStorage.getItem(STORAGE_KEY);
  if (localRaw) {
    try {
      const parsed: PaymentCondition[] = JSON.parse(localRaw);
      return onlyActive ? parsed.filter(c => c.ativo) : parsed;
    } catch {}
  }

  return [];
}

export async function savePaymentCondition(condition: Partial<PaymentCondition>): Promise<PaymentCondition> {
  let savedCondition: PaymentCondition | null = null;
  try {
    savedCondition = await savePaymentConditionToDb(condition);
  } catch (err) {
    console.warn('Não foi possível salvar condição no backend, salvando no cache local:', err);
  }

  const existingList = await loadPaymentConditions(false);
  const now = new Date().toISOString();
  const id = savedCondition?.id || condition.id || ('cond_' + Date.now());
  
  const formatted: PaymentCondition = {
    id,
    descricao: condition.descricao || 'Nova Condição',
    qtdParcelas: Number(condition.qtdParcelas) || 1,
    parcelasDias: condition.parcelasDias && condition.parcelasDias.length > 0
      ? condition.parcelasDias 
      : [30],
    especie: condition.especie || 'Boleto',
    banco: condition.banco || '',
    ativo: condition.ativo !== undefined ? condition.ativo : true,
    padrao: condition.padrao || false,
    observacao: condition.observacao || '',
    createdAt: condition.createdAt || now,
    updatedAt: now,
    ...(savedCondition || {})
  };

  let updatedList = [...existingList];
  const idx = updatedList.findIndex(c => c.id === id);

  if (formatted.padrao) {
    updatedList = updatedList.map(c => ({ ...c, padrao: c.id === id }));
  }

  if (idx >= 0) {
    updatedList[idx] = formatted;
  } else {
    updatedList.unshift(formatted);
  }

  safeSetItem(STORAGE_KEY, JSON.stringify(updatedList));
  return savedCondition || formatted;
}

export async function deletePaymentCondition(id: string): Promise<void> {
  try {
    await deletePaymentConditionFromDb(id);
  } catch (err) {
    console.warn('Não foi possível excluir no backend, excluindo do cache local:', err);
  }

  const existingList = await loadPaymentConditions(false);
  const filtered = existingList.filter(c => c.id !== id);
  safeSetItem(STORAGE_KEY, JSON.stringify(filtered));
}
