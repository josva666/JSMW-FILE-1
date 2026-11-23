import { useState } from 'react';
import { Menu, ShoppingBag, ShieldCheck, X } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
}

const NAV_ITEMS = [
  { label: 'Home', href: '#home' },
  { label: 'Products', href: '#products' },
  { label: 'About Us', href: '#about' },
  { label: 'Founder Profile', href: '#founder' },
  { label: 'Licenses & Certifications', href: '#certifications' },
  { label: 'Customer Reviews', href: '#reviews' },
  { label: 'Contact Us', href: '#contact' },
];

export function Header({ cartCount, onOpenCart, onOpenAdmin }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#3B2313]/12 bg-[#FAF6EE]/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8 h-16">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#home"
          className="font-display text-2xl font-bold tracking-tight text-[#23150B] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#C87D16]"
        >
          JSMW
        </a>

        {/* Zone 2: Responsive Single-Line Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden xl:flex items-center gap-6 text-[13px] font-medium text-[#4A2E19]"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="relative py-1 whitespace-nowrap shrink-0 transition-colors hover:text-[#B4690E] after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#C87D16] after:transition-all hover:after:w-full"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Shopping Cart & Admin Trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenAdmin}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[#3B2313]/15 px-3 py-2 text-xs font-medium text-[#3B2313] hover:bg-[#EFE6D4] transition-colors whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#A8640B]" />
            Admin
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 rounded-lg bg-[#23150B] px-4 py-2 text-xs font-semibold text-[#FAF6EE] hover:bg-[#3A2414] transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="h-4 w-4 text-[#F2B705]" />
            <span>Cart</span>
            <span className="font-mono-tabular text-[#F2B705]">({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex xl:hidden items-center justify-center rounded-lg border border-[#3B2313]/15 p-2 text-[#23150B] hover:bg-[#EFE6D4]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Tablet / Mobile Drawer */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-[#3B2313]/10 bg-[#FAF6EE] px-6 py-4">
          <nav aria-label="Mobile Navigation" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#23150B] hover:bg-[#EFE6D4] transition-colors"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenAdmin();
              }}
              className="sm:hidden flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#A8640B] hover:bg-[#EFE6D4]"
            >
              <ShieldCheck className="h-4 w-4" />
              Administration Dashboard
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
