import { useMemo, useState } from 'react';
import { Eye, Minus, PackageSearch, PlayCircle, Plus, Search, ShoppingBag, X } from 'lucide-react';
import type { CurrencyCode, CurrencyConfig, Product } from '../types/store';
import { formatMoney } from '../utils/currency';
import { JSMW_STICKER_URL } from '../three/honeyEngine';
import { ProductJarVisual } from './ProductJarVisual';

interface ProductsSectionProps {
  products: Product[];
  currencies: CurrencyConfig[];
  currencyCode: CurrencyCode;
  onChangeCurrency: (code: CurrencyCode) => void;
  onAddToCart: (product: Product, variantId: string, quantity: number, openCart?: boolean) => void;
  onOpenTracker: () => void;
}

export function ProductsSection({
  products,
  currencies,
  currencyCode,
  onChangeCurrency,
  onAddToCart,
  onOpenTracker,
}: ProductsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [qtySelections, setQtySelections] = useState<Record<string, number>>({});
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const catMatch = selectedCategory === 'All' || p.category === selectedCategory;
      const textMatch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [products, searchQuery, selectedCategory]);

  const getPrimaryVariant = (product: Product) => product.variants[0];

  const getQty = (productId: string) => qtySelections[productId] || 1;

  const handleAdd = (product: Product, buyNow: boolean) => {
    const variant = getPrimaryVariant(product);
    if (!variant) return;
    onAddToCart(product, variant.id, getQty(product.id), buyNow);
    if (!buyNow) {
      setJustAddedId(product.id);
      window.setTimeout(() => setJustAddedId(null), 1500);
    }
  };

  return (
    <section id="products" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      {/* Header & Utility Toolbar */}
      <div className="flex flex-col gap-6 border-b border-[#3B2313]/12 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wider text-[#A8640B]">
            Sirumalai Harvest Collection · India & International Shipping
          </p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-[#23150B]">
            Natural Wild Honey Collection
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#5E422C]">
            Available individually in 1 kg, 1/2 kg (500 g), 1/4 kg (250 g), and 100 g glass jars wearing the official JSMW Jose Sirumalai Wild Honey label. Pricing and stock are editable in the Administration Dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-[#3B2313]/15 bg-white px-3 py-2 text-xs font-medium text-[#3B2313]">
            <span>Currency</span>
            <select
              value={currencyCode}
              onChange={(e) => onChangeCurrency(e.target.value as CurrencyCode)}
              aria-label="Select display currency"
              className="bg-transparent font-mono-tabular font-semibold text-[#23150B] focus:outline-none"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onOpenTracker}
            className="inline-flex items-center gap-2 rounded-lg border border-[#3B2313]/20 bg-white px-3.5 py-2 text-xs font-semibold text-[#23150B] hover:bg-[#EFE6D4] transition-colors whitespace-nowrap"
          >
            <PackageSearch className="h-4 w-4 text-[#A8640B]" />
            Track Order
          </button>
        </div>
      </div>

      {/* Search & Category Filters */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-[#EFE6D4] p-1">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white text-[#23150B] shadow-sm'
                    : 'text-[#5E422C] hover:text-[#23150B]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A593E]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search honey jars (1 kg, 500 g, 250 g, 100 g)..."
            aria-label="Search products"
            className="w-full rounded-lg border border-[#3B2313]/15 bg-white py-2 pl-9 pr-3 text-sm text-[#23150B] placeholder:text-[#8E6D51] focus:border-[#C87D16] focus:outline-none"
          />
        </div>
      </div>

      {/* Four Individual Size Product Cards (1 kg, 1/2 kg, 1/4 kg, 100 g) */}
      {filteredProducts.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-[#3B2313]/12 bg-white p-12 text-center">
          <p className="font-display text-2xl text-[#23150B]">No matching honey jars found</p>
          <p className="mt-1 text-sm text-[#6B4D35]">
            Adjust your search filter or check back once new batches are added in the Administration Dashboard.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filteredProducts.map((product) => {
            const activeVariant = getPrimaryVariant(product);
            const qty = getQty(product.id);
            const outOfStock = !activeVariant || activeVariant.stock <= 0;

            return (
              <article
                key={product.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-[#3B2313]/12 bg-white transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                {/* Proportional Jar Visual */}
                <div className="relative aspect-square w-full overflow-hidden bg-[#F1E8D7]">
                  <ProductJarVisual
                    productId={product.id}
                    productName={product.name}
                    imageUrl={product.imageUrl}
                    weightLabel={activeVariant?.weight}
                  />

                  {activeVariant && (
                    <span className="absolute left-3 top-3 rounded-md bg-[#1C130C]/85 px-2.5 py-1 font-mono-tabular text-xs font-semibold text-[#F2B705]">
                      {activeVariant.weight}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setDetailProduct(product)}
                    className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-lg bg-[#1C130C]/85 px-3 py-1.5 text-xs font-medium text-[#FAF6EE] hover:bg-[#1C130C] transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5 text-[#F2B705]" />
                    Details
                  </button>
                </div>

                {/* Product Body (No Select Weight picker) */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2 text-xs text-[#7D5B3E]">
                    <span>{activeVariant?.weight || product.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeVariant ? `${activeVariant.stock} in stock` : 'Unavailable'}</span>
                  </div>

                  <h3 className="mt-1.5 font-display text-xl sm:text-2xl font-semibold text-[#23150B]">
                    {product.name}
                  </h3>

                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[#5E422C]">
                    {product.description}
                  </p>

                  {/* Price & Quantity Stepper */}
                  <div className="mt-5 flex items-center justify-between border-t border-[#3B2313]/10 pt-4">
                    <div>
                      <span className="block text-[11px] text-[#7D5B3E]">Price</span>
                      <span className="font-mono-tabular text-xl font-semibold text-[#23150B]">
                        {activeVariant
                          ? formatMoney(activeVariant.priceInr, currencyCode, currencies)
                          : '—'}
                      </span>
                    </div>

                    <div className="flex items-center rounded-lg border border-[#3B2313]/15 bg-[#FAF6EE]">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() =>
                          setQtySelections((prev) => ({
                            ...prev,
                            [product.id]: Math.max(1, (prev[product.id] || 1) - 1),
                          }))
                        }
                        className="p-2 text-[#3B2313] hover:text-[#C87D16]"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center font-mono-tabular text-sm font-medium text-[#23150B]">
                        {qty}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                          setQtySelections((prev) => ({
                            ...prev,
                            [product.id]: Math.min(
                              activeVariant?.stock || 20,
                              (prev[product.id] || 1) + 1,
                            ),
                          }))
                        }
                        className="p-2 text-[#3B2313] hover:text-[#C87D16]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={outOfStock}
                      onClick={() => handleAdd(product, false)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#23150B] bg-white px-2.5 py-2.5 text-xs font-semibold text-[#23150B] hover:bg-[#EFE6D4] disabled:opacity-45 transition-colors whitespace-nowrap"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      {justAddedId === product.id ? 'Added' : 'Add to Cart'}
                    </button>
                    <button
                      type="button"
                      disabled={outOfStock}
                      onClick={() => handleAdd(product, true)}
                      className="inline-flex items-center justify-center rounded-lg bg-[#C87D16] px-2.5 py-2.5 text-xs font-semibold text-white hover:bg-[#B06B0E] disabled:opacity-45 transition-colors whitespace-nowrap"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Product Details Modal */}
      {detailProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={detailProduct.name}
        >
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[#FAF6EE] p-6 sm:p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setDetailProduct(null)}
              aria-label="Close product details"
              className="absolute right-4 top-4 rounded-lg p-2 text-[#3B2313] hover:bg-[#EFE6D4]"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl bg-[#F1E8D7] aspect-square">
                  <ProductJarVisual
                    productId={detailProduct.id}
                    productName={detailProduct.name}
                    imageUrl={detailProduct.imageUrl}
                    weightLabel={detailProduct.variants[0]?.weight}
                  />
                </div>
                <div className="overflow-hidden rounded-xl border border-[#3B2313]/12 bg-white p-2">
                  <p className="mb-1 text-[11px] font-medium text-[#6B4D35]">
                    Official JSMW Jar Label
                  </p>
                  <img
                    src={JSMW_STICKER_URL}
                    alt="Jose Sirumalai Wild Honey official jar sticker"
                    referrerPolicy="no-referrer"
                    className="w-full rounded-md object-contain"
                  />
                </div>
                {detailProduct.videoUrl && (
                  <div className="rounded-xl border border-[#3B2313]/10 p-3 bg-white">
                    <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-[#5E422C]">
                      <PlayCircle className="h-4 w-4 text-[#C87D16]" />
                      Product Video
                    </p>
                    <video
                      src={detailProduct.videoUrl}
                      controls
                      className="w-full rounded-lg bg-black"
                    />
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-[#A8640B]">{detailProduct.category}</p>
                <h3 className="mt-1 font-display text-3xl font-semibold text-[#23150B]">
                  {detailProduct.name}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#4A2E19]">
                  {detailProduct.description}
                </p>
                <div className="mt-4 border-t border-[#3B2313]/10 pt-4">
                  <p className="text-xs font-semibold text-[#6B4D35]">Provenance & Notes</p>
                  <p className="mt-1 text-sm text-[#3B2313]">{detailProduct.originNote}</p>
                </div>
                {detailProduct.variants[0] && (
                  <div className="mt-4 border-t border-[#3B2313]/10 pt-4">
                    <div className="flex items-center justify-between text-sm font-mono-tabular text-[#23150B]">
                      <span>Net Pack Size: {detailProduct.variants[0].weight}</span>
                      <span className="font-semibold">
                        {formatMoney(
                          detailProduct.variants[0].priceInr,
                          currencyCode,
                          currencies,
                        )}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#6B4D35]">
                      {detailProduct.variants[0].stock} jars in stock
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
