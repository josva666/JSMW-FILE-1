import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ensureStorage, readStore, writeStore, UPLOADS_DIR } from './server/store.ts';
import type {
  BusinessInquiry,
  CertificateDoc,
  CustomerReview,
  GatewayStatus,
  OrderItem,
  OrderRecord,
  Product,
} from './src/types/store.ts';

const PORT = 3000;
const TOKEN_SECRET =
  process.env.ADMIN_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

function getAdminPasscode(): string {
  return process.env.ADMIN_PASSCODE?.trim() || 'JSMW-ADMIN-2026';
}

function getGatewayStatus(): GatewayStatus {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  const razorpayId = process.env.RAZORPAY_KEY_ID?.trim();
  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return {
    stripeConfigured: Boolean(stripeKey),
    razorpayConfigured: Boolean(razorpayId && razorpaySecret),
    razorpayKeyId: razorpayId && razorpaySecret ? razorpayId : null,
    adminPasscodeCustomised: Boolean(process.env.ADMIN_PASSCODE?.trim()),
  };
}

function signAdminToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ role: 'admin', exp: Date.now() + 1000 * 60 * 60 * 12 }),
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string | undefined): boolean {
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  const expected = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return false;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return parsed.role === 'admin' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Unauthorized administrator session.' });
    return;
  }
  next();
}

function parseWeightKg(weightLabel: string): number {
  const lower = weightLabel.trim().toLowerCase();
  const num = parseFloat(lower.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(num) || num <= 0) return 0.5;
  if (lower.includes('kg')) return num;
  if (lower.includes('g')) return num / 1000;
  return 0.5;
}

