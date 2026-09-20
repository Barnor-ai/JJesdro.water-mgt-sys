import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Sale, ProductionBatch, FinishedGoodsInventory, Customer } from '../types/database';
import { formatCurrency, formatDate } from './utils';

export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Data') {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
  }
}

export function exportToCSV(data: any[], fileName: string) {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
  }
}

export function generateInvoicePDF(sale: Sale, customer?: Customer, type: 'Invoice' | 'Receipt' | 'Delivery Note' = 'Invoice') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Colors & Style
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 40, 'F');

  // Brand Logo / Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('H2O MANAGEMENT SYSTEM', 15, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('AquaFlow Pure Spring & Mineral Water Plant', 15, 25);
  doc.text('Industrial Zone, Plant No. 4, Clean Water Way • Contact: +1 (800) 555-H2O-WATER', 15, 31);

  // Document Type Banner
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text((type || 'INVOICE').toUpperCase(), 155, 20);

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Doc #: ${sale.invoice_number}`, 155, 28);
  doc.text(`Date: ${formatDate(sale.sale_date)}`, 155, 34);

  // Bill To / Details Section
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER / BILL TO:', 15, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${customer?.name || sale.customer_name || 'Walk-in Customer'}`, 15, 59);
  doc.text(`Type: ${customer?.type || sale.type || 'Retail'}`, 15, 65);
  doc.text(`Phone: ${customer?.phone || 'N/A'}`, 15, 71);
  doc.text(`Address: ${customer?.address || 'N/A'}`, 15, 77);

  // Meta Info Box
  doc.setFont('helvetica', 'bold');
  doc.text('TRANSACTION DETAILS:', 120, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Status: ${sale.payment_status}`, 120, 59);
  doc.text(`Payment Method: ${sale.payment_method}`, 120, 65);
  doc.text(`Due Date: ${formatDate(sale.due_date) || 'Immediate'}`, 120, 71);
  doc.text(`Sales Rep: ${sale.salesperson_name || 'HQ Sales'}`, 120, 77);

  // Table Headers
  const tableStartY = 88;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, tableStartY, 180, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, tableStartY, 180, 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('#', 18, tableStartY + 5.5);
  doc.text('Product Description / Size', 30, tableStartY + 5.5);
  doc.text('Quantity', 115, tableStartY + 5.5, { align: 'right' });
  doc.text('Unit Price', 150, tableStartY + 5.5, { align: 'right' });
  doc.text('Total', 190, tableStartY + 5.5, { align: 'right' });

  // Table Rows
  let currentY = tableStartY + 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  sale.items.forEach((item, index) => {
    currentY += 8;
    doc.text(`${index + 1}`, 18, currentY - 2);
    doc.text(`Purified Bottled Water - ${item.bottle_size}`, 30, currentY - 2);
    doc.text(`${item.quantity.toLocaleString()}`, 115, currentY - 2, { align: 'right' });
    doc.text(`${formatCurrency(item.unit_price)}`, 150, currentY - 2, { align: 'right' });
    doc.text(`${formatCurrency(item.total_price)}`, 190, currentY - 2, { align: 'right' });
    doc.line(15, currentY, 195, currentY);
  });

  // Summary section
  const summaryY = currentY + 12;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 140, summaryY);
  doc.text(`${formatCurrency(sale.subtotal)}`, 190, summaryY, { align: 'right' });

  if (sale.discount > 0) {
    doc.text('Discount:', 140, summaryY + 6);
    doc.text(`-${formatCurrency(sale.discount)}`, 190, summaryY + 6, { align: 'right' });
  }

  if (sale.tax > 0) {
    doc.text('Tax (VAT):', 140, summaryY + 12);
    doc.text(`+${formatCurrency(sale.tax)}`, 190, summaryY + 12, { align: 'right' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setFillColor(240, 249, 255);
  doc.rect(135, summaryY + 16, 60, 9, 'F');
  doc.setTextColor(2, 132, 199);
  doc.text('Total Amount:', 140, summaryY + 22);
  doc.text(`${formatCurrency(sale.total_amount)}`, 190, summaryY + 22, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Amount Paid: ${formatCurrency(sale.amount_paid)}`, 140, summaryY + 30);
  doc.text(`Balance Due: ${formatCurrency(sale.total_amount - sale.amount_paid)}`, 140, summaryY + 35);

  // Footer / Terms
  const footerY = 250;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, footerY, 195, footerY);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Terms & Conditions:', 15, footerY + 6);
  doc.text('1. Goods received in good condition are not returnable without prior QA authorization.', 15, footerY + 10);
  doc.text('2. Please reference the invoice number when making electronic wire or ACH payments.', 15, footerY + 14);
  doc.text('3. Thank you for choosing AquaFlow Mineral Water System. Pure Quality Guaranteed.', 15, footerY + 18);

  // Signatures
  doc.text('_____________________________', 25, footerY + 32);
  doc.text('Authorized Signature / Dispatcher', 25, footerY + 36);

  doc.text('_____________________________', 140, footerY + 32);
  doc.text('Customer Received Signature & Date', 140, footerY + 36);

  // Save the document
  doc.save(`${type}_${sale.invoice_number}.pdf`);
}

