import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  Link as LinkIcon, 
  Trash, 
  Image as ImageIcon, 
  Upload, 
  Sparkles, 
  Check 
} from 'lucide-react';
import { OrderItem } from '../shared/types';

interface ProductPhotoModalProps {
  item: OrderItem | null;
  onClose: () => void;
  onSavePhoto: (itemId: string, photoUrl: string | null) => void;
}

export const ProductPhotoModal: React.FC<ProductPhotoModalProps> = ({
  item,
  onClose,
  onSavePhoto
}) => {
  const [photoTab, setPhotoTab] = useState<'upload' | 'url'>('upload');
  const [photoUrlInput, setPhotoUrlInput] = useState(item?.fotoUrl || '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(item?.fotoUrl || null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  if (!item) return null;

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        setPhotoPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setPhotoUrlInput('');
    if (photoFileInputRef.current) {
      photoFileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    onSavePhoto(item.id, photoPreview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header do Modal */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Foto do Produto
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                {item.descricao || 'Definir imagem do item'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-5 space-y-4">
          
          {/* Tabs de Seleção: Upload vs Link URL */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setPhotoTab('upload')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                photoTab === 'upload'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload do Computador/Celular
            </button>
            <button
              type="button"
              onClick={() => setPhotoTab('url')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                photoTab === 'url'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Link / URL da Imagem
            </button>
          </div>

          {/* Área de Preview da Imagem */}
          <div className="w-full h-44 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 overflow-hidden flex items-center justify-center relative group">
            {photoPreview ? (
              <>
                <img src={photoPreview} alt="Preview" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600 text-white shadow-md hover:bg-rose-700 transition cursor-pointer"
                  title="Remover Imagem"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="text-center p-4 space-y-1.5 text-slate-400">
                <ImageIcon className="w-10 h-10 mx-auto stroke-1 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-medium">Nenhuma foto selecionada</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Envie um arquivo ou cole um link web abaixo
                </p>
              </div>
            )}
          </div>

          {/* Tab 1: Upload */}
          {photoTab === 'upload' && (
            <div>
              <input
                type="file"
                accept="image/*"
                ref={photoFileInputRef}
                onChange={handleFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoFileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Escolher arquivo de imagem...</span>
              </button>
            </div>
          )}

          {/* Tab 2: URL */}
          {photoTab === 'url' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                URL da Imagem na Internet:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={photoUrlInput}
                  onChange={(e) => {
                    setPhotoUrlInput(e.target.value);
                    setPhotoPreview(e.target.value.trim() || null);
                  }}
                  placeholder="https://exemplo.com/foto-produto.jpg"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(photoUrlInput.trim() || null)}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Carregar
                </button>
              </div>
            </div>
          )}

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Ao salvar, esta foto será gravada no item do pedido e sincronizada automaticamente no <strong>Catálogo de Produtos</strong>!
            </span>
          </div>

        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            {photoPreview && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition cursor-pointer"
              >
                Remover Foto
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Foto</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
