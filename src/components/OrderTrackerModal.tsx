import { useEffect, useState, type FormEvent } from 'react';
import { PackageCheck, Search, X } from 'lucide-react';
import type { CurrencyCode, CurrencyConfig, OrderRecord } from '../types/store';
import { formatMoney } from '../utils/currency';

interface OrderTrackerModalProps {
  open: boolean;
  initialOrderNumber?: string;
  onClose: () => void;
  currencies: CurrencyConfig[];
  currencyCode: CurrencyCode;
}

const ORDER_STEPS = ['received', 'preparing', 'dispatched', 'delivered'] as const;

export function OrderTrackerModal({
  open,
  initialOrderNumber,
  onClose,
  currencies,
  currencyCode,
}: OrderTrackerModalProps) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber || '');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrderNumber) {
      setOrderNumber(initialOrderNumber);
      void fetchOrder(initialOrderNumber, '');
    }
  }, [initialOrderNumber]);

  const fetchOrder = async (num: string, contactVal: string) => {
    if (!num.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setOrder(null);
    try {
      const qs = new URLSearchParams({ orderNumber: num.trim() });
      if (contactVal.trim()) qs.set('contact', contactVal.trim());
      const resp = await fetch(`/api/orders/track?${qs.toString()}`);
      const data = await resp.json();
      if (!resp.ok) {
        setErrorMsg(data.error || 'Order not found.');
      } else {
        setOrder(data.order);
      }
    } catch {
      setErrorMsg('Unable to look up order status.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void fetchOrder(orderNumber, contact);
  };

  const activeIdx = order
    ? ORDER_STEPS.indexOf(order.orderStatus as (typeof ORDER_STEPS)[number])
    : -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Order Tracking"
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-[#FAF6EE] p-6 sm:p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close order tracker"
          className="absolute right-4 top-4 rounded-lg p-2 text-[#3B2313] hover:bg-[#EFE6D4]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <PackageCheck className="h-5 w-5 text-[#A8640B]" />
          <h2 className="font-display text-2xl font-semibold text-[#23150B]">
            Track Your JSMW Order
          </h2>
        </div>
        <p className="mt-1 text-xs text-[#6B4D35]">
          Enter your JSMW Order Number (e.g., JSMW-123456-789) to view live fulfilment and dispatch status.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-12">
          <input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Order Number"
            className="sm:col-span-5 rounded-lg border border-[#3B2313]/15 bg-white px-3 py-2.5 text-sm font-mono-tabular focus:border-[#C87D16] focus:outline-none"
          />
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Phone or Email (optional)"
            className="sm:col-span-4 rounded-lg border border-[#3B2313]/15 bg-white px-3 py-2.5 text-sm focus:border-[#C87D16] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="sm:col-span-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#23150B] px-4 py-2.5 text-xs font-semibold text-[#FAF6EE] hover:bg-[#3A2414]"
          >
            <Search className="h-3.5 w-3.5" />
            {loading ? 'Checking...' : 'Track'}
          </button>
        </form>

        {errorMsg && <p className="mt-4 text-xs text-red-700">{errorMsg}</p>}

        {order && (
          <div className="mt-6 space-y-5 rounded-xl border border-[#3B2313]/12 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3B2313]/10 pb-3">
              <div>
                <p className="font-mono-tabular text-sm font-semibold text-[#23150B]">
                  {order.orderNumber}
                </p>
                <p className="text-xs text-[#6B4D35]">
                  {order.customerName} · {order.city}, {order.country}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold capitalize text-[#A8640B]">
                  Status: {order.orderStatus}
                </p>
                <p className="text-[11px] text-[#6B4D35]">
                  Payment: {order.paymentStatus.replace(/_/g, ' ')}
                </p>
              </div>
            </div>

            {/* Step Progress */}
            {order.orderStatus !== 'cancelled' && (
              <div className="grid grid-cols-4 gap-2 text-center">
                {ORDER_STEPS.map((st, idx) => {
                  const done = idx <= activeIdx;
                  return (
                    <div key={st} className="space-y-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          done ? 'bg-[#C87D16]' : 'bg-[#EFE6D4]'
                        }`}
                      />
                      <span
                        className={`block text-[11px] capitalize ${
                          done ? 'font-semibold text-[#23150B]' : 'text-[#8E6D51]'
                        }`}
                      >
                        {st}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {order.trackingNumber && (
              <div className="rounded-lg bg-[#FAF6EE] px-3 py-2 text-xs">
                <span className="text-[#6B4D35]">Courier Tracking ID: </span>
                <span className="font-mono-tabular font-semibold text-[#23150B]">
                  {order.trackingNumber}
                </span>
              </div>
            )}

            <p className="text-xs text-[#5E422C]">{order.trackingNotes}</p>

            <div className="border-t border-[#3B2313]/10 pt-3 space-y-1 text-xs">
              {order.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-[#3B2313]">
                  <span>
                    {it.productName} ({it.weight}) × {it.quantity}
                  </span>
                  <span className="font-mono-tabular">
                    {formatMoney(it.unitPriceInr * it.quantity, currencyCode, currencies)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-[#23150B] pt-2 border-t border-[#3B2313]/10">
                <span>Order Total</span>
                <span className="font-mono-tabular">
                  {formatMoney(order.totalInr, currencyCode, currencies)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