export function generateProductionReportPDF(batches: ProductionBatch[], inventory: FinishedGoodsInventory[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('H2O MANAGEMENT SYSTEM - PRODUCTION AUDIT REPORT', 15, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 24);

  // Summary Metrics
  const totalProduced = batches.reduce((acc, b) => acc + b.quantity_produced, 0);
  const totalAccepted = batches.reduce((acc, b) => acc + b.accepted_quantity, 0);
  const totalRejected = batches.reduce((acc, b) => acc + b.rejected_quantity + b.damaged_bottles, 0);
  const avgEfficiency = totalProduced > 0 ? (totalAccepted / totalProduced) * 100 : 0;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUCTION PERFORMANCE SUMMARY', 15, 42);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Batches Logged: ${batches.length}`, 15, 48);
  doc.text(`Total Produced Units: ${totalProduced.toLocaleString()}`, 15, 54);
  doc.text(`Total Accepted (Good Quality): ${totalAccepted.toLocaleString()}`, 80, 48);
  doc.text(`Total Scrap/Waste: ${totalRejected.toLocaleString()}`, 80, 54);
  doc.text(`Overall Plant Efficiency: ${avgEfficiency.toFixed(2)}%`, 145, 48);

  // Table
  let y = 65;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, 180, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Batch #', 17, y + 4.5);
  doc.text('Date', 52, y + 4.5);
  doc.text('Size', 70, y + 4.5);
  doc.text('Machine', 85, y + 4.5);
  doc.text('Produced', 125, y + 4.5, { align: 'right' });
  doc.text('Accepted', 150, y + 4.5, { align: 'right' });
  doc.text('Waste %', 172, y + 4.5, { align: 'right' });
  doc.text('Cost/Unit', 192, y + 4.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  batches.slice(0, 22).forEach((b) => {
    y += 7;
    doc.text(b.batch_number, 17, y + 4.5);
    doc.text(formatDate(b.production_date), 52, y + 4.5);
    doc.text(b.bottle_size, 70, y + 4.5);
    doc.text(b.machine_used.slice(0, 18), 85, y + 4.5);
    doc.text(b.quantity_produced.toLocaleString(), 125, y + 4.5, { align: 'right' });
    doc.text(b.accepted_quantity.toLocaleString(), 150, y + 4.5, { align: 'right' });
    doc.text(`${b.waste_percent}%`, 172, y + 4.5, { align: 'right' });
    doc.text(`$${b.cost_per_bottle}`, 192, y + 4.5, { align: 'right' });
    doc.line(15, y + 6, 195, y + 6);
  });

  doc.save(`Production_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
