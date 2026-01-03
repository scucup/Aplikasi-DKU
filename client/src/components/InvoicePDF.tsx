import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Resort {
  id: string;
  name: string;
  legal_company_name?: string;
  company_address?: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  resort_id: string;
  start_date: string;
  end_date: string;
  total_revenue: number;
  dku_share: number;
  resort_share: number;
  status: string;
  generated_by: string;
  created_at: string;
  resort?: Resort;
}

interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  asset_category: string;
  revenue: number;
  dku_percentage: number;
  resort_percentage: number;
  dku_amount: number;
  resort_amount: number;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  swift_code?: string;
  npwp?: string;
}

export const generateInvoicePDF = async (
  invoice: Invoice,
  lineItems: InvoiceLineItem[],
  bankAccount: BankAccount,
  logoUrl?: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header - Logo and Company Info
  // Try to load logo image from Supabase Storage
  if (logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = logoUrl;
      
      // Wait for image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        setTimeout(reject, 5000); // 5 second timeout
      });
      
      // Add logo to PDF (10% smaller: 50*0.9=45, 20*0.9=18)
      doc.addImage(img, 'PNG', 15, 10, 45, 18);
    } catch (error) {
      console.warn('Logo image failed to load, using text fallback');
      // Fallback to text if image fails
      renderTextLogo(doc);
    }
  } else {
    // No logo URL provided, use text fallback
    renderTextLogo(doc);
  }
  
  function renderTextLogo(doc: jsPDF) {
    // DKU text (large, blue)
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('DKU', 15, 22);
    
    // ADVENTURES text (red, below DKU)
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ADVENTURES', 15, 28);
  }
  
  // Company address (right side)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const addressX = pageWidth - 15;
  doc.text('Villa Alam Lestari 1 Blok EC-49', addressX, 12, { align: 'right' });
  doc.text('Tibu Baru - Batam', addressX, 17, { align: 'right' });
  doc.text('Tlp: 0778-329968', addressX, 22, { align: 'right' });
  
  // Blue lines (thick and thin)
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(1.5);
  doc.line(15, 32, pageWidth - 15, 32);
  doc.setLineWidth(0.3);
  doc.line(15, 34, pageWidth - 15, 34);
  
  // INVOICE title - blue color matching logo and table, larger font for professional look
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth / 2, 46, { align: 'center' });
  
  // Reset text color to black for subsequent text
  doc.setTextColor(0, 0, 0);
  
  // Invoice details (left side)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const leftCol = 15;
  let yPos = 55;
  
  // To: section - define content start position after ":"
  const contentStartX = leftCol + 13;
  
  doc.setFont('helvetica', 'bold');
  doc.text('To', leftCol, yPos);
  doc.text(':', leftCol + 10, yPos);
  
  const resortLegalName = invoice.resort?.legal_company_name || invoice.resort?.name || '-';
  const resortAddress = invoice.resort?.company_address || '-';
  
  doc.setFont('helvetica', 'bold');
  doc.text(resortLegalName, contentStartX, yPos);
  yPos += 6;
  
  // Accounting Dept - aligned with company name
  doc.setFont('helvetica', 'normal');
  doc.text('Accounting Dept.', contentStartX, yPos);
  yPos += 6;
  
  // Split address into multiple lines if needed - aligned with company name
  const addressLines = doc.splitTextToSize(resortAddress, 80);
  addressLines.forEach((line: string) => {
    doc.text(line, contentStartX, yPos);
    yPos += 5;
  });
  
  // Invoice info (right side)
  const rightCol = pageWidth - 80;
  let rightYPos = 55;
  
  doc.setFont('helvetica', 'normal');
  doc.text('S/NO', rightCol, rightYPos);
  doc.text(': ' + invoice.invoice_number, rightCol + 20, rightYPos);
  rightYPos += 7;
  
  doc.text('Date', rightCol, rightYPos);
  const formattedDate = new Date(invoice.created_at).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  doc.text(': ' + formattedDate, rightCol + 20, rightYPos);
  rightYPos += 7;
  
  doc.text('Term', rightCol, rightYPos);
  doc.text(': Cash', rightCol + 20, rightYPos);
  rightYPos += 7;
  
  // Billing Period
  const startDateFormatted = new Date(invoice.start_date).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
  const endDateFormatted = new Date(invoice.end_date).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
  doc.text('Period', rightCol, rightYPos);
  doc.text(`: ${startDateFormatted} - ${endDateFormatted}`, rightCol + 20, rightYPos);
  
  // Period description - removed as per user request
  yPos += 8;
  
  // Line items table - detailed breakdown with profit sharing
  const tableData = lineItems.map((item) => [
    item.asset_category.replace('_', ' '),
    `Rp ${Number(item.revenue).toLocaleString('id-ID')}`,
    `${item.dku_percentage}%`,
    `Rp ${Number(item.dku_amount).toLocaleString('id-ID')}`,
    `${item.resort_percentage}%`,
    `Rp ${Number(item.resort_amount).toLocaleString('id-ID')}`,
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Asset Category', 'Revenue', 'DKU %', 'DKU Amount', 'Resort %', 'Resort Amount']],
    body: tableData,
    foot: [[
      'TOTAL',
      `Rp ${Number(invoice.total_revenue).toLocaleString('id-ID')}`,
      '',
      `Rp ${Number(invoice.dku_share).toLocaleString('id-ID')}`,
      '',
      `Rp ${Number(invoice.resort_share).toLocaleString('id-ID')}`,
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // Blue color matching DKU logo
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [37, 99, 235], // Blue color matching DKU logo
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'center' },
      5: { halign: 'right' },
    },
  } as any);
  
  // Summary billing section
  let finalY = (doc as any).lastAutoTable.finalY + 5;
  
  // Get table width (same as autoTable default: margin 14 on each side)
  const tableMargin = 14;
  const tableWidth = pageWidth - (tableMargin * 2);
  
  // Add summary box for total payment - same width as table
  doc.setFillColor(37, 99, 235); // Blue color matching DKU logo
  doc.rect(tableMargin, finalY, tableWidth, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL PAYMENT TO ${bankAccount.account_holder_name.toUpperCase()}`, tableMargin + 3, finalY + 6.5);
  doc.text(`Rp ${Number(invoice.dku_share).toLocaleString('id-ID')}`, pageWidth - tableMargin - 3, finalY + 6.5, { align: 'right' });
  
  finalY += 15;
  
  // Bank account details
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let bankY = finalY + 5;
  
  doc.text('Please to be paid to our account as below:', leftCol, bankY);
  bankY += 6;
  doc.text('Name of Bank', leftCol, bankY);
  doc.text(`: ${bankAccount.bank_name}`, leftCol + 40, bankY);
  bankY += 5;
  doc.text('Beneficiary Name', leftCol, bankY);
  doc.text(`: ${bankAccount.account_holder_name}`, leftCol + 40, bankY);
  bankY += 5;
  doc.text('Account No.', leftCol, bankY);
  doc.text(`: ${bankAccount.account_number}`, leftCol + 40, bankY);
  bankY += 5;
  
  if (bankAccount.swift_code) {
    doc.text('Swift Code', leftCol, bankY);
    doc.text(`: ${bankAccount.swift_code}`, leftCol + 40, bankY);
    bankY += 5;
  }
  
  if (bankAccount.npwp) {
    doc.text('NPWP', leftCol, bankY);
    doc.text(`: ${bankAccount.npwp}`, leftCol + 40, bankY);
    bankY += 5;
  }
  
  // Closing and signature
  bankY += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Your Sincerely,', pageWidth - 60, bankY);
  bankY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(bankAccount.account_holder_name.toUpperCase(), pageWidth - 60, bankY);
  
  // Signature space (empty space for manual signature after print)
  bankY += 25; // Space for signature
  
  // Name below signature space
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('NIKO NANDA KARUA', pageWidth - 60, bankY);
  
  // Bottom blue lines (thin on top, thick on bottom - mirror of header)
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.3);
  doc.line(15, doc.internal.pageSize.getHeight() - 12, pageWidth - 15, doc.internal.pageSize.getHeight() - 12);
  doc.setLineWidth(1.5);
  doc.line(15, doc.internal.pageSize.getHeight() - 10, pageWidth - 15, doc.internal.pageSize.getHeight() - 10);
  
  return doc;
};