async function startServer() {
  ensureStorage();
  const app = express();
  app.use(express.json({ limit: '16mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Public Storefront Payload
  app.get('/api/storefront', (_req, res) => {
    const store = readStore();
    res.json({
      products: store.products.filter((p) => p.active),
      company: store.company,
      owner: store.owner,
      coFounder: store.coFounder,
      certificates: store.certificates,
      reviews: store.reviews.filter((r) => r.status === 'published'),
      contact: store.contact,
      shipping: store.shipping,
      gatewayStatus: getGatewayStatus(),
    });
  });

  // Public Customer Review Submission
  app.post('/api/reviews', (req, res) => {
    const { customerName, location, rating, comment } = req.body ?? {};
    if (
      typeof customerName !== 'string' ||
      customerName.trim().length < 2 ||
      typeof comment !== 'string' ||
      comment.trim().length < 5
    ) {
      res.status(400).json({ error: 'Please provide your name and review comment.' });
      return;
    }
    const cleanRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
    const store = readStore();
    const review: CustomerReview = {
      id: `rev-${Date.now()}`,
      customerName: customerName.trim().slice(0, 80),
      location: typeof location === 'string' ? location.trim().slice(0, 80) : '',
      rating: cleanRating,
      comment: comment.trim().slice(0, 800),
      reviewDate: new Date().toISOString().slice(0, 10),
      status: 'published',
    };
    store.reviews.unshift(review);
    writeStore(store);
    res.status(201).json({ review });
  });

  // Public Business Inquiry Submission
  app.post('/api/inquiries', (req, res) => {
    const { name, email, phone, inquiryType, subject, message } = req.body ?? {};
    if (
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      typeof message !== 'string' ||
      message.trim().length < 5
    ) {
      res.status(400).json({ error: 'Name and inquiry message are required.' });
      return;
    }
    const store = readStore();
    const inquiry: BusinessInquiry = {
      id: `inq-${Date.now()}`,
      createdAt: new Date().toISOString(),
      name: name.trim().slice(0, 100),
      email: typeof email === 'string' ? email.trim().slice(0, 120) : '',
      phone: typeof phone === 'string' ? phone.trim().slice(0, 40) : '',
      inquiryType: typeof inquiryType === 'string' ? inquiryType.trim().slice(0, 60) : 'General',
      subject: typeof subject === 'string' ? subject.trim().slice(0, 140) : 'Storefront Inquiry',
      message: message.trim().slice(0, 1500),
      status: 'new',
    };
    store.inquiries.unshift(inquiry);
    writeStore(store);
    res.status(201).json({ inquiry });
  });

  // Public Order Creation & Real Payment Gateway Dispatch
  app.post('/api/orders', async (req, res) => {
    const {
      customerName,
      email,
      phone,
      addressLine,
      city,
      state,
      postalCode,
      country,
      shippingZoneId,
      currencyCode,
      paymentMethod,
      items,
    } = req.body ?? {};

    if (
      !customerName?.trim() ||
      !phone?.trim() ||
      !addressLine?.trim() ||
      !city?.trim() ||
      !postalCode?.trim() ||
      !country?.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      res.status(400).json({ error: 'Complete customer, shipping address, and cart items are required.' });
      return;
    }

    const store = readStore();
    const zone = store.shipping.zones.find((z) => z.id === shippingZoneId && z.active);
    if (!zone) {
      res.status(400).json({ error: 'Please select a valid active shipping destination zone.' });
      return;
    }

    const currency =
      store.shipping.currencies.find((c) => c.code === currencyCode) ||
      store.shipping.currencies[0];

    const verifiedItems: OrderItem[] = [];
    let subtotalInr = 0;
    let totalWeightKg = 0;

    for (const reqItem of items) {
      const product = store.products.find((p) => p.id === reqItem.productId && p.active);
      const variant = product?.variants.find((v) => v.id === reqItem.variantId);
      const qty = Math.max(1, Math.floor(Number(reqItem.quantity) || 0));
      if (!product || !variant || qty <= 0) {
        res.status(400).json({ error: 'One or more cart items are unavailable.' });
        return;
      }
      if (variant.stock < qty) {
        res.status(400).json({
          error: `Insufficient stock for ${product.name} (${variant.weight}). Available: ${variant.stock}.`,
        });
        return;
      }
      verifiedItems.push({
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        weight: variant.weight,
        quantity: qty,
        unitPriceInr: variant.priceInr,
      });
      subtotalInr += variant.priceInr * qty;
      totalWeightKg += parseWeightKg(variant.weight) * qty;
    }

    const qualifiesFreeShipping =
      zone.freeAboveInr !== null && subtotalInr >= zone.freeAboveInr;
    const shippingInr = qualifiesFreeShipping
      ? 0
      : Math.round(zone.baseChargeInr + Math.ceil(totalWeightKg) * zone.perKgInr);
    const totalInr = subtotalInr + shippingInr;

    const gatewayStatus = getGatewayStatus();
    const requestedMethod: 'stripe' | 'razorpay' | 'invoice_request' =
      paymentMethod === 'stripe' || paymentMethod === 'razorpay'
        ? paymentMethod
        : 'invoice_request';

    if (requestedMethod === 'stripe' && !gatewayStatus.stripeConfigured) {
      res.status(400).json({
        error: 'Stripe payment gateway is not configured yet (STRIPE_SECRET_KEY missing).',
      });
      return;
    }
    if (requestedMethod === 'razorpay' && !gatewayStatus.razorpayConfigured) {
      res.status(400).json({
        error: 'Razorpay payment gateway is not configured yet (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing).',
      });
      return;
    }

    const orderNumber = `JSMW-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const order: OrderRecord = {
      orderNumber,
      createdAt: new Date().toISOString(),
      customerName: customerName.trim(),
      email: typeof email === 'string' ? email.trim() : '',
      phone: phone.trim(),
      addressLine: addressLine.trim(),
      city: city.trim(),
      state: typeof state === 'string' ? state.trim() : '',
      postalCode: postalCode.trim(),
      country: country.trim(),
      shippingZoneId: zone.id,
      shippingZoneName: zone.name,
      items: verifiedItems,
      currencyCode: currency.code,
      subtotalInr,
      shippingInr,
      totalInr,
      paymentMethod: requestedMethod,
      paymentStatus:
        requestedMethod === 'invoice_request' ? 'awaiting_gateway_config' : 'pending_payment',
      orderStatus: 'received',
      trackingNumber: '',
      trackingNotes: 'Order logged in JSMW fulfilment queue.',
    };

    // Real Stripe Checkout Session
    if (requestedMethod === 'stripe') {
      const origin = `${req.protocol}://${req.get('host')}`;
      const stripeKey = process.env.STRIPE_SECRET_KEY!.trim();
      const params = new URLSearchParams();
      params.append('mode', 'payment');
      params.append('success_url', `${origin}/?order=${orderNumber}&stripe_session={CHECKOUT_SESSION_ID}`);
      params.append('cancel_url', `${origin}/?order=${orderNumber}&cancelled=1`);
      if (order.email) params.append('customer_email', order.email);

      const stripeCurrency = currency.code.toLowerCase();
      verifiedItems.forEach((item, idx) => {
        const unitConverted = Math.max(
          50,
          Math.round(item.unitPriceInr * currency.rateFromInr * 100),
        );
        params.append(`line_items[${idx}][price_data][currency]`, stripeCurrency);
        params.append(
          `line_items[${idx}][price_data][product_data][name]`,
          `${item.productName} (${item.weight})`,
        );
        params.append(`line_items[${idx}][price_data][unit_amount]`, String(unitConverted));
        params.append(`line_items[${idx}][quantity]`, String(item.quantity));
      });

      if (shippingInr > 0) {
        const shipIdx = verifiedItems.length;
        const shipConverted = Math.max(50, Math.round(shippingInr * currency.rateFromInr * 100));
        params.append(`line_items[${shipIdx}][price_data][currency]`, stripeCurrency);
        params.append(
          `line_items[${shipIdx}][price_data][product_data][name]`,
          `Shipping — ${zone.name}`,
        );
        params.append(`line_items[${shipIdx}][price_data][unit_amount]`, String(shipConverted));
        params.append(`line_items[${shipIdx}][quantity]`, '1');
      }

      const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      const stripeData = (await stripeResp.json()) as { id?: string; url?: string; error?: { message?: string } };
      if (!stripeResp.ok || !stripeData.url || !stripeData.id) {
        res.status(502).json({
          error: stripeData.error?.message || 'Unable to create Stripe Checkout session.',
        });
        return;
      }
      order.gatewaySessionId = stripeData.id;
      store.orders.unshift(order);
      writeStore(store);
      res.status(201).json({ order, checkoutUrl: stripeData.url });
      return;
    }

    // Real Razorpay Order Creation
    if (requestedMethod === 'razorpay') {
      const rzpId = process.env.RAZORPAY_KEY_ID!.trim();
      const rzpSecret = process.env.RAZORPAY_KEY_SECRET!.trim();
      const auth = Buffer.from(`${rzpId}:${rzpSecret}`).toString('base64');
      const amountPaise = Math.round(totalInr * 100);
      const rzpResp = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: orderNumber,
        }),
      });
      const rzpData = (await rzpResp.json()) as { id?: string; error?: { description?: string } };
      if (!rzpResp.ok || !rzpData.id) {
        res.status(502).json({
          error: rzpData.error?.description || 'Unable to create Razorpay order.',
        });
        return;
      }
      order.gatewayOrderId = rzpData.id;
      store.orders.unshift(order);
      writeStore(store);
      res.status(201).json({
        order,
        razorpay: {
          keyId: rzpId,
          orderId: rzpData.id,
          amountPaise,
        },
      });
      return;
    }

    // Direct Order Request / Invoice Reservation (when live payment keys are not configured)
    for (const item of verifiedItems) {
      const p = store.products.find((pr) => pr.id === item.productId);
      const v = p?.variants.find((vr) => vr.id === item.variantId);
      if (v) v.stock = Math.max(0, v.stock - item.quantity);
    }
    store.orders.unshift(order);
    writeStore(store);
    res.status(201).json({ order });
  });

  // Real Stripe Session Verification
  app.post('/api/payments/stripe/verify', async (req, res) => {
    const { orderNumber, sessionId } = req.body ?? {};
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!stripeKey || !orderNumber || !sessionId) {
      res.status(400).json({ error: 'Missing Stripe verification parameters.' });
      return;
    }
    const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const session = (await resp.json()) as { payment_status?: string };
    const store = readStore();
    const order = store.orders.find((o) => o.orderNumber === orderNumber);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (session.payment_status === 'paid') {
      order.paymentStatus = 'paid';
      order.trackingNotes = 'Payment verified via Stripe. Preparing dispatch.';
      writeStore(store);
      res.json({ verified: true, order });
      return;
    }
    res.status(400).json({ verified: false, error: 'Stripe payment has not been completed.' });
  });

  // Real Razorpay HMAC Signature Verification
  app.post('/api/payments/razorpay/verify', (req, res) => {
    const { orderNumber, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body ?? {};
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!rzpSecret || !orderNumber || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ error: 'Missing Razorpay verification parameters.' });
      return;
    }
    const expectedSig = crypto
      .createHmac('sha256', rzpSecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      res.status(400).json({ verified: false, error: 'Payment signature mismatch.' });
      return;
    }
    const store = readStore();
    const order = store.orders.find((o) => o.orderNumber === orderNumber);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    order.paymentStatus = 'paid';
    order.gatewaySessionId = razorpay_payment_id;
    order.trackingNotes = 'Payment verified via Razorpay. Preparing dispatch.';
    for (const item of order.items) {
      const p = store.products.find((pr) => pr.id === item.productId);
      const v = p?.variants.find((vr) => vr.id === item.variantId);
      if (v) v.stock = Math.max(0, v.stock - item.quantity);
    }
    writeStore(store);
    res.json({ verified: true, order });
  });

  // Public Order Tracking Lookup
  app.get('/api/orders/track', (req, res) => {
    const orderNumber = String(req.query.orderNumber || '').trim().toUpperCase();
    const contact = String(req.query.contact || '').trim().toLowerCase();
    if (!orderNumber) {
      res.status(400).json({ error: 'Order number is required.' });
      return;
    }
    const store = readStore();
    const order = store.orders.find((o) => o.orderNumber.toUpperCase() === orderNumber);
    if (!order) {
      res.status(404).json({ error: 'No order found matching that Order Number.' });
      return;
    }
    if (
      contact &&
      order.phone.toLowerCase() !== contact &&
      order.email.toLowerCase() !== contact
    ) {
      res.status(403).json({ error: 'Contact phone or email does not match this order.' });
      return;
    }
    res.json({
      order: {
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        customerName: order.customerName,
        city: order.city,
        country: order.country,
        shippingZoneName: order.shippingZoneName,
        items: order.items,
        currencyCode: order.currencyCode,
        subtotalInr: order.subtotalInr,
        shippingInr: order.shippingInr,
        totalInr: order.totalInr,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        trackingNumber: order.trackingNumber,
        trackingNotes: order.trackingNotes,
      },
    });
  });

  // Admin Authentication
  app.post('/api/admin/login', (req, res) => {
    const { passcode } = req.body ?? {};
    if (typeof passcode !== 'string' || passcode.trim() !== getAdminPasscode()) {
      res.status(401).json({ error: 'Invalid administrator passcode.' });
      return;
    }
    res.json({ token: signAdminToken(), gatewayStatus: getGatewayStatus() });
  });

  // Admin Full Dashboard Payload
  app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
    const store = readStore();
    res.json({ store, gatewayStatus: getGatewayStatus() });
  });

  // Admin File Upload (Images, PDFs, Videos)
  app.post('/api/admin/upload', requireAdmin, (req, res) => {
    const { fileName, dataUrl } = req.body ?? {};
    if (typeof fileName !== 'string' || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'Invalid upload payload.' });
      return;
    }
    const match = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
      res.status(400).json({ error: 'Invalid base64 data URL format.' });
      return;
    }
    const mime = match[1];
    const allowedMimes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'video/mp4',
      'video/webm',
    ]);
    if (!allowedMimes.has(mime)) {
      res.status(400).json({ error: `Unsupported file type: ${mime}` });
      return;
    }
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.byteLength > 12 * 1024 * 1024) {
      res.status(400).json({ error: 'Uploaded file exceeds 12MB limit.' });
      return;
    }
    const ext = path.extname(fileName).replace(/[^a-zA-Z0-9.]/g, '') || `.${mime.split('/')[1]}`;
    const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, safeName), buffer);
    res.status(201).json({ url: `/uploads/${safeName}`, fileType: mime === 'application/pdf' ? 'pdf' : 'image' });
  });

  // Admin Product CRUD
  app.post('/api/admin/products', requireAdmin, (req, res) => {
    const product = req.body as Product;
    if (!product?.name?.trim() || !Array.isArray(product.variants) || product.variants.length === 0) {
      res.status(400).json({ error: 'Product name and at least one weight variant are required.' });
      return;
    }
    const store = readStore();
    const newProduct: Product = {
      ...product,
      id: product.id?.trim() || `jsmw-${Date.now()}`,
      name: product.name.trim(),
      category: product.category?.trim() || 'Wild Honey',
      description: product.description?.trim() || '',
      originNote: product.originNote?.trim() || 'Dindigul, Tamil Nadu, India',
      imageUrl: product.imageUrl?.trim() || '',
      videoUrl: product.videoUrl?.trim() || '',
      featured: Boolean(product.featured),
      active: product.active !== false,
    };
    store.products.push(newProduct);
    writeStore(store);
    res.status(201).json({ product: newProduct });
  });

  app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const store = readStore();
    const idx = store.products.findIndex((p) => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    store.products[idx] = { ...store.products[idx], ...req.body, id };
    writeStore(store);
    res.json({ product: store.products[idx] });
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const store = readStore();
    store.products = store.products.filter((p) => p.id !== id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Admin Company / About Us
  app.put('/api/admin/company', requireAdmin, (req, res) => {
    const store = readStore();
    store.company = { ...store.company, ...req.body };
    writeStore(store);
    res.json({ company: store.company });
  });

  // Admin Founder Profile
  app.put('/api/admin/owner', requireAdmin, (req, res) => {
    const store = readStore();
    store.owner = { ...store.owner, ...req.body };
    writeStore(store);
    res.json({ owner: store.owner });
  });

  // Admin Co-Founder / Manager Profile
  app.put('/api/admin/cofounder', requireAdmin, (req, res) => {
    const store = readStore();
    store.coFounder = { ...store.coFounder, ...req.body };
    writeStore(store);
    res.json({ coFounder: store.coFounder });
  });

  // Admin Certificates
  app.post('/api/admin/certificates', requireAdmin, (req, res) => {
    const { title, authority, registrationNumber, issueDate, validityDate, fileUrl, fileType, fileName } =
      req.body ?? {};
    if (!title?.trim() || !authority?.trim() || !registrationNumber?.trim() || !fileUrl?.trim()) {
      res.status(400).json({
        error: 'Document title, issuing authority, registration number, and uploaded file are required.',
      });
      return;
    }
    const store = readStore();
    const cert: CertificateDoc = {
      id: `cert-${Date.now()}`,
      title: title.trim(),
      authority: authority.trim(),
      registrationNumber: registrationNumber.trim(),
      issueDate: issueDate?.trim() || '',
      validityDate: validityDate?.trim() || '',
      fileUrl: fileUrl.trim(),
      fileType: fileType === 'pdf' ? 'pdf' : 'image',
      fileName: fileName?.trim() || 'certificate',
      uploadedAt: new Date().toISOString().slice(0, 10),
    };
    store.certificates.unshift(cert);
    writeStore(store);
    res.status(201).json({ certificate: cert });
  });

  app.delete('/api/admin/certificates/:id', requireAdmin, (req, res) => {
    const store = readStore();
    store.certificates = store.certificates.filter((c) => c.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Admin Reviews Management
  app.post('/api/admin/reviews', requireAdmin, (req, res) => {
    const { customerName, location, rating, comment, reviewDate, status } = req.body ?? {};
    if (!customerName?.trim() || !comment?.trim()) {
      res.status(400).json({ error: 'Customer name and review text are required.' });
      return;
    }
    const store = readStore();
    const review: CustomerReview = {
      id: `rev-${Date.now()}`,
      customerName: customerName.trim(),
      location: location?.trim() || '',
      rating: Math.min(5, Math.max(1, Math.round(Number(rating) || 5))),
      comment: comment.trim(),
      reviewDate: reviewDate?.trim() || new Date().toISOString().slice(0, 10),
      status: status === 'pending' ? 'pending' : 'published',
    };
    store.reviews.unshift(review);
    writeStore(store);
    res.status(201).json({ review });
  });

  app.put('/api/admin/reviews/:id', requireAdmin, (req, res) => {
    const store = readStore();
    const idx = store.reviews.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Review not found.' });
      return;
    }
    store.reviews[idx] = { ...store.reviews[idx], ...req.body, id: req.params.id };
    writeStore(store);
    res.json({ review: store.reviews[idx] });
  });

  app.delete('/api/admin/reviews/:id', requireAdmin, (req, res) => {
    const store = readStore();
    store.reviews = store.reviews.filter((r) => r.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Admin Contact & Map Location
  app.put('/api/admin/contact', requireAdmin, (req, res) => {
    const store = readStore();
    store.contact = { ...store.contact, ...req.body };
    writeStore(store);
    res.json({ contact: store.contact });
  });

  // Admin Shipping & Currency Rates
  app.put('/api/admin/shipping', requireAdmin, (req, res) => {
    const store = readStore();
    store.shipping = { ...store.shipping, ...req.body };
    writeStore(store);
    res.json({ shipping: store.shipping });
  });

  // Admin Order Fulfilment & Tracking Updates
  app.put('/api/admin/orders/:orderNumber', requireAdmin, (req, res) => {
    const store = readStore();
    const order = store.orders.find((o) => o.orderNumber === req.params.orderNumber);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    const { orderStatus, paymentStatus, trackingNumber, trackingNotes } = req.body ?? {};
    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (typeof trackingNumber === 'string') order.trackingNumber = trackingNumber;
    if (typeof trackingNotes === 'string') order.trackingNotes = trackingNotes;
    writeStore(store);
    res.json({ order });
  });

  // Admin Inquiry Status
  app.put('/api/admin/inquiries/:id', requireAdmin, (req, res) => {
    const store = readStore();
    const inq = store.inquiries.find((i) => i.id === req.params.id);
    if (!inq) {
      res.status(404).json({ error: 'Inquiry not found.' });
      return;
    }
    inq.status = req.body?.status === 'reviewed' ? 'reviewed' : 'new';
    writeStore(store);
    res.json({ inquiry: inq });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JSMW server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start JSMW server:', err);
  process.exit(1);
});
