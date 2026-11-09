import ExcelJS from 'exceljs';
import { LOGO_MEGA12_BASE64 } from '../assets/logoBase64';
import type { PurchaseOrder, StoreConfig } from '../shared/types';
import { downloadExcelWorkbook } from './excelExporter';
import {
  prepareRomaneio, ROMANEIO_TITLE, ROMANEIO_SUBTITLE, ROMANEIO_CONFERENCE_TITLE,
  ROMANEIO_SIGNATURES, ROMANEIO_FOOTER
} from './romaneioExportData';

const slate = 'FF0F172A';
const white = 'FFFFFFFF';
const cardTitle = 'FFF1F5F9';
const cardBody = 'FFF8FAFC';
const signatureColor = 'FF475569';
const border: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFE2E8F0' } };

function toArgb(color: [number, number, number]): string {
  return 'FF' + color.map(channel => channel.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function setFill(cell: ExcelJS.Cell, color: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
}

function addImage(
  workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, image: string | undefined,
  start: number, widths: number[], row: number, height: number, size: number
): boolean {
  if (!image) return false;
  // Aceita somente imagens raster incorporadas ao pedido, como no PDF.
  const match = /^data:image\/(png|jpe?g);base64,(iVBORw0KGgo|\/9j\/)/i.exec(image);
  if (!match) return false;
  const extension = match[1].toLowerCase() === 'png' ? 'png' : 'jpeg';
  if (extension === 'png' ? match[2] !== 'iVBORw0KGgo' : match[2] !== '/9j/') return false;
  const imageId = workbook.addImage({ base64: image, extension });
  const widthPixels = widths.reduce((sum, width) => sum + width * 7, 0);
  const heightPixels = height * 4 / 3;
  const side = Math.min(size, widthPixels - 4, heightPixels - 4);
  let left = (widthPixels - side) / 2;
  let slot = 0;
  while (slot < widths.length - 1 && left >= widths[slot] * 7) {
    left -= widths[slot] * 7;
    slot++;
  }
  sheet.addImage(imageId, {
    tl: { col: start - 1 + slot + left / (widths[slot] * 7), row: row - 1 + (heightPixels - side) / (sheet.getRow(row).height * 8 / 3) },
    ext: { width: side, height: side },
    editAs: 'oneCell'
  });
  return true;
}

export function buildRomaneioWorkbook(romaneio: ReturnType<typeof prepareRomaneio>): ExcelJS.Workbook {
  const { columns, bodyRows, footerRow } = romaneio;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Rede Mega 12';
  const sheet = workbook.addWorksheet('Romaneio', {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { top: 0.22, bottom: 0.55, left: 0.39, right: 0.39, header: 0.15, footer: 0.15 }
    }
  });

  // Mantém as proporções da tabela do PDF e permite dividir o cabeçalho mesmo
  // quando o usuário exporta apenas uma ou duas colunas.
  const fixedWidth = columns.reduce((sum, column) => sum + (column.widthMm || 0), 0);
  const flexibleCount = columns.filter(column => column.widthMm === undefined).length;
  const flexibleWidth = Math.max(8, (277 - fixedWidth) / Math.max(flexibleCount, 1));
  const nominalWidth = fixedWidth + flexibleWidth * flexibleCount;
  const scale = Math.max(1, 277 / nominalWidth);
  const minSlots = Math.ceil(9 / columns.length);
  const widths: number[] = [];
  const tableRanges = columns.map(column => {
    const width = Math.max(5.5, (column.widthMm ?? flexibleWidth) * scale * 0.63);
    const slots = Math.max(minSlots, Math.min(3, Math.ceil(width / 12)));
    const start = widths.length + 1;
    widths.push(...Array<number>(slots).fill(width / slots));
    return { start, end: widths.length, width };
  });
  sheet.columns = widths.map(width => ({ width }));
  const last = widths.length;
  const rightEdges = widths.reduce<number[]>((edges, width) => {
    edges.push((edges.at(-1) || 0) + width);
    return edges;
  }, []);
  const totalWidth = rightEdges[last - 1];
  const splitAt = (fraction: number, min: number, max: number) => {
    let nearest = min;
    for (let index = min + 1; index <= max; index++) {
      if (Math.abs(rightEdges[index - 1] / totalWidth - fraction) <
          Math.abs(rightEdges[nearest - 1] / totalWidth - fraction)) nearest = index;
    }
    return nearest;
  };

  function band(row: number, first: number, end: number, value: string, options: {
    size?: number; color?: string; fill?: string; bold?: boolean; centered?: boolean;
  } = {}) {
    if (first < end) sheet.mergeCells(row, first, row, end);
    const cell = sheet.getCell(row, first);
    cell.value = value;
    cell.font = { name: 'Arial', size: options.size ?? 9, bold: options.bold, color: { argb: options.color ?? slate } };
    cell.alignment = { vertical: 'middle', horizontal: options.centered ? 'center' : 'left', wrapText: true };
    if (options.fill) setFill(cell, options.fill);
    return cell;
  }

  const logoEnd = splitAt(0.08, 1, last - 2);
  const badgeStart = splitAt(0.70, logoEnd + 1, last - 1) + 1;
  const supplierSplit = splitAt(0.54, 1, last - 1);
  const sectionStyle = { fill: cardTitle, bold: true, color: 'FF1E293B' };

  sheet.getRow(1).height = 27;
  sheet.getRow(2).height = 21;
  sheet.getRow(3).height = 16;
  sheet.getRow(4).height = 6;
  addImage(workbook, sheet, LOGO_MEGA12_BASE64, 1, widths.slice(0, logoEnd), 1, 64, 80);
  band(1, logoEnd + 1, badgeStart - 1, ROMANEIO_TITLE, { size: 16, bold: true });
  band(2, logoEnd + 1, badgeStart - 1, ROMANEIO_SUBTITLE, { color: 'FF059669', bold: true });
  romaneio.badge.forEach((label, index) => band(index + 1, badgeStart, last, label, {
    size: index === 0 ? 12 : 9,
    fill: slate,
    bold: index !== 1,
    color: index === 2 ? 'FFFDE047' : white
  }));
  band(5, 1, last, 'DADOS DO FORNECEDOR:', sectionStyle);
  band(6, 1, supplierSplit, romaneio.supplier[0], { fill: cardBody });
  band(6, supplierSplit + 1, last, romaneio.supplier[2], { fill: cardBody });
  band(7, 1, last, romaneio.supplier[1], { fill: cardBody });
  sheet.getRow(5).height = 17;
  sheet.getRow(6).height = 22;
  sheet.getRow(7).height = 18;
  sheet.getRow(8).height = 7;

  const tableHeader = 9;
  const photoIndex = columns.findIndex(column => column.key === 'foto');
  const rows = [columns.map(column => column.header), ...bodyRows, footerRow];
  rows.forEach((row, rowIndex) => {
    const rowNumber = tableHeader + rowIndex;
    const header = rowIndex === 0;
    const total = rowIndex === rows.length - 1;
    let rowHeight = header ? 28 : total ? 24 : 26;
    row.forEach((value, index) => {
      const column = columns[index];
      const range = tableRanges[index];
      if (range.start < range.end) sheet.mergeCells(rowNumber, range.start, rowNumber, range.end);
      const cell = sheet.getCell(rowNumber, range.start);
      cell.value = value;
      cell.alignment = { vertical: 'middle', horizontal: header ? 'center' : column.align ?? 'center', wrapText: true };
      cell.font = {
        name: 'Arial', size: header ? 8 : 9, bold: header || total || column.bold,
        color: { argb: header ? white : total ? 'FF064E3B' : column.color ? toArgb(column.color) : slate }
      };
      cell.border = { top: border, bottom: border, left: border, right: border };
      setFill(cell, header ? slate : total ? 'FFD1FAE5' : column.fill ? toArgb(column.fill) : white);
      if (typeof value === 'number') {
        const quantityFormat = Number.isInteger(value) ? '#,##0' : '#,##0.###';
        cell.numFmt = column.format === 'currency' ? '"R$ "#,##0.00' :
          column.format === 'units' ? `${quantityFormat}" un"` : quantityFormat;
      } else if (value) {
        const charsPerLine = Math.max(4, Math.floor(range.width * 1.15) - 1);
        const lines = value.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
        rowHeight = Math.max(rowHeight, Math.min(409, 5 + lines * 11));
      }
    });
    sheet.getRow(rowNumber).height = rowHeight;
    if (!header && !total && photoIndex >= 0) {
      const range = tableRanges[photoIndex];
      const photo = romaneio.items[rowIndex - 1].fotoUrl;
      if (!addImage(workbook, sheet, photo, range.start, widths.slice(range.start - 1, range.end), rowNumber, rowHeight, 29)) {
        sheet.getCell(rowNumber, range.start).value = '-';
      }
    }
  });

  const conferenceRow = tableHeader + rows.length + 1;
  sheet.getRow(conferenceRow - 1).height = 9;
  band(conferenceRow, 1, last, ROMANEIO_CONFERENCE_TITLE, sectionStyle);
  sheet.getRow(conferenceRow).height = 19;
  const conferenceSplit = splitAt(0.44, 1, last - 1);
  band(conferenceRow + 1, 1, conferenceSplit, romaneio.conference[0], { fill: cardBody });
  band(conferenceRow + 1, conferenceSplit + 1, last, romaneio.conference[1], { fill: cardBody });
  sheet.getRow(conferenceRow + 1).height = 22;
  band(conferenceRow + 2, 1, last, '', { fill: cardBody });
  sheet.getRow(conferenceRow + 2).height = 20;
  const signature1 = splitAt(1 / 3, 1, last - 2);
  const signature2 = splitAt(2 / 3, signature1 + 1, last - 1);
  [0, signature1, signature2].forEach((first, index) => {
    const end = [signature1, signature2, last][index];
    const lineEnd = index < 2 && end - first > 2 ? end - 1 : end;
    if (lineEnd < end) setFill(sheet.getCell(conferenceRow + 3, end), cardBody);
    const cell = band(conferenceRow + 3, first + 1, lineEnd, ROMANEIO_SIGNATURES[index], {
      fill: cardBody, color: signatureColor, size: 8, bold: true, centered: true
    });
    cell.border = { top: { style: 'thin', color: { argb: 'FF94A3B8' } } };
  });
  sheet.getRow(conferenceRow + 3).height = 22;
  sheet.pageSetup.printArea = `A1:${sheet.getCell(conferenceRow + 3, last).address}`;
  sheet.pageSetup.printTitlesRow = `${tableHeader}:${tableHeader}`;
  sheet.headerFooter.oddFooter = `&L&8&K94A3B8${ROMANEIO_FOOTER.replaceAll('&', '&&')}&R&8&K94A3B8Romaneio: ${romaneio.numeroPedido}  |  Página &P de &N`;
  return workbook;
}

export async function exportRomaneioExcel(
  order: PurchaseOrder, stores?: StoreConfig[], visibleColumns?: Record<string, boolean>
) {
  const romaneio = prepareRomaneio(order, stores, visibleColumns);
  await downloadExcelWorkbook(buildRomaneioWorkbook(romaneio), `${romaneio.filename}.xlsx`);
}
