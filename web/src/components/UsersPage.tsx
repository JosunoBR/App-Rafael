import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/config';
import {
  Users as UsersIcon, 
  UserPlus, 
  ShieldCheck, 
  ShoppingBag, 
  PackageCheck, 
  Truck, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Save, 
  X,
  Lock,
  Mail,
  Phone,
  Briefcase
} from 'lucide-react';
import { User, UserRole } from '../shared/types';

interface UsersPageProps {
  currentUser: User;
}

export const UsersPage: React.FC<UsersPageProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> & { senha?: string }>({
    nome: '',
    email: '',
    senha: '123456',
    role: 'comprador',
    cargo: '',
    telefone: '',
    ativo: 1
  });

  const getAuthHeaders = (extra: Record<string, string> = {}) => {
    const headers: Record<string, string> = { ...extra };
    if (currentUser?.token) {
      headers['Authorization'] = `Bearer ${currentUser.token}`;
    }
    return headers;
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(u => {
    const matchSearch = 
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.cargo && u.cargo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleOpenNew = () => {
    setEditingUser({
      nome: '',
      email: '',
      senha: '123456',
      role: 'comprador',
      cargo: '',
      telefone: '',
      ativo: 1
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser({
      ...user,
      senha: '' // Deixar em branco para não alterar caso não queira
    });
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser.nome || !editingUser.email) {
      alert('Nome e E-mail são obrigatórios.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(editingUser)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao salvar usuário');
      }
      await loadUsers();
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (userId: string) => {
    if (userId === currentUser.id) {
      alert('Você não pode excluir o seu próprio usuário conectado.');
      return;
    }

    if (!confirm('Deseja realmente remover este usuário?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao remover usuário');
      }
      await loadUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'diretoria':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            Diretoria / Admin
          </span>
        );
      case 'comprador':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <ShoppingBag className="w-3 h-3 text-blue-600" />
            Comprador
          </span>
        );
      case 'conferente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
            <PackageCheck className="w-3 h-3 text-teal-600" />
            Conferente de Doca
          </span>
        );
      case 'motorista':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <Truck className="w-3 h-3 text-purple-600" />
            Motorista / Expedição
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header com Resumo de Níveis */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Gestão de Usuários & Níveis de Acesso (RBAC)
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {users.length} usuários
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Controle de permissões para Diretoria, Compras, Doca e Motoristas
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenNew}
          className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-900/20 transition flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Novo Usuário</span>
        </button>
      </div>

      {/* 2. Filtros e Busca */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        
        {/* Barra de Pesquisa */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, e-mail ou cargo..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filtro por Papel / Role */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Filtrar:</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer outline-hidden"
          >
            <option value="all">Todos os Perfis ({users.length})</option>
            <option value="diretoria">👑 Diretoria</option>
            <option value="comprador">🛒 Comprador</option>
            <option value="conferente">📦 Conferente de Doca</option>
            <option value="motorista">🚚 Motorista / Expedição</option>
          </select>
        </div>

      </div>

      {/* 3. Tabela de Usuários */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-3">Nome / Usuário</th>
              <th className="py-3 px-3">E-mail</th>
              <th className="py-3 px-3">Perfil de Acesso</th>
              <th className="py-3 px-3">Cargo / Função</th>
              <th className="py-3 px-3">Telefone</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="py-3 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs">
                    {u.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div>{u.nome}</div>
                    {u.id === currentUser.id && (
                      <span className="text-[10px] text-emerald-600 font-bold">(Você)</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                  {u.email}
                </td>
                <td className="py-3 px-3">
                  {getRoleBadge(u.role)}
                </td>
                <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                  {u.cargo || '-'}
                </td>
                <td className="py-3 px-3 font-mono text-slate-500">
                  {u.telefone || '-'}
                </td>
                <td className="py-3 px-3 text-center">
                  {u.ativo ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
                      <XCircle className="w-3.5 h-3.5" /> Inativo
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-400 dark:hover:bg-emerald-950 transition cursor-pointer"
                      title="Editar Usuário"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {u.id !== currentUser.id && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:bg-rose-950 transition cursor-pointer"
                        title="Excluir Usuário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Modal de Criação / Edição de Usuário */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-emerald-500" />
                {editingUser.id ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nome Completo</label>
                  <input
                    type="text"
                    value={editingUser.nome || ''}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="ex: Rafael Silva"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">E-mail de Login</label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="usuario@mega12.com.br"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Perfil de Acesso (Role)</label>
                  <select
                    value={editingUser.role || 'comprador'}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value as UserRole }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  >
                    <option value="diretoria">👑 Diretoria (Acesso Total)</option>
                    <option value="comprador">🛒 Comprador (Cotação & Viagens)</option>
                    <option value="conferente">📦 Conferente (Separação & Doca)</option>
                    <option value="motorista">🚚 Motorista (Expedição & Rotas)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Senha {editingUser.id && '(em branco p/ manter)'}
                  </label>
                  <input
                    type="password"
                    value={editingUser.senha || ''}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, senha: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Cargo / Função</label>
                  <input
                    type="text"
                    value={editingUser.cargo || ''}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, cargo: e.target.value }))}
                    placeholder="ex: Comprador Líder"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={editingUser.telefone || ''}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="(42) 99999-9999"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={Boolean(editingUser.ativo)}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, ativo: e.target.checked ? 1 : 0 }))}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Usuário Ativo no Sistema</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-900/20 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Usuário</span>
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
