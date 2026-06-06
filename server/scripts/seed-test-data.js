#!/usr/bin/env node
/**
 * VendorBridge — seed script for manual QA / workflow testing.
 *
 * Usage:
 *   node scripts/seed-test-data.js          # insert missing test data (idempotent)
 *   node scripts/seed-test-data.js --reset  # remove prior test data, then reseed
 */

const path = require('path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const TEST_PASSWORD = 'Test@1234';
const TEST_MARKER = 'seed-test-data-v1';

const TEST_ACCOUNTS = [
  { email: 'admin@test.com', name: 'Test Admin', role: 'admin' },
  { email: 'procurement@test.com', name: 'Test Procurement Officer', role: 'procurement_officer' },
  { email: 'manager@test.com', name: 'Test Manager', role: 'manager' },
  { email: 'vendor@test.com', name: 'Acme Supplies Contact', role: 'vendor' },
  { email: 'vendor2@test.com', name: 'Global Parts Contact', role: 'vendor' },
];

const VENDOR_PROFILES = [
  {
    email: 'vendor@test.com',
    vendor_code: 'VND-SEED-001',
    company_name: 'Acme Industrial Supplies',
    gst_number: '27AABCU9603R1ZM',
    contact_person: 'Rahul Mehta',
    phone: '+91-9876543210',
    address: '12 Industrial Estate, Pune, Maharashtra 411001',
    category: 'Raw Material',
    status: 'active',
  },
  {
    email: 'vendor2@test.com',
    vendor_code: 'VND-SEED-002',
    company_name: 'Global Parts Traders',
    gst_number: '29AADCG1234H1Z5',
    contact_person: 'Priya Sharma',
    phone: '+91-9876543211',
    address: '45 MG Road, Bengaluru, Karnataka 560001',
    category: 'Manufacturing',
    status: 'active',
  },
  {
    email: 'logistics@test.vendorbridge.local',
    vendor_code: 'VND-SEED-003',
    company_name: 'Swift Logistics Co.',
    gst_number: '07AAECS1234F1Z9',
    contact_person: 'Vikram Singh',
    phone: '+91-9876543212',
    address: '88 Transport Nagar, New Delhi 110037',
    category: 'Logistics',
    status: 'pending_verification',
  },
];

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const log = (message) => console.log(`[seed] ${message}`);
const warn = (message) => console.warn(`[seed] ${message}`);
const fail = (message) => {
  console.error(`[seed] ERROR: ${message}`);
  process.exit(1);
};

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

async function hashPassword(password) {
  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
  return bcrypt.hash(password, rounds);
}

async function ensureVendorUserIdColumn() {
  const { error } = await supabase.from('vendors').select('user_id').limit(1);
  if (!error) return;

  if (String(error.message).includes('user_id')) {
    warn('vendors.user_id column missing — vendor portal will not work until you run docs/schema.sql or:');
    warn('  ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;');
  }
}

async function fetchUsersByEmails(emails) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, name')
    .in('email', emails);

  if (error) fail(error.message);
  return data || [];
}

