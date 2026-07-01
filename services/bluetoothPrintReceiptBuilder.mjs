const WIDTH = 32;

export function line(char = '-') {
  return String(char || '-').slice(0, 1).repeat(WIDTH);
}

export function center(text = '') {
  const value = String(text ?? '').trim();
  if (value.length >= WIDTH) return value.slice(0, WIDTH);
  const left = Math.floor((WIDTH - value.length) / 2);
  return `${' '.repeat(left)}${value}`;
}

export function leftRight(left = '', right = '') {
  const l = String(left ?? '');
  const r = String(right ?? '');
  const space = WIDTH - l.length - r.length;
  if (space > 0) return `${l}${' '.repeat(space)}${r}`;
  return `${l.slice(0, Math.max(0, WIDTH - r.length - 1))} ${r}`.slice(0, WIDTH);
}

export function money(amount = 0) {
  const value = Number(amount || 0);
  return `Rs. ${value.toFixed(2)}`;
}

export function formatDate(date = new Date()) {
  const value = date ? new Date(date) : new Date();
  if (Number.isNaN(value.getTime())) return '';
  return value.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    if (typeof item === 'string') {
      const match = item.match(/^(.*?)\s+x(\d+(?:\.\d+)?)(?:\s+\((.*)\))?$/i);
      return {
        name: match?.[1]?.trim() || item,
        qty: Number(match?.[2] || 1),
        price: null,
        total: null,
        note: match?.[3] || ''
      };
    }

    const qty = Number(item.qty ?? item.quantity ?? 1);
    const price = Number(item.price ?? item.unitPrice ?? 0);
    const total = Number(item.total ?? item.amount ?? price * qty);
    return {
      name: String(item.name ?? item.itemName ?? 'Item'),
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      price: Number.isFinite(price) ? price : null,
      total: Number.isFinite(total) ? total : null,
      note: item.note || item.notes || ''
    };
  });
}

const splitText = (text) => {
  const value = String(text ?? '');
  const parts = [];
  for (let i = 0; i < value.length; i += WIDTH) {
    parts.push(value.slice(i, i + WIDTH));
  }
  return parts.length ? parts : [''];
};

const text = (content, options = {}) => ({
  type: 'text',
  text: String(content ?? ''),
  align: options.align || 'left',
  bold: Boolean(options.bold),
  size: options.size || 'normal'
});

function addItemLines(lines, item) {
  const qty = Number(item.qty || 1);
  const itemTotal = item.total == null ? '' : money(item.total);
  const label = `${qty} x ${item.name}`;
  lines.push(...splitText(label).map((part, index) => (
    index === 0 ? leftRight(part, itemTotal) : part
  )));
  if (item.price != null) {
    lines.push(`  @ ${money(item.price)}`);
  }
  if (item.note) {
    lines.push(...splitText(`  Note: ${item.note}`));
  }
}

function buildReceiptLines(order, restaurant) {
  const items = normalizeItems(order.items);
  const total = Number(order.total || 0);
  const discount = Number(order.discount || order.discount_amount || 0);
  const taxRate = Number(restaurant.tax_rate || 0);
  const explicitTax = Number(order.tax || order.tax_amount || order.gst || 0);
  const taxableTotal = Math.max(total - discount, 0);
  const tax = explicitTax || (taxRate > 0 ? taxableTotal - (taxableTotal / (1 + taxRate / 100)) : 0);
  const subtotal = Math.max(total - tax + discount, 0);

  const lines = [
    center(restaurant.name || 'Restaurant'),
    ...(restaurant.address ? splitText(restaurant.address).map(center) : []),
    ...(restaurant.phone ? [center(`Phone: ${restaurant.phone}`)] : []),
    line(),
    leftRight('Order', order.order_number || `#${order.id}`),
    leftRight('Table', order.table_number || 'N/A'),
    leftRight('Date', formatDate(order.created_at)),
    line(),
    leftRight('Item', 'Amount'),
    line()
  ];

  items.forEach((item) => addItemLines(lines, item));

  lines.push(
    line(),
    leftRight('Subtotal', money(subtotal))
  );

  if (discount > 0) lines.push(leftRight('Discount', `-${money(discount)}`));
  if (tax > 0) lines.push(leftRight(taxRate ? `GST ${taxRate}%` : 'GST/Tax', money(tax)));

  lines.push(
    line('='),
    leftRight('TOTAL', money(total)),
    line('='),
    leftRight('Payment', order.payment_status || 'unpaid'),
    leftRight('Mode', order.payment_method || 'N/A'),
    line(),
    center('Thank you, visit again'),
    '\n\n'
  );

  return lines;
}

export function buildBluetoothPrintReceipt(order, restaurant) {
  const lines = buildReceiptLines(order, restaurant);

  return {
    printer: {
      paperWidth: '58mm',
      charactersPerLine: WIDTH
    },
    // Bluetooth Print apps differ slightly. Keep all app-specific field names
    // in this function so manufacturer schema tweaks are isolated here.
    printable: lines.map((receiptLine, index) => text(receiptLine, {
      align: index === 0 || receiptLine.trim() === 'Thank you, visit again' ? 'center' : 'left',
      bold: index === 0 || receiptLine.startsWith('TOTAL')
    })),
    text: lines.join('\n')
  };
}
