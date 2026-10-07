import { jsPDF } from 'jspdf';

export interface QuotePdfData {
  folio: string;
  date: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  city?: string;
  eventType?: string;
  eventDate?: string;
  guestsCount?: number;
  status?: 'draft' | 'sent' | 'approved' | 'cancelled';
  validity?: string;
  items: Array<{
    description: string;
    price: number;
    quantity: number;
    discount?: number;
  }>;
  subtotal: number;
  discountTotal: number;
  applyIva?: boolean;
  ivaTotal?: number;
  discountPercent?: number;
  percentDiscountTotal?: number;
  total: number;
  observations?: string;
  terms?: string;
  logoUrl?: string;
}

const BRAND = {
  name: 'CELEBRA TU EVENTO SLP',
  subtitle: 'Planeación de Eventos y Producción Visual',
  email: 'integrandotugente@hotmail.com',
  whatsapp: '4444 23 7092',
  website: 'https://planeaslp.com/',
  facebook: 'https://www.facebook.com/celebratueventoslp'
};
const OFFICIAL_LOGO_URL = 'https://eztuwxavcvqingoycorg.supabase.co/storage/v1/object/public/event-assets/covers/u7w7qwsdi0s.png';

export function getQuoteValidityText(...texts: Array<string | undefined>): string {
  for (const text of texts) {
    const match = text?.match(/(?:validez|vigencia)\s*(?:de|:)?\s*(\d+\s+d[ií]as?(?:\s+(?:naturales|h[aá]biles?))?)/i);
    if (match) return match[1];
  }
  return 'Consultar términos comerciales';
}

async function loadLogoData(logoUrl?: string): Promise<{ data: string; format: 'PNG' | 'JPEG' } | undefined> {
  try {
    const response = await fetch(logoUrl || OFFICIAL_LOGO_URL);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    const format = blob.type === 'image/png' ? 'PNG' : blob.type === 'image/jpeg' ? 'JPEG' : undefined;
    if (!format) return undefined;

    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Logo no disponible'));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { data, format };
  } catch {
    return undefined;
  }
}