async function deleteTestData() {
  log('Removing previous test data...');

  const emails = [
    ...TEST_ACCOUNTS.map((u) => u.email),
    ...VENDOR_PROFILES.map((v) => v.email),
  ];

  const users = await fetchUsersByEmails(emails);
  const userIds = users.map((u) => u.id);

  if (userIds.length === 0) {
    log('No existing test users found.');
    return;
  }

  const { data: vendorsByEmail } = await supabase
    .from('vendors')
    .select('id')
    .in('email', emails);

  let vendorsByUser = [];
  const { data: byUser, error: vendorUserError } = await supabase
    .from('vendors')
    .select('id')
    .in('user_id', userIds);

  if (!vendorUserError) {
    vendorsByUser = byUser || [];
  }

  const vendorIds = [...new Set([
    ...(vendorsByEmail || []).map((v) => v.id),
    ...vendorsByUser.map((v) => v.id),
  ])];

  const { data: rfqs } = await supabase
    .from('rfqs')
    .select('id')
    .in('created_by', userIds);

  const rfqIds = (rfqs || []).map((r) => r.id);

  const tablesByUser = ['notifications', 'activity_logs', 'auth_sessions', 'password_reset_tokens'];
  for (const table of tablesByUser) {
    await supabase.from(table).delete().in('user_id', userIds);
  }

  if (vendorIds.length > 0) {
    const { data: pos } = await supabase.from('purchase_orders').select('id').in('vendor_id', vendorIds);
    const poIds = (pos || []).map((p) => p.id);
    if (poIds.length > 0) {
      await supabase.from('invoices').delete().in('po_id', poIds);
    }
    await supabase.from('purchase_orders').delete().in('vendor_id', vendorIds);
  }

  await supabase.from('purchase_orders').delete().in('buyer_id', userIds);

  if (rfqIds.length > 0) {
    await supabase.from('approvals').delete().in('rfq_id', rfqIds);
    const { data: quotations } = await supabase.from('quotations').select('id').in('rfq_id', rfqIds);
    const quotationIds = (quotations || []).map((q) => q.id);
    if (quotationIds.length > 0) {
      await supabase.from('quotation_items').delete().in('quotation_id', quotationIds);
      await supabase.from('quotation_attachments').delete().in('quotation_id', quotationIds);
      await supabase.from('quotations').delete().in('id', quotationIds);
    }
    await supabase.from('rfq_items').delete().in('rfq_id', rfqIds);
    await supabase.from('rfq_vendor_assignments').delete().in('rfq_id', rfqIds);
    await supabase.from('rfq_attachments').delete().in('rfq_id', rfqIds);
    await supabase.from('rfqs').delete().in('id', rfqIds);
  }

  if (vendorIds.length > 0) {
    await supabase.from('vendors').delete().in('id', vendorIds);
  }

  await supabase.from('users').delete().in('id', userIds);
  log('Previous test data removed.');
}

