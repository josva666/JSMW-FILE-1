import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Globe2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CartItem,
  ContactInfo,
  CurrencyCode,
  CurrencyConfig,
  GatewayStatus,
  OrderRecord,
  ShippingZone,
} from '../types/store';
import { formatMoney } from '../utils/currency';
import { ProductJarVisual } from './ProductJarVisual';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (productId: string, variantId: string, qty: number) => void;
  onRemoveItem: (productId: string, variantId: string) => void;
  onClearCart: () => void;
  zones: ShippingZone[];
  currencies: CurrencyConfig[];
  currencyCode: CurrencyCode;
  gatewayStatus: GatewayStatus;
  contact: ContactInfo;
  confirmedOrder: OrderRecord | null;
  onOrderConfirmed: (order: OrderRecord) => void;
  onOpenTracker: (orderNumber?: string) => void;
}

function parseWeightKg(weightLabel: string): number {
  const lower = weightLabel.trim().toLowerCase();
  const num = parseFloat(lower.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(num) || num <= 0) return 0.5;
  if (lower.includes('kg')) return num;
  if (lower.includes('g')) return num / 1000;
  return 0.5;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CartDrawer({
  open,
  onClose,
  items,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  zones,
  currencies,
  currencyCode,
  gatewayStatus,
  contact,
  confirmedOrder,
  onOrderConfirmed,
  onOpenTracker,
}: CartDrawerProps) {
  const activeZones = useMemo(() => zones.filter((z) => z.active), [zones]);
  const [selectedZoneId, setSelectedZoneId] = useState(activeZones[0]?.id || '');
  const [step, setStep] = useState<'cart' | 'checkout' | 'confirmed'>('cart');

  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'razorpay' | 'invoice_request'>(
    gatewayStatus.stripeConfigured
      ? 'stripe'
      : gatewayStatus.razorpayConfigured
        ? 'razorpay'
        : 'invoice_request',
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const activeZone =
    activeZones.find((z) => z.id === selectedZoneId) || activeZones[0] || null;

  const subtotalInr = items.reduce((sum, item) => sum + item.priceInr * item.quantity, 0);
  const totalWeightKg = items.reduce(
    (sum, item) => sum + parseWeightKg(item.weight) * item.quantity,
    0,
  );
  const qualifiesFree =
    activeZone && activeZone.freeAboveInr !== null && subtotalInr >= activeZone.freeAboveInr;
  const shippingInr = activeZone
    ? qualifiesFree
      ? 0
      : Math.round(activeZone.baseChargeInr + Math.ceil(totalWeightKg) * activeZone.perKgInr)
    : 0;
  const totalInr = subtotalInr + shippingInr;

  const effectiveStep = confirmedOrder ? 'confirmed' : step;

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeZone) {
      setErrorMsg('Please select a shipping destination zone.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const resp = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          email,
          phone,
          addressLine,
          city,
          state,
          postalCode,
          country,
          shippingZoneId: activeZone.id,
          currencyCode,
          paymentMethod,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErrorMsg(data.error || 'Could not place order.');
        setSubmitting(false);
        return;
      }

      if (paymentMethod === 'stripe' && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if (paymentMethod === 'razorpay' && data.razorpay) {
        const ok = await loadRazorpayScript();
        if (!ok) {
          setErrorMsg('Unable to load Razorpay checkout script.');
          setSubmitting(false);
          return;
        }
        const RazorpayCtor = (
          window as unknown as {
            Razorpay: new (opts: Record<string, unknown>) => { open: () => void };
          }
        ).Razorpay;
        const rzp = new RazorpayCtor({
          key: data.razorpay.keyId,
          amount: data.razorpay.amountPaise,
          currency: 'INR',
          name: 'JSMW – Jose Sirumalai Wild Honey',
          description: `Order ${data.order.orderNumber}`,
          order_id: data.razorpay.orderId,
          prefill: { name: customerName, email, contact: phone },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            const vResp = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderNumber: data.order.orderNumber,
                ...response,
              }),
            });
            const vData = await vResp.json();
            if (vResp.ok && vData.verified) {
              onClearCart();
              onOrderConfirmed(vData.order);
              setStep('confirmed');
            } else {
              setErrorMsg(vData.error || 'Payment verification failed.');
            }
          },
        });
        rzp.open();
        setSubmitting(false);
        return;
      }

      // Invoice request / awaiting gateway config
      onClearCart();
      onOrderConfirmed(data.order);
      setStep('confirmed');
    } catch {
      setErrorMsg('Network error during checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  const cleanWa = contact.whatsapp.replace(/[^0-9]/g, '');
  const waNumber = cleanWa.length === 10 ? `91${cleanWa}` : cleanWa;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart and Checkout"
    >
      <div className="flex h-full w-full max-w-lg flex-col bg-[#FAF6EE] text-[#23150B] shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#3B2313]/12 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#A8640B]" />
            <h2 className="font-display text-2xl font-semibold">
              {effectiveStep === 'cart'
                ? 'Shopping Cart'
                : effectiveStep === 'checkout'
                  ? 'Shipping & Checkout'
                  : 'Order Summary'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirmedOrder) onOrderConfirmed(null as unknown as OrderRecord);
              setStep('cart');
              onClose();
            }}
            aria-label="Close cart"
            className="rounded-lg p-2 text-[#3B2313] hover:bg-[#EFE6D4]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {effectiveStep === 'confirmed' && confirmedOrder ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-[#C87D16]/30 bg-white p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">
                      {confirmedOrder.paymentStatus === 'paid'
                        ? 'Payment Verified & Order Confirmed'
                        : 'Order Request Recorded — Payment Pending Confirmation'}
                    </p>
                    <h3 className="mt-1 font-display text-2xl font-semibold text-[#23150B]">
                      Order {confirmedOrder.orderNumber}
                    </h3>
                    <p className="mt-1 text-xs text-[#6B4D35]">
                      {confirmedOrder.trackingNotes}
                    </p>
                  </div>
                </div>

                <dl className="mt-5 space-y-2 border-t border-[#3B2313]/10 pt-4 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-[#7D5B3E]">Customer</dt>
                    <dd className="font-medium">{confirmedOrder.customerName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#7D5B3E]">Destination</dt>
                    <dd className="font-medium text-right">
                      {confirmedOrder.city}, {confirmedOrder.country}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#7D5B3E]">Shipping Zone</dt>
                    <dd className="font-medium text-right">{confirmedOrder.shippingZoneName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#7D5B3E]">Total Amount</dt>
                    <dd className="font-mono-tabular font-semibold text-[#23150B]">
                      {formatMoney(confirmedOrder.totalInr, currencyCode, currencies)}
                    </dd>
                  </div>
                </dl>
              </div>

              {confirmedOrder.paymentStatus !== 'paid' && (
                <div className="rounded-xl border border-amber-800/20 bg-amber-50 p-4 text-xs text-amber-950 space-y-2">
                  <p className="font-semibold">Complete Payment or Direct Confirmation</p>
                  <p>
                    Online gateway API keys are not yet active on this server, so no card charge was simulated. Share your Order Reference with JSMW via WhatsApp or await invoice confirmation.
                  </p>
                  <a
                    href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                      `Hello JSMW, I placed order request ${confirmedOrder.orderNumber} for ${confirmedOrder.items
                        .map((i) => `${i.productName} (${i.weight}) x${i.quantity}`)
                        .join(', ')}.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#23150B] px-3.5 py-2 text-xs font-semibold text-[#FAF6EE] hover:bg-[#3A2414]"
                  >
                    Confirm Order on WhatsApp
                  </a>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const num = confirmedOrder.orderNumber;
                    onClose();
                    onOpenTracker(num);
                  }}
                  className="flex-1 rounded-lg bg-[#C87D16] px-4 py-3 text-xs font-semibold text-white hover:bg-[#B06B0E]"
                >
                  Track This Order
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="h-12 w-12 text-[#C87D16]/60" />
              <p className="mt-4 font-display text-2xl font-semibold">Your cart is empty</p>
              <p className="mt-1 max-w-xs text-sm text-[#6B4D35]">
                Explore our Sirumalai wild honey collection to add jars to your domestic or international order.
              </p>
            </div>
          ) : effectiveStep === 'cart' ? (
            <div className="space-y-6">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    className="flex gap-4 rounded-xl border border-[#3B2313]/12 bg-white p-3.5"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#EFE6D4]">
                      <ProductJarVisual
                        productId={item.productId}
                        productName={item.productName}
                        imageUrl={item.imageUrl}
                        weightLabel={item.weight}
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-lg font-semibold leading-tight">
                            {item.productName}
                          </h3>
                          <p className="text-xs font-mono-tabular text-[#7D5B3E]">
                            Weight: {item.weight}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.productId, item.variantId)}
                          aria-label={`Remove ${item.productName}`}
                          className="text-[#8E6D51] hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-md border border-[#3B2313]/15 bg-[#FAF6EE]">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQty(item.productId, item.variantId, item.quantity - 1)
                            }
                            aria-label="Decrease quantity"
                            className="p-1.5"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-7 text-center font-mono-tabular text-xs font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQty(item.productId, item.variantId, item.quantity + 1)
                            }
                            aria-label="Increase quantity"
                            className="p-1.5"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="font-mono-tabular text-sm font-semibold">
                          {formatMoney(item.priceInr * item.quantity, currencyCode, currencies)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shipping Destination Selector */}
              <div className="rounded-xl border border-[#3B2313]/12 bg-white p-4 space-y-2.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#3B2313]">
                  <Globe2 className="h-4 w-4 text-[#A8640B]" />
                  Delivery Destination (Domestic & International)
                </label>
                <select
                  value={activeZone?.id || ''}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="w-full rounded-lg border border-[#3B2313]/15 bg-[#FAF6EE] px-3 py-2 text-xs font-medium text-[#23150B] focus:border-[#C87D16] focus:outline-none"
                >
                  {activeZones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
                {activeZone && (
                  <p className="text-[11px] text-[#6B4D35]">
                    {activeZone.countries} · {activeZone.estimatedTransit}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Checkout Form */
            <form id="jsmw-checkout-form" onSubmit={handleCheckout} className="space-y-4">
              <button
                type="button"
                onClick={() => setStep('cart')}
                className="text-xs font-medium text-[#A8640B] hover:underline"
              >
                ← Back to Cart Items
              </button>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium">Full Name *</label>
                  <input
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#3B2313]/15 bg-white px-3 py-2 text-sm focus:border-[#C87D16] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Mobile / WhatsApp *</label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#3B2313]/15 bg-white px-3 py-2 text-sm focus:border-[#C87D16] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#3B2313]/15 bg-white px-3 py-2 text-sm focus:border-[#C87D16] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium">Street Address *</label>
                <input
                  required
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="House/Flat No., Street, Landmark"
                  className="mt-1 w-full rounded-lg border border-[#3B2313]/15 bg-white px-3 py-2 text-sm focus:border-[#C87D16] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium">City *</label>
                  <input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#3B2313]/15 bg-white px-3 py-2 text-sm focus:border-[#C87D16] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">State / Province</label>
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#3B2313]/15 bg-white px-3 py-2 text-sm focus:border-[#C87D16] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium">Postal / PIN Code *</label>
                  <input
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#3B2313]/15 bg-white px-3 py-2 text-sm focus:border-[#C87D16] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Country *</label>
                  <input
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#3B2313]/15 bg-white px-3 py-2 text-sm focus:border-[#C87D16] focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Gateway Selection */}
              <div className="rounded-xl border border-[#3B2313]/12 bg-white p-4 space-y-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#23150B]">
                  <CreditCard className="h-4 w-4 text-[#A8640B]" />
                  Payment Method
                </p>

                {!gatewayStatus.stripeConfigured && !gatewayStatus.razorpayConfigured && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-950 border border-amber-800/15">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <div>
                      <p className="font-semibold">Payment Gateway Credentials Not Configured</p>
                      <p className="mt-0.5">
                        Configure <code className="font-mono">STRIPE_SECRET_KEY</code> or{' '}
                        <code className="font-mono">RAZORPAY_KEY_ID</code> /{' '}
                        <code className="font-mono">RAZORPAY_KEY_SECRET</code> in server environment secrets to enable live online payments. You can submit an honest Order Request / Direct Invoice reservation below.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  {gatewayStatus.stripeConfigured && (
                    <label className="flex items-center gap-2.5 rounded-lg border border-[#3B2313]/15 p-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="payMethod"
                        checked={paymentMethod === 'stripe'}
                        onChange={() => setPaymentMethod('stripe')}
                      />
                      <span className="font-medium">Pay Online via Stripe (Cards / International)</span>
                    </label>
                  )}

                  {gatewayStatus.razorpayConfigured && (
                    <label className="flex items-center gap-2.5 rounded-lg border border-[#3B2313]/15 p-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="payMethod"
                        checked={paymentMethod === 'razorpay'}
                        onChange={() => setPaymentMethod('razorpay')}
                      />
                      <span className="font-medium">Pay Online via Razorpay (UPI / Cards / Netbanking)</span>
                    </label>
                  )}

                  <label className="flex items-center gap-2.5 rounded-lg border border-[#3B2313]/15 p-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="payMethod"
                      checked={paymentMethod === 'invoice_request'}
                      onChange={() => setPaymentMethod('invoice_request')}
                    />
                    <span className="font-medium">
                      Order Request / Direct Invoice Confirmation (Pay via JSMW Support)
                    </span>
                  </label>
                </div>
              </div>

              {errorMsg && <p className="text-xs text-red-700">{errorMsg}</p>}
            </form>
          )}
        </div>

        {/* Drawer Footer */}
        {effectiveStep !== 'confirmed' && items.length > 0 && (
          <div className="border-t border-[#3B2313]/12 bg-white px-6 py-4 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-[#5E422C]">
                <span>Subtotal</span>
                <span className="font-mono-tabular">
                  {formatMoney(subtotalInr, currencyCode, currencies)}
                </span>
              </div>
              <div className="flex justify-between text-[#5E422C]">
                <span>
                  Shipping ({activeZone?.regionType === 'international' ? 'International' : 'Domestic'} ·{' '}
                  {totalWeightKg.toFixed(2)}kg)
                </span>
                <span className="font-mono-tabular">
                  {shippingInr === 0
                    ? 'Free'
                    : formatMoney(shippingInr, currencyCode, currencies)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#3B2313]/10 pt-2 text-sm font-semibold text-[#23150B]">
                <span>Estimated Total</span>
                <span className="font-mono-tabular">
                  {formatMoney(totalInr, currencyCode, currencies)}
                </span>
              </div>
            </div>

            {effectiveStep === 'cart' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full rounded-lg bg-[#C87D16] py-3 text-xs font-semibold text-white hover:bg-[#B06B0E] transition-colors"
              >
                Proceed to Checkout
              </button>
            ) : (
              <button
                type="submit"
                form="jsmw-checkout-form"
                disabled={submitting}
                className="w-full rounded-lg bg-[#23150B] py-3 text-xs font-semibold text-[#FAF6EE] hover:bg-[#3A2414] disabled:opacity-50 transition-colors"
              >
                {submitting
                  ? 'Processing Order...'
                  : paymentMethod === 'invoice_request'
                    ? 'Submit Order Request'
                    : 'Continue to Payment Gateway'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
