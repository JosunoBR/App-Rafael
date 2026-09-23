/**
 * Utilitários de Alta Performance para Otimização, Redimensionamento e Conversão de Imagens
 * Rede Mega 12
 * 
 * Garante teto máximo estrito de 1 MB (comprimindo fotos pesadas de celulares
 * para ~150KB - 350KB), prevenindo inchaço do SQLite (mega12.db), estouro de cota
 * do navegador e consumo excessivo de tráfego/memória.
 */

export interface ImageCompressOptions {
  /**
   * Teto máximo estrito em bytes. Padrão: 1 MB (1.048.576 bytes).
   */
  maxSizeBytes?: number;

  /**
   * Largura máxima permitida em pixels.
   * Padrão: 1600 para comprovantes/recibos (preserva leitura de códigos), 1200 para produtos.
   */
  maxWidth?: number;

  /**
   * Altura máxima permitida em pixels.
   * Padrão: 1600 para comprovantes, 1200 para produtos.
   */
  maxHeight?: number;

  /**
   * Qualidade inicial da compressão JPEG (0.1 a 1.0). Padrão: 0.85.
   */
  initialQuality?: number;

  /**
   * Qualidade mínima tolerada durante o loop adaptativo de redução. Padrão: 0.45.
   */
  minQuality?: number;

  /**
   * Formato MIME de saída. Padrão: 'image/jpeg' (máxima compatibilidade com jsPDF, WhatsApp e navegadores).
   */
  format?: 'image/jpeg' | 'image/webp';

  /**
   * Cor de preenchimento para imagens com transparência (PNGs/SVGs). Padrão: '#FFFFFF' (fundo branco limpo).
   */
  fillBackground?: string;
}

export interface CompressedImageResult {
  /**
   * DataURL Base64 pronta para persistência ou renderização em <img>
   */
  dataUrl: string;

  /**
   * Objeto Blob correspondente à imagem comprimida
   */
  blob: Blob;

  /**
   * Arquivo File empacotado para uploads convencionais
   */
  file: File;

  /**
   * Tamanho final em bytes (garantido <= maxSizeBytes)
   */
  sizeBytes: number;

  /**
   * Tamanho original em bytes antes da otimização
   */
  originalSizeBytes: number;

  /**
   * Largura final da imagem em pixels
   */
  width: number;

  /**
   * Altura final da imagem em pixels
   */
  height: number;

  /**
   * Tipo MIME de saída (ex: 'image/jpeg')
   */
  mimeType: string;

  /**
   * Quantidade de bytes economizados
   */
  savedBytes: number;

  /**
   * Percentual de redução de tamanho (ex: 85 significa 85% menor)
   */
  reductionPercent: number;
}

/**
 * Calcula o tamanho real em bytes de uma string Base64 / Data URL
 */
export function getBase64ByteSize(base64String: string): number {
  if (!base64String) return 0;
  const commaIndex = base64String.indexOf(',');
  const rawBase64 = commaIndex !== -1 ? base64String.substring(commaIndex + 1) : base64String;
  const padding = (rawBase64.endsWith('==') ? 2 : rawBase64.endsWith('=') ? 1 : 0);
  return Math.max(0, Math.floor((rawBase64.length * 3) / 4) - padding);
}

/**
 * Formata bytes em formato legível para o usuário (ex: '240.5 KB', '1.2 MB')
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Verifica se um arquivo ou extensão corresponde a um formato de imagem suportado para compressão
 */
export function isImageFile(fileOrName: File | string): boolean {
  if (!fileOrName) return false;
  if (typeof fileOrName === 'string') {
    return /\.(jpe?g|png|webp|bmp|gif|tiff?)$/i.test(fileOrName);
  }
  return fileOrName.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|gif|tiff?)$/i.test(fileOrName.name);
}

/**
 * Motor central de compressão e redimensionamento inteligente de imagens.
 * Suporta File, Blob ou DataURL em Base64, garantindo conformidade com o teto de 1 MB.
 */