async function upsertUser({ email, name, role }, passwordHash) {
  const { data: existing } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('users')
      .update({
        name,
        role,
        status: 'active',
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from('users')
    .insert({
      name,
      email,
      role,
      status: 'active',
      password_hash: passwordHash,
    })
    .select('id')
    .single();

  if (error) fail(`User ${email}: ${error.message}`);
  return data.id;
}

async function seedUsers(passwordHash) {
  log('Creating test users...');
  const ids = {};
  for (const account of TEST_ACCOUNTS) {
    ids[account.email] = await upsertUser(account, passwordHash);
  }
  return ids;
}

async function seedVendors(userIds) {
  log('Creating vendor profiles...');
  const ids = {};

  for (const profile of VENDOR_PROFILES) {
    const linkedUserId = userIds[profile.email] || null;
    const payload = { ...profile, user_id: linkedUserId };

    const { data: existing } = await supabase
      .from('vendors')
      .select('id')
      .eq('vendor_code', profile.vendor_code)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('vendors').update({
        ...payload,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
      if (error) fail(`Vendor ${profile.vendor_code}: ${error.message}`);
      ids[profile.vendor_code] = existing.id;
      continue;
    }

    const { data, error } = await supabase
      .from('vendors')
      .insert(payload)
      .select('id')
      .single();

    if (error) fail(`Vendor ${profile.vendor_code}: ${error.message}`);
    ids[profile.vendor_code] = data.id;
  }

  return ids;
}

async function createRfq({ rfq_number, title, description, deadline, status, created_by, items, vendorIds }) {
  const { data: rfq, error } = await supabase
    .from('rfqs')
    .insert({
      rfq_number,
      title,
      description,
      deadline,
      status,
      created_by,
    })
    .select('id')
    .single();

  if (error) fail(`RFQ ${rfq_number}: ${error.message}`);

  if (items?.length) {
    const { error: itemsError } = await supabase.from('rfq_items').insert(
      items.map((item) => ({
        rfq_id: rfq.id,
        item_name: item.product_name,
        description: item.notes || null,
        quantity: item.quantity,
        uom: item.unit || 'units',
      })),
    );
    if (itemsError) fail(`RFQ items ${rfq_number}: ${itemsError.message}`);
  }

  if (vendorIds?.length) {
    const { error: assignError } = await supabase.from('rfq_vendor_assignments').insert(
      vendorIds.map((vendor_id) => ({ rfq_id: rfq.id, vendor_id })),
    );
    if (assignError) fail(`RFQ assignments ${rfq_number}: ${assignError.message}`);
  }

  return rfq.id;
}

async function createQuotation({ rfq_id, vendor_id, total_amount, delivery_days, notes, status, items }) {
  const { data: quotation, error } = await supabase
    .from('quotations')
    .insert({
      rfq_id,
      vendor_id,
      total_amount,
      delivery_days,
      notes,
      status,
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) fail(`Quotation for RFQ ${rfq_id}: ${error.message}`);

  if (items?.length) {
    const { error: itemsError } = await supabase.from('quotation_items').insert(
      items.map((item) => ({
        quotation_id: quotation.id,
        item_name: item.product_name,
        description: item.notes || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
      })),
    );
    if (itemsError) fail(`Quotation items: ${itemsError.message}`);
  }

  return quotation.id;
}

async function seedWorkflow({ userIds, vendorIds }) {
  log('Creating RFQs, quotations, approvals, POs, and invoices...');

  const procurementId = userIds['procurement@test.com'];
  const managerId = userIds['manager@test.com'];
  const vendor1 = vendorIds['VND-SEED-001'];
  const vendor2 = vendorIds['VND-SEED-002'];
  const year = new Date().getFullYear();

  const { data: marker } = await supabase
    .from('rfqs')
    .select('id')
    .eq('rfq_number', `RFQ-${year}-SEED-001`)
    .maybeSingle();

  if (marker) {
    log('Workflow data already present (RFQ-SEED-001 exists). Use --reset to recreate.');
    return;
  }

  // 1) Draft RFQ — procurement still editing
  await createRfq({
    rfq_number: `RFQ-${year}-SEED-001`,
    title: 'Office Stationery Q3',
    description: `Draft RFQ for pens, paper, and folders. [${TEST_MARKER}]`,
    deadline: daysFromNow(21),
    status: 'draft',
    created_by: procurementId,
    items: [
      { product_name: 'A4 Copier Paper', quantity: 50, unit: 'reams', notes: '80 GSM white' },
      { product_name: 'Ballpoint Pens', quantity: 200, unit: 'pcs', notes: 'Blue ink' },
    ],
    vendorIds: [vendor1],
  });

  // 2) Published RFQ — open for bids, no quotations yet
  const rfqOpenId = await createRfq({
    rfq_number: `RFQ-${year}-SEED-002`,
    title: 'IT Laptops & Monitors',
    description: 'Published RFQ awaiting vendor quotations.',
    deadline: daysFromNow(14),
    status: 'published',
    created_by: procurementId,
    items: [
      { product_name: 'Business Laptop 14"', quantity: 25, unit: 'pcs', notes: '16GB RAM, 512GB SSD' },
      { product_name: '24" LED Monitor', quantity: 25, unit: 'pcs', notes: 'Full HD, HDMI' },
    ],
    vendorIds: [vendor1, vendor2],
  });

  // 3) Published RFQ — both vendors submitted (compare bids)
  const rfqCompareId = await createRfq({
    rfq_number: `RFQ-${year}-SEED-003`,
    title: 'Steel Sheets & Fasteners',
    description: 'Two competitive bids ready for comparison.',
    deadline: daysFromNow(10),
    status: 'published',
    created_by: procurementId,
    items: [
      { product_name: 'Mild Steel Sheet 2mm', quantity: 100, unit: 'sheets', notes: '4x8 ft' },
      { product_name: 'Hex Bolts M10', quantity: 5000, unit: 'pcs', notes: 'Grade 8.8' },
    ],
    vendorIds: [vendor1, vendor2],
  });

  const quoteAcmeCompare = await createQuotation({
    rfq_id: rfqCompareId,
    vendor_id: vendor1,
    total_amount: 485000,
    delivery_days: 12,
    notes: 'Includes transport to Pune warehouse.',
    status: 'submitted',
    items: [
      { product_name: 'Mild Steel Sheet 2mm', quantity: 100, unit_price: 4200 },
      { product_name: 'Hex Bolts M10', quantity: 5000, unit_price: 9.4 },
    ],
  });

  const quoteGlobalCompare = await createQuotation({
    rfq_id: rfqCompareId,
    vendor_id: vendor2,
    total_amount: 462500,
    delivery_days: 9,
    notes: 'Fastest delivery option.',
    status: 'submitted',
    items: [
      { product_name: 'Mild Steel Sheet 2mm', quantity: 100, unit_price: 4050 },
      { product_name: 'Hex Bolts M10', quantity: 5000, unit_price: 9.1 },
    ],
  });

  // 4) Closed RFQ — pending manager approval
  const rfqPendingApprovalId = await createRfq({
    rfq_number: `RFQ-${year}-SEED-004`,
    title: 'Warehouse Pallet Racking',
    description: 'Procurement selected Acme bid; awaiting manager approval.',
    deadline: daysFromNow(7),
    status: 'closed',
    created_by: procurementId,
    items: [
      { product_name: 'Pallet Rack Bay', quantity: 20, unit: 'units', notes: '3-level, 2 ton capacity' },
    ],
    vendorIds: [vendor1, vendor2],
  });

  const quotePending = await createQuotation({
    rfq_id: rfqPendingApprovalId,
    vendor_id: vendor1,
    total_amount: 890000,
    delivery_days: 15,
    notes: 'Installation included.',
    status: 'submitted',
    items: [
      { product_name: 'Pallet Rack Bay', quantity: 20, unit_price: 44500 },
    ],
  });

  await supabase.from('approvals').insert({
    rfq_id: rfqPendingApprovalId,
    quotation_id: quotePending,
    approver_id: managerId,
    status: 'pending',
    level: 1,
    comments: null,
  });

  // 5) Awarded RFQ — approved, PO issued, invoice pending
  const rfqAwardedId = await createRfq({
    rfq_number: `RFQ-${year}-SEED-005`,
    title: 'Packaging Material Annual Contract',
    description: 'Approved vendor and PO issued.',
    deadline: daysAgo(3),
    status: 'awarded',
    created_by: procurementId,
    items: [
      { product_name: 'Corrugated Boxes', quantity: 10000, unit: 'pcs', notes: 'Medium size' },
      { product_name: 'Bubble Wrap Rolls', quantity: 500, unit: 'rolls', notes: '100m each' },
    ],
    vendorIds: [vendor1, vendor2],
  });

  const quoteAwarded = await createQuotation({
    rfq_id: rfqAwardedId,
    vendor_id: vendor2,
    total_amount: 325000,
    delivery_days: 7,
    notes: 'Winner — approved by manager.',
    status: 'accepted',
    items: [
      { product_name: 'Corrugated Boxes', quantity: 10000, unit_price: 28 },
      { product_name: 'Bubble Wrap Rolls', quantity: 500, unit_price: 90 },
    ],
  });

  await supabase.from('approvals').insert({
    rfq_id: rfqAwardedId,
    quotation_id: quoteAwarded,
    approver_id: managerId,
    status: 'approved',
    level: 1,
    comments: 'Approved — best value and delivery timeline.',
    decided_by: managerId,
    decided_at: daysAgo(2),
  });

  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      po_number: `PO-${year}-SEED-001`,
      rfq_id: rfqAwardedId,
      quotation_id: quoteAwarded,
      vendor_id: vendor2,
      buyer_id: procurementId,
      total_amount: 325000,
      status: 'issued',
      issued_at: daysAgo(1),
    })
    .select('id')
    .single();

  if (poError) fail(`PO: ${poError.message}`);

  await supabase.from('invoices').insert({
    invoice_number: `INV-${year}-SEED-001`,
    po_id: po.id,
    vendor_id: vendor2,
    subtotal: 325000,
    tax_amount: 58500,
    total_amount: 383500,
    status: 'pending_review',
    due_date: daysFromNow(15),
  });

  // 6) Completed cycle — paid invoice
  const rfqCompletedId = await createRfq({
    rfq_number: `RFQ-${year}-SEED-006`,
    title: 'Safety Equipment Refresh',
    description: 'Fully completed procurement cycle for reports.',
    deadline: daysAgo(30),
    status: 'closed',
    created_by: procurementId,
    items: [
      { product_name: 'Safety Helmets', quantity: 100, unit: 'pcs', notes: 'ISI marked' },
      { product_name: 'Reflective Vests', quantity: 100, unit: 'pcs', notes: 'High visibility' },
    ],
    vendorIds: [vendor1],
  });

  const quoteCompleted = await createQuotation({
    rfq_id: rfqCompletedId,
    vendor_id: vendor1,
    total_amount: 145000,
    delivery_days: 5,
    notes: 'Delivered and accepted.',
    status: 'accepted',
    items: [
      { product_name: 'Safety Helmets', quantity: 100, unit_price: 850 },
      { product_name: 'Reflective Vests', quantity: 100, unit_price: 600 },
    ],
  });

  const { data: po2, error: po2Error } = await supabase
    .from('purchase_orders')
    .insert({
      po_number: `PO-${year}-SEED-002`,
      rfq_id: rfqCompletedId,
      quotation_id: quoteCompleted,
      vendor_id: vendor1,
      buyer_id: procurementId,
      total_amount: 145000,
      status: 'completed',
      issued_at: daysAgo(20),
    })
    .select('id')
    .single();

  if (po2Error) fail(`PO 2: ${po2Error.message}`);

  await supabase.from('invoices').insert({
    invoice_number: `INV-${year}-SEED-002`,
    po_id: po2.id,
    vendor_id: vendor1,
    subtotal: 145000,
    tax_amount: 26100,
    total_amount: 171100,
    status: 'paid',
    due_date: daysAgo(5),
  });

  // 7) Cancelled RFQ — filter testing
  await createRfq({
    rfq_number: `RFQ-${year}-SEED-007`,
    title: 'Cancelled HVAC Upgrade',
    description: 'Project cancelled by management.',
    deadline: daysFromNow(30),
    status: 'cancelled',
    created_by: procurementId,
    items: [
      { product_name: 'Split AC 2 Ton', quantity: 10, unit: 'pcs', notes: '5-star rated' },
    ],
    vendorIds: [vendor2],
  });

  // Extra quotation on open RFQ from vendor1 only
  await createQuotation({
    rfq_id: rfqOpenId,
    vendor_id: vendor1,
    total_amount: 1875000,
    delivery_days: 10,
    notes: 'Partial quote — vendor1 package deal.',
    status: 'submitted',
    items: [
      { product_name: 'Business Laptop 14"', quantity: 25, unit_price: 62000 },
      { product_name: '24" LED Monitor', quantity: 25, unit_price: 13000 },
    ],
  });

  // Rejected quotation example
  const rfqRejectedId = await createRfq({
    rfq_number: `RFQ-${year}-SEED-008`,
    title: 'Rejected Vendor Bid Sample',
    description: 'Manager rejected Global Parts bid.',
    deadline: daysAgo(10),
    status: 'closed',
    created_by: procurementId,
    items: [
      { product_name: 'Industrial Lubricant', quantity: 200, unit: 'litres', notes: 'Grade A' },
    ],
    vendorIds: [vendor2],
  });

  const quoteRejected = await createQuotation({
    rfq_id: rfqRejectedId,
    vendor_id: vendor2,
    total_amount: 98000,
    delivery_days: 20,
    notes: 'Bid rejected — price too high.',
    status: 'rejected',
    items: [
      { product_name: 'Industrial Lubricant', quantity: 200, unit_price: 490 },
    ],
  });

  await supabase.from('approvals').insert({
    rfq_id: rfqRejectedId,
    quotation_id: quoteRejected,
    approver_id: managerId,
    status: 'rejected',
    level: 1,
    comments: 'Price exceeds budget ceiling.',
    decided_by: managerId,
    decided_at: daysAgo(8),
  });

  log(`Workflow seeded (RFQ ${rfqCompareId} has quotes ${quoteAcmeCompare}, ${quoteGlobalCompare}).`);
}

async function seedNotifications(userIds) {
  log('Creating sample notifications...');

  const samples = [
    {
      user_id: userIds['vendor@test.com'],
      title: 'New RFQ Assigned',
      message: 'You have been invited to quote on RFQ Steel Sheets & Fasteners.',
      type: 'rfq',
      read_at: null,
    },
    {
      user_id: userIds['vendor2@test.com'],
      title: 'Purchase Order Issued',
      message: 'Purchase order PO-SEED-001 has been issued to your company.',
      type: 'po',
      read_at: null,
    },
    {
      user_id: userIds['manager@test.com'],
      title: 'Approval Required',
      message: 'Warehouse Pallet Racking quotation awaits your decision.',
      type: 'approval',
      read_at: null,
    },
    {
      user_id: userIds['procurement@test.com'],
      title: 'Quotation Received',
      message: 'Acme Industrial Supplies submitted a bid on IT Laptops & Monitors.',
      type: 'quotation',
      read_at: daysAgo(1),
    },
  ];

  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('title', samples[0].title)
    .limit(1);

  if (existing?.length) {
    log('Notifications already exist — skipping.');
    return;
  }

  const { error } = await supabase.from('notifications').insert(samples);
  if (error) warn(`Notifications: ${error.message}`);
}

async function seedActivityLogs(userIds) {
  log('Creating sample activity logs...');

  const { data: existing } = await supabase
    .from('activity_logs')
    .select('id')
    .eq('action', 'Seeded test procurement workflow')
    .limit(1);

  if (existing?.length) {
    log('Activity logs already exist — skipping.');
    return;
  }

  const entries = [
    {
      user_id: userIds['procurement@test.com'],
      action: 'Seeded test procurement workflow',
      module: 'Procurement',
      metadata: { marker: TEST_MARKER },
      ip_address: '127.0.0.1',
    },
    {
      user_id: userIds['procurement@test.com'],
      action: 'Published RFQ IT Laptops & Monitors',
      module: 'RFQs',
      metadata: { rfq: `RFQ-${new Date().getFullYear()}-SEED-002` },
      ip_address: '127.0.0.1',
    },
    {
      user_id: userIds['manager@test.com'],
      action: 'Approved quotation for Packaging Material',
      module: 'Approvals',
      metadata: { status: 'approved' },
      ip_address: '127.0.0.1',
    },
    {
      user_id: userIds['admin@test.com'],
      action: 'Viewed system settings',
      module: 'System',
      metadata: { section: 'company' },
      ip_address: '127.0.0.1',
    },
  ];

  const { error } = await supabase.from('activity_logs').insert(entries);
  if (error) warn(`Activity logs: ${error.message}`);
}

async function seedSettings() {
  log('Creating default system settings...');

  const settings = [
    { category: 'General', key: 'company_name', value: 'VendorBridge Test Corp' },
    { category: 'General', key: 'company_gstin', value: '27AAACV1234A1Z5' },
    { category: 'General', key: 'company_address', value: '100 Test Park, Mumbai, Maharashtra' },
    { category: 'General', key: 'company_email', value: 'procurement@vendorbridge.test' },
    { category: 'General', key: 'company_phone', value: '+91-22-12345678' },
    { category: 'Finance', key: 'invoice_tax_percentage', value: '18' },
    { category: 'Finance', key: 'invoice_due_days', value: '30' },
    { category: 'Finance', key: 'invoice_prefix', value: 'INV-' },
    { category: 'Workflow', key: 'workflow_po_auto_approve_threshold', value: '5000' },
    { category: 'Workflow', key: 'workflow_require_multilevel_approvals', value: false },
    { category: 'Email', key: 'template_rfq_subject', value: 'New Request for Quotation: {rfq_number}' },
    { category: 'Email', key: 'template_po_subject', value: 'Purchase Order Issued: {po_number}' },
  ];

  for (const row of settings) {
    const { error } = await supabase
      .from('settings')
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'category,key' });

    if (error) {
      warn(`Setting ${row.key}: ${error.message}`);
    }
  }
}

