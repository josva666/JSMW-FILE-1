import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ProductsSection } from './components/ProductsSection';
import { AboutOwnerSection } from './components/AboutOwnerSection';
import { CertificationsReviewsSection } from './components/CertificationsReviewsSection';
import { ContactSection } from './components/ContactSection';
import { CartDrawer } from './components/CartDrawer';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { AdminDashboard } from './components/AdminDashboard';
import type {
  CartItem,
  CurrencyCode,
  CustomerReview,
  OrderRecord,
  Product,
  StorefrontPayload,
} from './types/store';

export default function App() {
  const [data, setData] = useState<StorefrontPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>('INR');
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('jsmw_cart');
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [cartOpen, setCartOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackerOrderNumber, setTrackerOrderNumber] = useState<string | undefined>(undefined);
  const [adminOpen, setAdminOpen] = useState(false);

  const fetchStorefront = useCallback(async () => {
    try {
      const resp = await fetch('/api/storefront');
      if (!resp.ok) throw new Error('Unable to load storefront.');
      const json = (await resp.json()) as StorefrontPayload;
      setData(json);
      setLoadError(null);
    } catch {
      setLoadError('Could not connect to JSMW storefront service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStorefront();
  }, [fetchStorefront]);

  useEffect(() => {
    try {
      localStorage.setItem('jsmw_cart', JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  // Verify Stripe Checkout return if query params exist
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderNum = params.get('order');
    const stripeSession = params.get('stripe_session');
    if (orderNum && stripeSession) {
      fetch('/api/payments/stripe/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNum, sessionId: stripeSession }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.verified && res.order) {
            setCart([]);
            setConfirmedOrder(res.order);
            setCartOpen(true);
          }
          window.history.replaceState({}, '', window.location.pathname);
        })
        .catch(() => {
          // ignore silent verification error
        });
    }
  }, []);

  const handleAddToCart = (
    product: Product,
    variantId: string,
    quantity: number,
    openCart = false,
  ) => {
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) return;
    setConfirmedOrder(null);
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && item.variantId === variantId,
      );
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id && item.variantId === variantId
            ? { ...item, quantity: Math.min(variant.stock, item.quantity + quantity) }
            : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          imageUrl: product.imageUrl,
          variantId,
          weight: variant.weight,
          priceInr: variant.priceInr,
          quantity: Math.min(variant.stock, quantity),
        },
      ];
    });
    if (openCart) {
      setCartOpen(true);
    }
  };

  const handleUpdateQty = (productId: string, variantId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) =>
        prev.filter((i) => !(i.productId === productId && i.variantId === variantId)),
      );
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId && i.variantId === variantId ? { ...i, quantity: qty } : i,
      ),
    );
  };

  const handleRemoveItem = (productId: string, variantId: string) => {
    setCart((prev) =>
      prev.filter((i) => !(i.productId === productId && i.variantId === variantId)),
    );
  };

  const handleReviewSubmitted = (review: CustomerReview) => {
    setData((prev) =>
      prev ? { ...prev, reviews: [review, ...prev.reviews] } : prev,
    );
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#160F09] text-[#FAF6EE] p-6">
        <p className="font-display text-4xl font-semibold text-[#F2B705]">JSMW</p>
        <p className="mt-2 text-sm text-[#EADBC2]/80">
          Preparing Jose Sirumalai Wild Honey...
        </p>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF6EE] p-6 text-center text-[#23150B]">
        <h1 className="font-display text-3xl font-semibold">JSMW – Jose Sirumalai Wild Honey</h1>
        <p className="mt-2 text-sm text-[#5E422C]">{loadError || 'Unable to load storefront.'}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void fetchStorefront();
          }}
          className="mt-4 rounded-lg bg-[#23150B] px-5 py-2.5 text-xs font-semibold text-[#FAF6EE]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#23150B]">
      <Header
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      <main>
        <HeroSection
          brandCode={data.company.brandCode}
          companyName={data.company.companyName}
          tagline={data.company.tagline}
          location={data.contact.location}
        />

        <ProductsSection
          products={data.products}
          currencies={data.shipping.currencies}
          currencyCode={currencyCode}
          onChangeCurrency={setCurrencyCode}
          onAddToCart={handleAddToCart}
          onOpenTracker={() => {
            setTrackerOrderNumber(undefined);
            setTrackerOpen(true);
          }}
        />

        <AboutOwnerSection
          company={data.company}
          owner={data.owner}
          coFounder={data.coFounder}
          onOpenAdmin={() => setAdminOpen(true)}
        />

        <CertificationsReviewsSection
          certificates={data.certificates}
          reviews={data.reviews}
          onOpenAdmin={() => setAdminOpen(true)}
          onReviewSubmitted={handleReviewSubmitted}
        />

        <ContactSection
          contact={data.contact}
          onOpenAdmin={() => setAdminOpen(true)}
        />
      </main>

      <footer className="border-t border-[#D98A1C]/15 bg-[#110B06] py-10 text-xs text-[#EADBC2]/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="font-display text-lg font-semibold text-[#FFF8EC]">
              {data.company.companyName}
            </p>
            <p className="mt-0.5">
              {data.contact.location} · Mobile & WhatsApp: {data.contact.mobile}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a href="#products" className="hover:text-[#F2B705]">
              Products
            </a>
            <button
              type="button"
              onClick={() => {
                setTrackerOrderNumber(undefined);
                setTrackerOpen(true);
              }}
              className="hover:text-[#F2B705]"
            >
              Order Tracking
            </button>
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="hover:text-[#F2B705]"
            >
              Administration
            </button>
          </div>
        </div>
      </footer>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCart([])}
        zones={data.shipping.zones}
        currencies={data.shipping.currencies}
        currencyCode={currencyCode}
        gatewayStatus={data.gatewayStatus}
        contact={data.contact}
        confirmedOrder={confirmedOrder}
        onOrderConfirmed={(ord) => setConfirmedOrder(ord)}
        onOpenTracker={(num) => {
          setTrackerOrderNumber(num);
          setTrackerOpen(true);
        }}
      />

      <OrderTrackerModal
        open={trackerOpen}
        initialOrderNumber={trackerOrderNumber}
        onClose={() => setTrackerOpen(false)}
        currencies={data.shipping.currencies}
        currencyCode={currencyCode}
      />

      <AdminDashboard
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onStoreUpdated={() => void fetchStorefront()}
      />
    </div>
  );
}
