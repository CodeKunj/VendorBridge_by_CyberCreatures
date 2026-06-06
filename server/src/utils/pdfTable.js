const { formatINR } = require('./currency');

/** Column layout for A4 PDFs with 50pt margins (content width ~495pt). */
const LINE_ITEM_COLUMNS = {
  description: { x: 50, width: 200 },
  qty: { x: 255, width: 40, align: 'right' },
  unitPrice: { x: 300, width: 100, align: 'right' },
  total: { x: 405, width: 145, align: 'right' },
};

const drawCell = (doc, text, column, y, options = {}) => {
  doc.text(String(text ?? ''), column.x, y, {
    width: column.width,
    align: column.align || 'left',
    ...options,
  });
};

const drawLineItemHeader = (doc, y) => {
  doc.fontSize(10).font('Helvetica-Bold');
  drawCell(doc, 'Item Description', LINE_ITEM_COLUMNS.description, y);
  drawCell(doc, 'Qty', LINE_ITEM_COLUMNS.qty, y);
  drawCell(doc, 'Unit Price (INR)', LINE_ITEM_COLUMNS.unitPrice, y);
  drawCell(doc, 'Total (INR)', LINE_ITEM_COLUMNS.total, y);
  doc.font('Helvetica');
  doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
  return y + 25;
};

const drawLineItemRow = (doc, item, y) => {
  const name = item.item_name || item.product_name || 'Line Item';
  const qty = Number(item.quantity) || 0;
  const unitPrice = parseFloat(item.unit_price) || 0;
  const total = parseFloat(item.total_price) || unitPrice * qty;

  doc.fontSize(10);
  drawCell(doc, name, LINE_ITEM_COLUMNS.description, y);

  const description = item.description || item.notes || '';
  if (description) {
    doc.fontSize(8).fillColor('#64748b');
    drawCell(doc, description, LINE_ITEM_COLUMNS.description, y + 12);
    doc.fillColor('#000000').fontSize(10);
  }

  drawCell(doc, qty.toString(), LINE_ITEM_COLUMNS.qty, y);
  drawCell(doc, formatINR(unitPrice), LINE_ITEM_COLUMNS.unitPrice, y);
  drawCell(doc, formatINR(total), LINE_ITEM_COLUMNS.total, y);

  return y + (description ? 36 : 22);
};

const drawAmountRow = (doc, label, amount, y, { bold = false } = {}) => {
  if (bold) {
    doc.font('Helvetica-Bold').fontSize(12);
  } else {
    doc.font('Helvetica').fontSize(10);
  }
  doc.text(label, 300, y, { width: 100, align: 'right' });
  drawCell(doc, formatINR(amount), LINE_ITEM_COLUMNS.total, y);
  doc.font('Helvetica');
  return y + (bold ? 22 : 16);
};

module.exports = {
  LINE_ITEM_COLUMNS,
  drawLineItemHeader,
  drawLineItemRow,
  drawAmountRow,
  formatINR,
};