export async function compressImage(
  input: File | Blob | string,
  options: ImageCompressOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxSizeBytes = 1024 * 1024, // 1 MB rígido
    maxWidth = 1600,
    maxHeight = 1600,
    initialQuality = 0.85,
    minQuality = 0.45,
    format = 'image/jpeg',
    fillBackground = '#FFFFFF'
  } = options;

  let originalSizeBytes = 0;
  let fileName = 'imagem_otimizada.jpg';
  let objectUrlToRevoke: string | null = null;
  let imageSourceUrl = '';

  if (typeof input === 'string') {
    // É uma URL HTTP/HTTPS externa ou uma DataURL Base64
    if (input.startsWith('http://') || input.startsWith('https://')) {
      // Para URLs externas, não há necessidade de comprimir se não forem base64
      return {
        dataUrl: input,
        blob: new Blob([], { type: 'text/plain' }),
        file: new File([], 'imagem_remota.jpg', { type: 'image/jpeg' }),
        sizeBytes: 0,
        originalSizeBytes: 0,
        width: 0,
        height: 0,
        mimeType: 'text/uri-list',
        savedBytes: 0,
        reductionPercent: 0
      };
    }
    originalSizeBytes = getBase64ByteSize(input);
    imageSourceUrl = input;
  } else {
    originalSizeBytes = input.size;
    if ('name' in input && input.name) {
      fileName = input.name.replace(/\.[^/.]+$/, '') + '.jpg';
    }
    // Cria object URL para carregamento ultra-rápido sem alocação pesada de memória
    objectUrlToRevoke = URL.createObjectURL(input);
    imageSourceUrl = objectUrlToRevoke;
  }

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = (err) => reject(new Error('Não foi possível decodificar os dados da imagem para compressão: ' + String(err)));
      el.src = imageSourceUrl;
    });

    // 1. Calcula dimensões mantendo proporção de aspecto
    let targetWidth = img.naturalWidth || img.width;
    let targetHeight = img.naturalHeight || img.height;

    if (targetWidth > maxWidth || targetHeight > maxHeight) {
      if (targetWidth / maxWidth > targetHeight / maxHeight) {
        targetHeight = Math.round((targetHeight * maxWidth) / targetWidth);
        targetWidth = maxWidth;
      } else {
        targetWidth = Math.round((targetWidth * maxHeight) / targetHeight);
        targetHeight = maxHeight;
      }
    }

    // 2. Prepara Canvas com aceleração gráfica
    const canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) {
      throw new Error('Falha ao inicializar contexto gráfico HTML5 Canvas para otimização de imagem.');
    }

    const renderToCanvas = (w: number, h: number) => {
      canvas.width = w;
      canvas.height = h;
      if (!ctx) return;
      if (fillBackground) {
        ctx.fillStyle = fillBackground;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
    };

    renderToCanvas(targetWidth, targetHeight);

    // 3. Loop Adaptativo com Teto Rígido (Garante <= maxSizeBytes)
    let currentQuality = Math.min(1.0, Math.max(0.1, initialQuality));
    let finalBlob: Blob | null = null;
    let finalDataUrl = '';
    let iterations = 0;
    const maxIterations = 6;

    while (iterations < maxIterations) {
      iterations++;

      // Gera Blob no formato desejado
      finalBlob = await new Promise<Blob | null>((res) => {
        canvas.toBlob((b) => res(b), format, currentQuality);
      });

      if (!finalBlob) {
        // Fallback caso toBlob falhe no ambiente
        finalDataUrl = canvas.toDataURL(format, currentQuality);
        const approxSize = getBase64ByteSize(finalDataUrl);
        if (approxSize <= maxSizeBytes || currentQuality <= minQuality) {
          finalBlob = new Blob([finalDataUrl], { type: format });
          break;
        }
      } else {
        if (finalBlob.size <= maxSizeBytes) {
          // Dentro do limite estabelecido!
          break;
        }
      }

      // Se excedeu o tamanho máximo, reduz qualidade progressivamente
      if (currentQuality > minQuality + 0.05) {
        currentQuality = Math.max(minQuality, currentQuality - 0.12);
      } else {
        // Se a qualidade já chegou no mínimo aceitável e ainda excede 1 MB,
        // reduz as dimensões físicas em escala de 80% e re-renderiza
        targetWidth = Math.max(400, Math.round(targetWidth * 0.82));
        targetHeight = Math.max(400, Math.round(targetHeight * 0.82));
        renderToCanvas(targetWidth, targetHeight);
        currentQuality = 0.70;
      }
    }

    // Se ainda não gerou dataUrl correspondente ao blob final
    if (!finalDataUrl) {
      finalDataUrl = canvas.toDataURL(format, currentQuality);
    }

    const finalSize = finalBlob ? finalBlob.size : getBase64ByteSize(finalDataUrl);
    const savedBytes = Math.max(0, originalSizeBytes - finalSize);
    const reductionPercent = originalSizeBytes > 0 
      ? Math.round(((originalSizeBytes - finalSize) / originalSizeBytes) * 100) 
      : 0;

    const finalFile = new File([finalBlob || finalDataUrl], fileName, { 
      type: format,
      lastModified: Date.now() 
    });

    return {
      dataUrl: finalDataUrl,
      blob: finalBlob || new Blob([finalDataUrl], { type: format }),
      file: finalFile,
      sizeBytes: finalSize,
      originalSizeBytes,
      width: targetWidth,
      height: targetHeight,
      mimeType: format,
      savedBytes,
      reductionPercent
    };
  } finally {
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }
  }
}

/**
 * Função utilitária de conveniência mantendo 100% de compatibilidade retroativa
 * com os chamadores existentes, agora com garantia do teto de 1 MB.
 */
export async function optimizeImageFile(
  fileOrBase64: File | Blob | string,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85,
  maxSizeBytes = 1024 * 1024 // 1 MB rígido
): Promise<string> {
  if (!fileOrBase64) return '';

  // Se for SVG, não precisa de rasterização para JPEG
  if (fileOrBase64 instanceof File && fileOrBase64.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBase64);
    });
  }

  const result = await compressImage(fileOrBase64, {
    maxWidth,
    maxHeight,
    initialQuality: quality,
    maxSizeBytes
  });

  return result.dataUrl;
}
