import { jsPDF } from 'jspdf';

export interface QuotePdfData {
  folio: string;
  date: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  city?: string;
  eventType: string;
  eventDate?: string;
  guestsCount?: number;
  items: Array<{
    description: string;
    price: number;
    quantity: number;
    discount?: number;
  }>;
  subtotal: number;
  discountTotal: number;
  total: number;
  observations?: string;
  terms?: string;
  logoUrl?: string;
  businessAddress?: string;
  whatsappPhone?: string;
}

export function generateQuotePdf(data: QuotePdfData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const darkBg = [15, 17, 21];
  const goldPrimary = [217, 155, 38];
  const textDark = [30, 30, 30];
  const textMuted = [100, 100, 100];
  const bgLight = [248, 249, 250];

  // Header Bar
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Gold accent line
  doc.setFillColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.rect(0, 28, pageWidth, 1.5, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('CHARLITRON PRODUCCIONES', margin, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(217, 155, 38);
  doc.text('PRESUPUESTO FORMAL DE EVENTOS', margin, 21);

  // Folio & Date Box in Header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`FOLIO: ${data.folio}`, pageWidth - margin, 14, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(`Fecha: ${data.date}`, pageWidth - margin, 21, { align: 'right' });

  y = 38;

  // Client & Event Details Box
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(margin, y, contentWidth, 36, 2, 2, 'FD');

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
  doc.text(data.clientName || 'N/A', margin + 25, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('Teléfono:', margin + 5, y + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientPhone || 'N/A', margin + 25, y + 22);

  if (data.clientEmail) {
    doc.setFont('helvetica', 'bold');
    doc.text('Email:', margin + 5, y + 29);
    doc.setFont('helvetica', 'normal');
    doc.text(data.clientEmail, margin + 25, y + 29);
  }

  // Column 2
  const col2X = margin + contentWidth / 2 + 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Tipo de Evento:', col2X, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(data.eventType || 'Evento General', col2X + 30, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha Evento:', col2X, y + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(data.eventDate || 'Por confirmar', col2X + 30, y + 22);

  if (data.guestsCount) {
    doc.setFont('helvetica', 'bold');
    doc.text('Invitados:', col2X, y + 29);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.guestsCount} personas`, col2X + 30, y + 29);
  } else if (data.city) {
    doc.setFont('helvetica', 'bold');
    doc.text('Ciudad:', col2X, y + 29);
    doc.setFont('helvetica', 'normal');
    doc.text(data.city, col2X + 30, y + 29);
  }

  y += 44;

  // Table Header
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(margin, y, contentWidth, 8, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('CONCEPTO / SERVICIO', margin + 4, y + 5.5);
  doc.text('CANT.', margin + contentWidth - 65, y + 5.5, { align: 'center' });
  doc.text('P. UNITARIO', margin + contentWidth - 35, y + 5.5, { align: 'right' });
  doc.text('IMPORTE', margin + contentWidth - 4, y + 5.5, { align: 'right' });

  y += 8;

  // Table Items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  if (data.items && data.items.length > 0) {
    data.items.forEach((item, index) => {
      // Alternating row background
      if (index % 2 === 0) {
        doc.setFillColor(252, 252, 252);
        doc.rect(margin, y, contentWidth, 7, 'F');
      }

      const rowTotal = (item.price * item.quantity) - (item.discount || 0);

      doc.text(item.description, margin + 4, y + 5);
      doc.text(item.quantity.toString(), margin + contentWidth - 65, y + 5, { align: 'center' });
      doc.text(`$${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, margin + contentWidth - 35, y + 5, { align: 'right' });
      doc.text(`$${rowTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, margin + contentWidth - 4, y + 5, { align: 'right' });

      doc.setDrawColor(240, 240, 240);
      doc.line(margin, y + 7, margin + contentWidth, y + 7);
      y += 7;
    });
  } else {
    doc.text('Servicios de producción audiovisual, gestión y logística de evento.', margin + 4, y + 5);
    doc.text('1', margin + contentWidth - 65, y + 5, { align: 'center' });
    doc.text(`$${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, margin + contentWidth - 35, y + 5, { align: 'right' });
    doc.text(`$${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, margin + contentWidth - 4, y + 5, { align: 'right' });
    y += 7;
  }

  y += 4;

  // Totals Box Right Aligned
  const totalsX = margin + contentWidth - 75;
  const totalsWidth = 75;

  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(totalsX, y, totalsWidth, 24, 1.5, 1.5, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Subtotal:', totalsX + 4, y + 6);
  doc.text(`$${(data.subtotal || data.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totalsX + totalsWidth - 4, y + 6, { align: 'right' });

  if (data.discountTotal && data.discountTotal > 0) {
    doc.text('Descuento:', totalsX + 4, y + 11);
    doc.text(`-$${data.discountTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totalsX + totalsWidth - 4, y + 11, { align: 'right' });
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(totalsX + 4, y + 15, totalsX + totalsWidth - 4, y + 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.text('TOTAL:', totalsX + 4, y + 21);
  doc.text(`$${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, totalsX + totalsWidth - 4, y + 21, { align: 'right' });

  y += 32;

  // Terms and Conditions / Notes Box
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(margin, y, contentWidth, 24, 1.5, 1.5, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(goldPrimary[0], goldPrimary[1], goldPrimary[2]);
  doc.text('TÉRMINOS Y OBSERVACIONES', margin + 4, y + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const termsText = data.terms || 'Cotización válida por 15 días. Para reservar la fecha se requiere un anticipo del 50%. El saldo restante se liquida 3 días antes del evento.';
  const splitTerms = doc.splitTextToSize(termsText, contentWidth - 8);
  doc.text(splitTerms, margin + 4, y + 12);

  if (data.observations) {
    const obsText = `Observaciones: ${data.observations}`;
    const splitObs = doc.splitTextToSize(obsText, contentWidth - 8);
    doc.text(splitObs, margin + 4, y + 18);
  }

  // Footer / Contact
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(0, footerY, pageWidth, 15, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Charlitron Producciones Audiovisuales & Logística de Eventos', pageWidth / 2, footerY + 6, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  const contactStr = `WhatsApp: ${data.whatsappPhone || '+52 55 1234 5678'}  |  ${data.businessAddress || 'Polanco, CDMX'}`;
  doc.text(contactStr, pageWidth / 2, footerY + 11, { align: 'center' });

  // Save the PDF
  doc.save(`Cotizacion_Charlitron_${data.folio}.pdf`);
}