function buildQuotePdfDocument(data: QuotePdfData, logo?: { data: string; format: 'PNG' | 'JPEG' }): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const footerY = pageHeight - 23;
  let y = margin;

  // Colors
  const darkBg = [31, 34, 38];
  const goldPrimary = [205, 139, 35];
  const textDark = [30, 30, 30];
  const textMuted = [100, 100, 100];
  const bgLight = [248, 249, 250];

  doc.setFillColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.rect(0, 0, pageWidth, 2, 'F');

  if (logo) {
    try {
      doc.addImage(logo.data, logo.format, margin, 8, 22, 19, undefined, 'FAST');
    } catch {
      // An invalid or unsupported logo should not prevent the quote from downloading.
    }
  }

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(BRAND.name, margin + (logo ? 27 : 0), 14);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(BRAND.subtitle, margin + (logo ? 27 : 0), 20);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`FOLIO: ${data.folio}`, pageWidth - margin, 14, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Emitida: ${data.date}`, pageWidth - margin, 20, { align: 'right' });
  doc.setFillColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.rect(0, 31, pageWidth, 0.7, 'F');

  y = 39;

  // Client & Event Details Box
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(margin, y, contentWidth, 42, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.text('DATOS DEL CLIENTE Y EVENTO', margin + 5, y + 7);

  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  // Column 1
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', margin + 5, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientName || '—', margin + 25, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('Teléfono:', margin + 5, y + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientPhone || '—', margin + 25, y + 22);

  if (data.clientEmail) {
    doc.setFont('helvetica', 'bold');
    doc.text('Email:', margin + 5, y + 29);
    doc.setFont('helvetica', 'normal');
    doc.text(data.clientEmail, margin + 25, y + 29);
  }

  // Column 2
  const col2X = margin + contentWidth / 2 + 5;
  doc.setFont('helvetica', 'bold');
  const eventDetails = [
    data.eventType && ['Tipo de evento:', data.eventType],
    data.eventDate && ['Fecha del evento:', data.eventDate],
    data.city && ['Ubicación:', data.city],
    data.guestsCount && ['Invitados:', `${data.guestsCount} personas`]
  ].filter((detail): detail is [string, string] => Boolean(detail));
  eventDetails.slice(0, 3).forEach(([label, value], index) => {
    const rowY = y + 15 + index * 8;
    doc.setFont('helvetica', 'bold');
    doc.text(label, col2X, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, col2X + 31, rowY, { maxWidth: contentWidth / 2 - 38 });
  });

  const statusLabels = { draft: 'Borrador', sent: 'Enviada', approved: 'Aprobada', cancelled: 'Cancelada' };
  const statusLabel = data.status ? statusLabels[data.status] : 'Emitida';
  doc.setFont('helvetica', 'bold');
  doc.text('Estatus:', col2X, y + 38);
  doc.setFont('helvetica', 'normal');
  doc.text(statusLabel, col2X + 31, y + 38);
  doc.setFont('helvetica', 'bold');
  doc.text('Vigencia:', margin + 5, y + 38);
  doc.setFont('helvetica', 'normal');
  doc.text(data.validity || 'Consultar términos comerciales', margin + 25, y + 38);

  y += 50;

  const drawTableHeader = () => {
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('SERVICIO', margin + 4, y + 5.5);
    doc.text('CANT.', margin + contentWidth - 82, y + 5.5, { align: 'center' });
    doc.text('P. UNITARIO', margin + contentWidth - 59, y + 5.5, { align: 'right' });
    doc.text('DESCUENTO', margin + contentWidth - 31, y + 5.5, { align: 'right' });
    doc.text('IMPORTE', margin + contentWidth - 4, y + 5.5, { align: 'right' });
    y += 8;
  };
  const startNewPage = (repeatTableHeader = false) => {
    doc.addPage();
    y = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(BRAND.name, margin, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(`Folio ${data.folio} · Continuación`, pageWidth - margin, y + 4, { align: 'right' });
    y += 11;
    if (repeatTableHeader) drawTableHeader();
  };

  drawTableHeader();

  // Table Items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  if (data.items && data.items.length > 0) {
    data.items.forEach((item, index) => {
      // Alternating row background
      const descriptionLines = doc.splitTextToSize(item.description, contentWidth - 91);
      const rowHeight = Math.max(8, descriptionLines.length * 4 + 4);
      if (y + rowHeight > footerY - 4) startNewPage(true);
      if (index % 2 === 0) {
        doc.setFillColor(252, 252, 252);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }

      const rowTotal = (item.price * item.quantity) - (item.discount || 0);

      doc.text(descriptionLines, margin + 4, y + 5);
      doc.text(item.quantity.toString(), margin + contentWidth - 82, y + 5, { align: 'center' });
      doc.text(`$${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, margin + contentWidth - 59, y + 5, { align: 'right' });
      doc.text(item.discount ? `-$${item.discount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—', margin + contentWidth - 31, y + 5, { align: 'right' });
      doc.text(`$${rowTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, margin + contentWidth - 4, y + 5, { align: 'right' });

      doc.setDrawColor(240, 240, 240);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
      y += rowHeight;
    });
  } else {
    doc.text('No se especificaron servicios.', margin + 4, y + 5);
    y += 8;
  }

  y += 4;

  // Totals Box Right Aligned
  const totalsX = margin + contentWidth - 75;
  const totalsWidth = 75;
  const hasPercentDiscount = !!(data.percentDiscountTotal && data.percentDiscountTotal > 0);
  const hasIva = !!(data.applyIva && data.ivaTotal && data.ivaTotal > 0);
  const extraLines = (hasPercentDiscount ? 1 : 0) + (hasIva ? 1 : 0);
  const totalsHeight = 24 + extraLines * 5;
  if (y + totalsHeight > footerY - 4) startNewPage();

  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(totalsX, y, totalsWidth, totalsHeight, 1.5, 1.5, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Subtotal:', totalsX + 4, y + 6);
  doc.text(`$${data.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totalsX + totalsWidth - 4, y + 6, { align: 'right' });

  let lineY = y + 11;

  if (data.discountTotal && data.discountTotal > 0) {
    doc.text('Descuento:', totalsX + 4, lineY);
    doc.text(`-$${data.discountTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totalsX + totalsWidth - 4, lineY, { align: 'right' });
    lineY += 5;
  }

  if (hasPercentDiscount) {
    doc.text(`Descuento ${data.discountPercent}%:`, totalsX + 4, lineY);
    doc.text(`-$${(data.percentDiscountTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totalsX + totalsWidth - 4, lineY, { align: 'right' });
    lineY += 5;
  }

  if (hasIva) {
    doc.text('IVA 16%:', totalsX + 4, lineY);
    doc.text(`+$${(data.ivaTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totalsX + totalsWidth - 4, lineY, { align: 'right' });
    lineY += 5;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(totalsX + 4, y + totalsHeight - 9, totalsX + totalsWidth - 4, y + totalsHeight - 9);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.text('TOTAL:', totalsX + 4, y + totalsHeight - 3);
  doc.text(`$${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, totalsX + totalsWidth - 4, y + totalsHeight - 3, { align: 'right' });

  y += totalsHeight + 8;

  // Terms and observations stay together in a variable-height box.
  const termsText = data.terms || 'No se especificaron términos comerciales.';
  const splitTerms = doc.splitTextToSize(termsText, contentWidth - 8);
  const splitObservations = data.observations
    ? doc.splitTextToSize(`Observaciones: ${data.observations}`, contentWidth - 8)
    : [];
  const termsBoxHeight = 14 + (splitTerms.length + splitObservations.length) * 4;
  if (y + termsBoxHeight > footerY - 4) startNewPage();

  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(margin, y, contentWidth, termsBoxHeight, 1.5, 1.5, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.text('TÉRMINOS Y OBSERVACIONES', margin + 4, y + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(splitTerms, margin + 4, y + 12);

  if (splitObservations.length > 0) {
    doc.text(splitObservations, margin + 4, y + 12 + splitTerms.length * 4);
  }

  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, footerY, pageWidth, 23, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(BRAND.name, pageWidth / 2, footerY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(230, 230, 230);
    doc.text(`${BRAND.email}  |  WhatsApp ${BRAND.whatsapp}  |  ${BRAND.website}`, pageWidth / 2, footerY + 11, { align: 'center' });
    doc.text(BRAND.facebook, pageWidth / 2, footerY + 17, { align: 'center' });
  }

  return doc;
}

export async function generateQuotePdf(data: QuotePdfData): Promise<void> {
  const logo = await loadLogoData(data.logoUrl);
  buildQuotePdfDocument(data, logo).save(`Cotizacion_CelebraTuEvento_${data.folio}.pdf`);
}

export async function generateQuotePdfBase64(data: QuotePdfData): Promise<string> {
  const logo = await loadLogoData(data.logoUrl);
  const dataUri = buildQuotePdfDocument(data, logo).output('datauristring');
  const separatorIndex = dataUri.indexOf(',');
  if (separatorIndex === -1) throw new Error('No se pudo generar el PDF de la cotización.');
  return dataUri.slice(separatorIndex + 1);
}