function printSummary() {
  const year = new Date().getFullYear();
  console.log('\n========================================');
  console.log(' VendorBridge test data ready');
  console.log('========================================\n');
  console.log('Login credentials (all use the same password):');
  console.log(`  Password: ${TEST_PASSWORD}\n`);
  TEST_ACCOUNTS.forEach(({ email, role, name }) => {
    console.log(`  ${role.padEnd(22)} ${email.padEnd(28)} (${name})`);
  });
  console.log('\nVendor portal accounts (linked to vendor records):');
  console.log('  vendor@test.com   → Acme Industrial Supplies');
  console.log('  vendor2@test.com  → Global Parts Traders');
  console.log('\nSample data created:');
  console.log('  • 3 vendor records (2 active, 1 pending)');
  console.log(`  • 8 RFQs (draft, published, closed, awarded, cancelled)`);
  console.log('  • Multiple quotations for bid comparison');
  console.log('  • Pending + approved + rejected approvals');
  console.log(`  • PO-${year}-SEED-001 / PO-${year}-SEED-002`);
  console.log(`  • INV-${year}-SEED-001 (pending) / INV-${year}-SEED-002 (paid)`);
  console.log('  • Notifications, activity logs, settings');
  console.log('\nRe-run with --reset to wipe and recreate test data.\n');
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    fail('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in server/.env');
  }

  const shouldReset = process.argv.includes('--reset');

  log('Connecting to Supabase...');
  const { error: pingError } = await supabase.from('users').select('id').limit(1);
  if (pingError) fail(`Database connection failed: ${pingError.message}`);

  await ensureVendorUserIdColumn();

  if (shouldReset) {
    await deleteTestData();
  }

  const passwordHash = await hashPassword(TEST_PASSWORD);
  const userIds = await seedUsers(passwordHash);
  const vendorIds = await seedVendors(userIds);

  await seedWorkflow({ userIds, vendorIds });
  await seedNotifications(userIds);
  await seedActivityLogs(userIds);
  await seedSettings();

  printSummary();
}

main().catch((err) => {
  console.error('[seed] Unhandled error:', err);
  process.exit(1);
});
