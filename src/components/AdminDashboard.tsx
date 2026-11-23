import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Lock,
  LogOut,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CoFounderProfile,
  CompanyInfo,
  ContactInfo,
  GatewayStatus,
  OwnerProfile,
  Product,
  ShippingConfig,
  StoreData,
} from '../types/store';

interface AdminDashboardProps {
  open: boolean;
  onClose: () => void;
  onStoreUpdated: () => void;
}

type AdminTab =
  | 'products'
  | 'company'
  | 'owner'
  | 'certificates'
  | 'reviews'
  | 'contact'
  | 'shipping'
  | 'orders';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function AdminDashboard({ open, onClose, onStoreUpdated }: AdminDashboardProps) {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem('jsmw_admin_token'),
  );
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminTab>('products');

  const [store, setStore] = useState<StoreData | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Editable draft states
  const [companyDraft, setCompanyDraft] = useState<CompanyInfo | null>(null);
  const [ownerDraft, setOwnerDraft] = useState<OwnerProfile | null>(null);
  const [coFounderDraft, setCoFounderDraft] = useState<CoFounderProfile | null>(null);
  const [contactDraft, setContactDraft] = useState<ContactInfo | null>(null);
  const [shippingDraft, setShippingDraft] = useState<ShippingConfig | null>(null);

  // New Product form
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState('Wild Forest Harvest');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdWeight, setNewProdWeight] = useState('500g');
  const [newProdPrice, setNewProdPrice] = useState(850);
  const [newProdStock, setNewProdStock] = useState(25);
  const [newProdImage, setNewProdImage] = useState('');

  // Certificate upload form
  const [certTitle, setCertTitle] = useState('');
  const [certAuth, setCertAuth] = useState('');
  const [certReg, setCertReg] = useState('');
  const [certIssue, setCertIssue] = useState('');
  const [certValid, setCertValid] = useState('');
  const [certFileUrl, setCertFileUrl] = useState('');
  const [certFileType, setCertFileType] = useState<'image' | 'pdf'>('image');
  const [certFileName, setCertFileName] = useState('');

  // New Review form
  const [revName, setRevName] = useState('');
  const [revLoc, setRevLoc] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  const fetchDashboard = async (authToken: string) => {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (resp.status === 401) {
        sessionStorage.removeItem('jsmw_admin_token');
        setToken(null);
        setLoading(false);
        return;
      }
      const data = await resp.json();
      setStore(data.store);
      setGatewayStatus(data.gatewayStatus);
      setCompanyDraft(data.store.company);
      setOwnerDraft(data.store.owner);
      setCoFounderDraft(data.store.coFounder);
      setContactDraft(data.store.contact);
      setShippingDraft(data.store.shipping);
    } catch {
      showToast('Failed to load administration data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && token) {
      void fetchDashboard(token);
    }
  }, [open, token]);

  if (!open) return null;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setLoginError(data.error || 'Authentication failed.');
        return;
      }
      sessionStorage.setItem('jsmw_admin_token', data.token);
      setToken(data.token);
      setPasscode('');
    } catch {
      setLoginError('Network error during sign-in.');
    }
  };

  const uploadMediaFile = async (file: File): Promise<{ url: string; fileType: 'image' | 'pdf' } | null> => {
    if (!token) return null;
    const dataUrl = await readFileAsDataUrl(file);
    const resp = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fileName: file.name, dataUrl }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      showToast(data.error || 'Upload failed.');
      return null;
    }
    return data;
  };

  const handleProductUpdate = async (product: Product) => {
    if (!token) return;
    const resp = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(product),
    });
    if (resp.ok) {
      showToast(`Saved ${product.name}`);
      onStoreUpdated();
      void fetchDashboard(token);
    }
  };

  const handleCreateProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const resp = await fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: newProdName,
        category: newProdCat,
        description: newProdDesc,
        originNote: 'Sirumalai Hills, Dindigul, Tamil Nadu, India',
        imageUrl: newProdImage,
        videoUrl: '',
        featured: false,
        active: true,
        variants: [
          {
            id: `v-${Date.now()}`,
            weight: newProdWeight,
            priceInr: Number(newProdPrice),
            stock: Number(newProdStock),
          },
        ],
      }),
    });
    if (resp.ok) {
      setNewProdName('');
      setNewProdDesc('');
      setNewProdImage('');
      showToast('New honey product added.');
      onStoreUpdated();
      void fetchDashboard(token);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!token) return;
    const resp = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.ok) {
      showToast('Product removed.');
      onStoreUpdated();
      void fetchDashboard(token);
    }
  };

  const saveCompany = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !companyDraft) return;
    const resp = await fetch('/api/admin/company', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(companyDraft),
    });
    if (resp.ok) {
      showToast('Company & About Us details updated.');
      onStoreUpdated();
    }
  };

  const saveOwner = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !ownerDraft) return;
    const resp = await fetch('/api/admin/owner', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(ownerDraft),
    });
    if (resp.ok) {
      showToast('Founder Profile updated.');
      onStoreUpdated();
    }
  };

  const saveCoFounder = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !coFounderDraft) return;
    const resp = await fetch('/api/admin/cofounder', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(coFounderDraft),
    });
    if (resp.ok) {
      showToast('Co-Founder / Manager Profile updated.');
      onStoreUpdated();
    }
  };

  const handleAddCertificate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const resp = await fetch('/api/admin/certificates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: certTitle,
        authority: certAuth,
        registrationNumber: certReg,
        issueDate: certIssue,
        validityDate: certValid,
        fileUrl: certFileUrl,
        fileType: certFileType,
        fileName: certFileName,
      }),
    });
    const data = await resp.json();
    if (resp.ok) {
      setCertTitle('');
      setCertAuth('');
      setCertReg('');
      setCertIssue('');
      setCertValid('');
      setCertFileUrl('');
      setCertFileName('');
      showToast('Certificate uploaded and published.');
      onStoreUpdated();
      void fetchDashboard(token);
    } else {
      showToast(data.error || 'Could not add certificate.');
    }
  };

  const handleDeleteCertificate = async (id: string) => {
    if (!token) return;
    await fetch(`/api/admin/certificates/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    showToast('Certificate deleted.');
    onStoreUpdated();
    void fetchDashboard(token);
  };

  const handleAddReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const resp = await fetch('/api/admin/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        customerName: revName,
        location: revLoc,
        rating: revRating,
        comment: revComment,
        status: 'published',
      }),
    });
    if (resp.ok) {
      setRevName('');
      setRevLoc('');
      setRevComment('');
      showToast('Customer review published.');
      onStoreUpdated();
      void fetchDashboard(token);
    }
  };

  const saveContact = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !contactDraft) return;
    const resp = await fetch('/api/admin/contact', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(contactDraft),
    });
    if (resp.ok) {
      showToast('Contact & Google Maps location saved.');
      onStoreUpdated();
    }
  };

  const saveShipping = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !shippingDraft) return;
    const resp = await fetch('/api/admin/shipping', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(shippingDraft),
    });
    if (resp.ok) {
      showToast('Shipping zones & currency rates saved.');
      onStoreUpdated();
    }
  };

  const missingItems: string[] = [];
  if (store) {
    if (!store.contact.email?.trim()) missingItems.push('Official Business Email (Contact Tab)');
    if (store.contact.fullAddress === 'Dindigul, Tamil Nadu, India') {
      missingItems.push('Complete Street Address (Contact Tab)');
    }
    if (!store.owner.photoUrl) missingItems.push('Founder Portrait Photo (Founder & Co-Founder Tab)');
    if (store.certificates.length === 0) {
      missingItems.push('Genuine Business Licenses / Lab Certificates (Certificates Tab)');
    }
  }
  if (gatewayStatus) {
    if (!gatewayStatus.stripeConfigured && !gatewayStatus.razorpayConfigured) {
      missingItems.push('Payment Gateway Env Keys (STRIPE_SECRET_KEY or RAZORPAY_KEY_ID/SECRET)');
    }
    if (!gatewayStatus.adminPasscodeCustomised) {
      missingItems.push('Custom ADMIN_PASSCODE Environment Secret');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="JSMW Administration Dashboard"
    >
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-[#FAF6EE] text-[#23150B] shadow-2xl">
        {/* Top Admin Header */}
        <div className="flex items-center justify-between border-b border-[#3B2313]/12 bg-[#160F09] px-6 py-4 text-[#FAF6EE]">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              JSMW Administration Dashboard
            </h2>
            <p className="text-xs text-[#EADBC2]/75">
              Manage catalog, pricing, media, owner details, certificates, reviews, shipping, and orders.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {token && (
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem('jsmw_admin_token');
                  setToken(null);
                  setStore(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D98A1C]/30 px-3 py-1.5 text-xs text-[#F5ECD8] hover:bg-[#2B1D12]"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close administration dashboard"
              className="rounded-lg p-2 text-[#F5ECD8] hover:bg-[#2B1D12]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toast Feedback */}
        {toast && (
          <div className="bg-emerald-900 px-6 py-2 text-xs font-medium text-white flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {toast}
          </div>
        )}

        {!token ? (
          /* Login Screen */
          <div className="flex flex-1 items-center justify-center p-6">
            <form
              onSubmit={handleLogin}
              className="w-full max-w-md rounded-2xl border border-[#3B2313]/12 bg-white p-8 space-y-5 shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <Lock className="h-5 w-5 text-[#A8640B]" />
                <h3 className="font-display text-2xl font-semibold">Administrator Sign-In</h3>
              </div>
              <p className="text-xs leading-relaxed text-[#5E422C]">
                Enter your <code className="font-mono">ADMIN_PASSCODE</code> to edit JSMW store content. If you have not yet configured a custom <code className="font-mono">ADMIN_PASSCODE</code> environment variable, the initial setup passcode is <code className="font-mono font-semibold text-[#23150B]">JSMW-ADMIN-2026</code>.
              </p>
              <div>
                <label className="block text-xs font-medium">Administrator Passcode</label>
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  className="mt-1 w-full rounded-lg border border-[#3B2313]/20 bg-[#FAF6EE] px-3.5 py-2.5 text-sm focus:border-[#C87D16] focus:outline-none"
                />
              </div>
              {loginError && <p className="text-xs text-red-700">{loginError}</p>}
              <button
                type="submit"
                className="w-full rounded-lg bg-[#23150B] py-3 text-xs font-semibold text-[#FAF6EE] hover:bg-[#3A2414]"
              >
                Access Administration Dashboard
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Workspace */
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Configuration & Information Checklist */}
            {missingItems.length > 0 && (
              <div className="border-b border-amber-800/15 bg-amber-50 px-6 py-3 text-xs text-amber-950">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <div>
                    <span className="font-semibold">Configuration & Content Still Required: </span>
                    <span>{missingItems.join(' · ')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Tabs */}
            <div className="flex overflow-x-auto border-b border-[#3B2313]/12 bg-white px-6 gap-1">
              {(
                [
                  ['products', 'Products'],
                  ['company', 'Company & About'],
                  ['owner', 'Founder & Co-Founder'],
                  ['certificates', 'Certificates & PDFs'],
                  ['reviews', 'Reviews'],
                  ['contact', 'Contact & Map'],
                  ['shipping', 'Shipping & Currencies'],
                  ['orders', 'Orders & Inquiries'],
                ] as [AdminTab, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`border-b-2 px-3.5 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                    tab === id
                      ? 'border-[#C87D16] text-[#23150B]'
                      : 'border-transparent text-[#6B4D35] hover:text-[#23150B]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading || !store ? (
                <p className="text-sm text-[#6B4D35]">Loading store management console...</p>
              ) : (
                <>
                  {/* TAB 1: PRODUCTS */}
                  {tab === 'products' && (
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <h3 className="font-display text-2xl font-semibold">
                          Existing Products & Pricing
                        </h3>
                        {store.products.map((prod, pIdx) => (
                          <div
                            key={prod.id}
                            className="rounded-xl border border-[#3B2313]/12 bg-white p-5 space-y-4"
                          >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                              <div>
                                <label className="block text-xs font-medium">Product Name</label>
                                <input
                                  value={prod.name}
                                  onChange={(e) => {
                                    const copy = [...store.products];
                                    copy[pIdx] = { ...prod, name: e.target.value };
                                    setStore({ ...store, products: copy });
                                  }}
                                  className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium">Category</label>
                                <input
                                  value={prod.category}
                                  onChange={(e) => {
                                    const copy = [...store.products];
                                    copy[pIdx] = { ...prod, category: e.target.value };
                                    setStore({ ...store, products: copy });
                                  }}
                                  className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium">
                                  Image Upload or Path
                                </label>
                                <div className="mt-1 flex gap-2">
                                  <input
                                    value={prod.imageUrl}
                                    onChange={(e) => {
                                      const copy = [...store.products];
                                      copy[pIdx] = { ...prod, imageUrl: e.target.value };
                                      setStore({ ...store, products: copy });
                                    }}
                                    className="w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-xs"
                                  />
                                  <label className="cursor-pointer rounded-lg border border-[#3B2313]/20 px-3 py-2 text-xs font-medium hover:bg-[#EFE6D4] whitespace-nowrap">
                                    Upload
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const res = await uploadMediaFile(file);
                                        if (res) {
                                          const copy = [...store.products];
                                          copy[pIdx] = { ...prod, imageUrl: res.url };
                                          setStore({ ...store, products: copy });
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div>
                                <label className="block text-xs font-medium">Description</label>
                                <textarea
                                  rows={2}
                                  value={prod.description}
                                  onChange={(e) => {
                                    const copy = [...store.products];
                                    copy[pIdx] = { ...prod, description: e.target.value };
                                    setStore({ ...store, products: copy });
                                  }}
                                  className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium">
                                  Product Video URL or Upload (Optional)
                                </label>
                                <div className="mt-1 flex gap-2">
                                  <input
                                    value={prod.videoUrl}
                                    onChange={(e) => {
                                      const copy = [...store.products];
                                      copy[pIdx] = { ...prod, videoUrl: e.target.value };
                                      setStore({ ...store, products: copy });
                                    }}
                                    placeholder="/uploads/... or MP4 URL"
                                    className="w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-xs"
                                  />
                                  <label className="cursor-pointer rounded-lg border border-[#3B2313]/20 px-3 py-2 text-xs font-medium hover:bg-[#EFE6D4] whitespace-nowrap">
                                    Video
                                    <input
                                      type="file"
                                      accept="video/mp4,video/webm"
                                      className="hidden"
                                      onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const res = await uploadMediaFile(file);
                                        if (res) {
                                          const copy = [...store.products];
                                          copy[pIdx] = { ...prod, videoUrl: res.url };
                                          setStore({ ...store, products: copy });
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>

                            {/* Variants */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold">
                                Weight Variants, INR Prices & Stock
                              </p>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                {prod.variants.map((v, vIdx) => (
                                  <div
                                    key={v.id}
                                    className="flex items-center gap-2 rounded-lg border border-[#3B2313]/12 bg-[#FAF6EE] p-2.5 text-xs"
                                  >
                                    <input
                                      value={v.weight}
                                      onChange={(e) => {
                                        const copy = [...store.products];
                                        copy[pIdx].variants[vIdx].weight = e.target.value;
                                        setStore({ ...store, products: copy });
                                      }}
                                      aria-label="Weight"
                                      className="w-16 rounded border border-[#3B2313]/15 bg-white px-2 py-1 font-mono-tabular"
                                    />
                                    <input
                                      type="number"
                                      value={v.priceInr}
                                      onChange={(e) => {
                                        const copy = [...store.products];
                                        copy[pIdx].variants[vIdx].priceInr = Number(e.target.value);
                                        setStore({ ...store, products: copy });
                                      }}
                                      aria-label="Price INR"
                                      className="w-20 rounded border border-[#3B2313]/15 bg-white px-2 py-1 font-mono-tabular"
                                    />
                                    <input
                                      type="number"
                                      value={v.stock}
                                      onChange={(e) => {
                                        const copy = [...store.products];
                                        copy[pIdx].variants[vIdx].stock = Number(e.target.value);
                                        setStore({ ...store, products: copy });
                                      }}
                                      aria-label="Stock"
                                      className="w-16 rounded border border-[#3B2313]/15 bg-white px-2 py-1 font-mono-tabular"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#3B2313]/10">
                              <label className="inline-flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={prod.active}
                                  onChange={(e) => {
                                    const copy = [...store.products];
                                    copy[pIdx] = { ...prod, active: e.target.checked };
                                    setStore({ ...store, products: copy });
                                  }}
                                />
                                Visible on Storefront
                              </label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(prod.id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleProductUpdate(prod)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#23150B] px-4 py-2 text-xs font-semibold text-[#FAF6EE] hover:bg-[#3A2414]"
                                >
                                  <Save className="h-3.5 w-3.5" />
                                  Save Product
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add New Product */}
                      <form
                        onSubmit={handleCreateProduct}
                        className="rounded-xl border border-[#3B2313]/12 bg-white p-5 space-y-4"
                      >
                        <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                          <Plus className="h-4 w-4 text-[#A8640B]" />
                          Add New Product
                        </h3>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <input
                            required
                            value={newProdName}
                            onChange={(e) => setNewProdName(e.target.value)}
                            placeholder="Product Name"
                            className="rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                          <input
                            value={newProdCat}
                            onChange={(e) => setNewProdCat(e.target.value)}
                            placeholder="Category"
                            className="rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                          <div className="flex gap-2">
                            <input
                              value={newProdImage}
                              onChange={(e) => setNewProdImage(e.target.value)}
                              placeholder="Image URL or upload"
                              className="w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-xs"
                            />
                            <label className="cursor-pointer rounded-lg border border-[#3B2313]/20 px-3 py-2 text-xs font-medium hover:bg-[#EFE6D4]">
                              Upload
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const res = await uploadMediaFile(file);
                                  if (res) setNewProdImage(res.url);
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        <textarea
                          rows={2}
                          value={newProdDesc}
                          onChange={(e) => setNewProdDesc(e.target.value)}
                          placeholder="Product description..."
                          className="w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                        />
                        <div className="grid grid-cols-3 gap-3 max-w-md">
                          <input
                            value={newProdWeight}
                            onChange={(e) => setNewProdWeight(e.target.value)}
                            placeholder="Weight (e.g. 500g)"
                            className="rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            value={newProdPrice}
                            onChange={(e) => setNewProdPrice(Number(e.target.value))}
                            placeholder="Price INR"
                            className="rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            value={newProdStock}
                            onChange={(e) => setNewProdStock(Number(e.target.value))}
                            placeholder="Stock"
                            className="rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                        </div>
                        <button
                          type="submit"
                          className="rounded-lg bg-[#C87D16] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#B06B0E]"
                        >
                          Add Product to Catalog
                        </button>
                      </form>
                    </div>
                  )}

                  {/* TAB 2: COMPANY & ABOUT US */}
                  {tab === 'company' && companyDraft && (
                    <form onSubmit={saveCompany} className="max-w-3xl space-y-4 rounded-xl bg-white p-6 border border-[#3B2313]/12">
                      <h3 className="font-display text-2xl font-semibold">About Us & Company Story</h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium">Company Name</label>
                          <input
                            value={companyDraft.companyName}
                            onChange={(e) =>
                              setCompanyDraft({ ...companyDraft, companyName: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium">Tagline</label>
                          <input
                            value={companyDraft.tagline}
                            onChange={(e) =>
                              setCompanyDraft({ ...companyDraft, tagline: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      {(
                        [
                          ['history', 'Company History'],
                          ['brandStory', 'Brand Story'],
                          ['sourcingInfo', 'Natural Honey Sourcing Information'],
                          ['mission', 'Mission'],
                          ['vision', 'Vision'],
                        ] as [keyof CompanyInfo, string][]
                      ).map(([field, label]) => (
                        <div key={field}>
                          <label className="block text-xs font-medium">{label}</label>
                          <textarea
                            rows={3}
                            value={String(companyDraft[field])}
                            onChange={(e) =>
                              setCompanyDraft({ ...companyDraft, [field]: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs font-medium">
                          Company Values (one per line)
                        </label>
                        <textarea
                          rows={4}
                          value={companyDraft.values.join('\n')}
                          onChange={(e) =>
                            setCompanyDraft({
                              ...companyDraft,
                              values: e.target.value.split('\n').filter(Boolean),
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#23150B] px-5 py-2.5 text-xs font-semibold text-[#FAF6EE]"
                      >
                        <Save className="h-4 w-4" />
                        Save Company Information
                      </button>
                    </form>
                  )}

                  {/* TAB 3: FOUNDER & CO-FOUNDER / MANAGER PROFILE */}
                  {tab === 'owner' && ownerDraft && (
                    <div className="space-y-8 max-w-3xl">
                      <form onSubmit={saveOwner} className="space-y-4 rounded-xl bg-white p-6 border border-[#3B2313]/12">
                        <h3 className="font-display text-2xl font-semibold">Founder Profile</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium">Founder Name</label>
                            <input
                              value={ownerDraft.name}
                              onChange={(e) => setOwnerDraft({ ...ownerDraft, name: e.target.value })}
                              className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium">Role / Title</label>
                            <input
                              value={ownerDraft.roleTitle}
                              onChange={(e) =>
                                setOwnerDraft({ ...ownerDraft, roleTitle: e.target.value })
                              }
                              className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium">Founder Photograph</label>
                          <div className="mt-1 flex items-center gap-3">
                            <input
                              value={ownerDraft.photoUrl}
                              onChange={(e) =>
                                setOwnerDraft({ ...ownerDraft, photoUrl: e.target.value })
                              }
                              placeholder="Upload photo or paste URL"
                              className="w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                            />
                            <label className="cursor-pointer rounded-lg border border-[#3B2313]/20 px-4 py-2 text-xs font-semibold hover:bg-[#EFE6D4] whitespace-nowrap">
                              Upload Photo
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const res = await uploadMediaFile(file);
                                  if (res) setOwnerDraft({ ...ownerDraft, photoUrl: res.url });
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        {(
                          [
                            ['education', 'Education & Qualifications'],
                            ['biography', 'Biography'],
                            ['professionalBackground', 'Professional Background'],
                            ['companyJourney', 'Company Journey'],
                            ['vision', 'Founder Vision'],
                          ] as [keyof OwnerProfile, string][]
                        ).map(([field, label]) => (
                          <div key={field}>
                            <label className="block text-xs font-medium">{label}</label>
                            <textarea
                              rows={field === 'education' ? 2 : 3}
                              value={ownerDraft[field] || ''}
                              onChange={(e) =>
                                setOwnerDraft({ ...ownerDraft, [field]: e.target.value })
                              }
                              className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                            />
                          </div>
                        ))}
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-lg bg-[#23150B] px-5 py-2.5 text-xs font-semibold text-[#FAF6EE]"
                        >
                          <Save className="h-4 w-4" />
                          Save Founder Profile
                        </button>
                      </form>

                      {coFounderDraft && (
                        <form onSubmit={saveCoFounder} className="space-y-4 rounded-xl bg-white p-6 border border-[#3B2313]/12">
                          <h3 className="font-display text-2xl font-semibold">
                            Co-Founder / Manager Profile
                          </h3>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-medium">Co-Founder / Manager Name</label>
                              <input
                                value={coFounderDraft.name}
                                onChange={(e) =>
                                  setCoFounderDraft({ ...coFounderDraft, name: e.target.value })
                                }
                                className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium">Role / Title</label>
                              <input
                                value={coFounderDraft.roleTitle}
                                onChange={(e) =>
                                  setCoFounderDraft({ ...coFounderDraft, roleTitle: e.target.value })
                                }
                                className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium">
                              Co-Founder / Manager Photograph
                            </label>
                            <div className="mt-1 flex items-center gap-3">
                              <input
                                value={coFounderDraft.photoUrl}
                                onChange={(e) =>
                                  setCoFounderDraft({ ...coFounderDraft, photoUrl: e.target.value })
                                }
                                placeholder="Upload photo or paste URL"
                                className="w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                              />
                              <label className="cursor-pointer rounded-lg border border-[#3B2313]/20 px-4 py-2 text-xs font-semibold hover:bg-[#EFE6D4] whitespace-nowrap">
                                Upload Photo
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const res = await uploadMediaFile(file);
                                    if (res) setCoFounderDraft({ ...coFounderDraft, photoUrl: res.url });
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium">Education & Qualifications</label>
                            <textarea
                              rows={2}
                              value={coFounderDraft.education}
                              onChange={(e) =>
                                setCoFounderDraft({ ...coFounderDraft, education: e.target.value })
                              }
                              className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium">Biography</label>
                            <textarea
                              rows={3}
                              value={coFounderDraft.biography}
                              onChange={(e) =>
                                setCoFounderDraft({ ...coFounderDraft, biography: e.target.value })
                              }
                              className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium">
                              Operations & Responsibilities
                            </label>
                            <textarea
                              rows={2}
                              value={coFounderDraft.responsibilities}
                              onChange={(e) =>
                                setCoFounderDraft({
                                  ...coFounderDraft,
                                  responsibilities: e.target.value,
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                            />
                          </div>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-lg bg-[#23150B] px-5 py-2.5 text-xs font-semibold text-[#FAF6EE]"
                          >
                            <Save className="h-4 w-4" />
                            Save Co-Founder / Manager
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {/* TAB 4: LICENSES & CERTIFICATIONS */}
                  {tab === 'certificates' && (
                    <div className="space-y-6">
                      <form
                        onSubmit={handleAddCertificate}
                        className="rounded-xl border border-[#3B2313]/12 bg-white p-6 space-y-4 max-w-3xl"
                      >
                        <h3 className="font-display text-2xl font-semibold">
                          Upload Genuine License or Certificate (Image or PDF)
                        </h3>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <input
                            required
                            value={certTitle}
                            onChange={(e) => setCertTitle(e.target.value)}
                            placeholder="Document Title (e.g. FSSAI Registration)"
                            className="rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                          <input
                            required
                            value={certAuth}
                            onChange={(e) => setCertAuth(e.target.value)}
                            placeholder="Issuing Authority"
                            className="rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                          <input
                            required
                            value={certReg}
                            onChange={(e) => setCertReg(e.target.value)}
                            placeholder="Registration / License Number"
                            className="rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm font-mono-tabular"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              value={certIssue}
                              onChange={(e) => setCertIssue(e.target.value)}
                              aria-label="Issue Date"
                              className="rounded-lg border border-[#3B2313]/15 px-2.5 py-2 text-xs"
                            />
                            <input
                              type="date"
                              value={certValid}
                              onChange={(e) => setCertValid(e.target.value)}
                              aria-label="Validity Date"
                              className="rounded-lg border border-[#3B2313]/15 px-2.5 py-2 text-xs"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#C87D16] bg-[#FFF5DF] px-4 py-2.5 text-xs font-semibold text-[#23150B]">
                            <FileUp className="h-4 w-4 text-[#A8640B]" />
                            {certFileName ? `Uploaded: ${certFileName}` : 'Choose Certificate Image or PDF *'}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const res = await uploadMediaFile(file);
                                if (res) {
                                  setCertFileUrl(res.url);
                                  setCertFileType(res.fileType);
                                  setCertFileName(file.name);
                                }
                              }}
                            />
                          </label>
                          <button
                            type="submit"
                            disabled={!certFileUrl}
                            className="rounded-lg bg-[#23150B] px-5 py-2.5 text-xs font-semibold text-[#FAF6EE] disabled:opacity-45"
                          >
                            Publish Certificate
                          </button>
                        </div>
                      </form>

                      <div className="space-y-3">
                        {store.certificates.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between rounded-xl border border-[#3B2313]/12 bg-white p-4 text-sm"
                          >
                            <div>
                              <p className="font-semibold">{c.title}</p>
                              <p className="text-xs text-[#6B4D35]">
                                {c.authority} · Reg: {c.registrationNumber}
                                {c.validityDate ? ` · Valid: ${c.validityDate}` : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteCertificate(c.id)}
                              className="text-red-700 hover:underline text-xs font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 5: CUSTOMER REVIEWS */}
                  {tab === 'reviews' && (
                    <div className="space-y-6">
                      <form
                        onSubmit={handleAddReview}
                        className="rounded-xl border border-[#3B2313]/12 bg-white p-6 space-y-3 max-w-2xl"
                      >
                        <h3 className="font-display text-2xl font-semibold">
                          Add Verified Customer Review
                        </h3>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <input
                            required
                            value={revName}
                            onChange={(e) => setRevName(e.target.value)}
                            placeholder="Customer Name"
                            className="rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                          <input
                            value={revLoc}
                            onChange={(e) => setRevLoc(e.target.value)}
                            placeholder="City / Country"
                            className="rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                          <select
                            value={revRating}
                            onChange={(e) => setRevRating(Number(e.target.value))}
                            className="rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          >
                            {[5, 4, 3, 2, 1].map((n) => (
                              <option key={n} value={n}>
                                {n} Stars
                              </option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          required
                          rows={3}
                          value={revComment}
                          onChange={(e) => setRevComment(e.target.value)}
                          placeholder="Genuine testimonial..."
                          className="w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-[#23150B] px-5 py-2.5 text-xs font-semibold text-[#FAF6EE]"
                        >
                          Publish Review
                        </button>
                      </form>

                      <div className="space-y-3">
                        {store.reviews.map((r) => (
                          <div
                            key={r.id}
                            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#3B2313]/12 bg-white p-4"
                          >
                            <div>
                              <p className="text-sm font-semibold">
                                {r.customerName} ({r.rating}/5) · {r.reviewDate}
                              </p>
                              <p className="text-xs text-[#5E422C] mt-1">{r.comment}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  await fetch(`/api/admin/reviews/${r.id}`, {
                                    method: 'PUT',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({
                                      status: r.status === 'published' ? 'pending' : 'published',
                                    }),
                                  });
                                  onStoreUpdated();
                                  void fetchDashboard(token);
                                }}
                                className="rounded border border-[#3B2313]/20 px-3 py-1 text-xs"
                              >
                                {r.status === 'published' ? 'Unpublish' : 'Publish'}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await fetch(`/api/admin/reviews/${r.id}`, {
                                    method: 'DELETE',
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                  onStoreUpdated();
                                  void fetchDashboard(token);
                                }}
                                className="rounded border border-red-200 px-3 py-1 text-xs text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 6: CONTACT & GOOGLE MAPS */}
                  {tab === 'contact' && contactDraft && (
                    <form onSubmit={saveContact} className="max-w-3xl space-y-4 rounded-xl bg-white p-6 border border-[#3B2313]/12">
                      <h3 className="font-display text-2xl font-semibold">
                        Contact Details & Editable Map Location
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium">Mobile Number</label>
                          <input
                            value={contactDraft.mobile}
                            onChange={(e) =>
                              setContactDraft({ ...contactDraft, mobile: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium">WhatsApp Number</label>
                          <input
                            value={contactDraft.whatsapp}
                            onChange={(e) =>
                              setContactDraft({ ...contactDraft, whatsapp: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium">Business Email</label>
                          <input
                            type="email"
                            value={contactDraft.email}
                            onChange={(e) =>
                              setContactDraft({ ...contactDraft, email: e.target.value })
                            }
                            placeholder="orders@yourdomain.com"
                            className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium">Location Summary</label>
                          <input
                            value={contactDraft.location}
                            onChange={(e) =>
                              setContactDraft({ ...contactDraft, location: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium">
                            Instagram Profile URL or @handle
                          </label>
                          <input
                            value={contactDraft.instagram || ''}
                            onChange={(e) =>
                              setContactDraft({ ...contactDraft, instagram: e.target.value })
                            }
                            placeholder="https://instagram.com/yourhandle"
                            className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium">
                            YouTube Channel URL or @handle
                          </label>
                          <input
                            value={contactDraft.youtube || ''}
                            onChange={(e) =>
                              setContactDraft({ ...contactDraft, youtube: e.target.value })
                            }
                            placeholder="https://youtube.com/@yourchannel"
                            className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium">Full Company Address</label>
                        <textarea
                          rows={2}
                          value={contactDraft.fullAddress}
                          onChange={(e) =>
                            setContactDraft({ ...contactDraft, fullAddress: e.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-medium">Map Latitude</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={contactDraft.mapLat}
                            onChange={(e) =>
                              setContactDraft({
                                ...contactDraft,
                                mapLat: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium">Map Longitude</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={contactDraft.mapLng}
                            onChange={(e) =>
                              setContactDraft({
                                ...contactDraft,
                                mapLng: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium">Map Zoom (1-18)</label>
                          <input
                            type="number"
                            min={1}
                            max={18}
                            value={contactDraft.mapZoom}
                            onChange={(e) =>
                              setContactDraft({
                                ...contactDraft,
                                mapZoom: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm font-mono-tabular"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium">Map Pin Label</label>
                        <input
                          value={contactDraft.mapLabel}
                          onChange={(e) =>
                            setContactDraft({ ...contactDraft, mapLabel: e.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-[#3B2313]/15 px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#23150B] px-5 py-2.5 text-xs font-semibold text-[#FAF6EE]"
                      >
                        <Save className="h-4 w-4" />
                        Save Contact & Map Settings
                      </button>
                    </form>
                  )}

                  {/* TAB 7: SHIPPING & CURRENCIES */}
                  {tab === 'shipping' && shippingDraft && (
                    <form onSubmit={saveShipping} className="space-y-6">
                      <div className="rounded-xl border border-[#3B2313]/12 bg-white p-5 space-y-4">
                        <h3 className="font-display text-2xl font-semibold">
                          Domestic & International Shipping Zones
                        </h3>
                        {shippingDraft.zones.map((z, idx) => (
                          <div
                            key={z.id}
                            className="grid grid-cols-1 gap-3 rounded-lg border border-[#3B2313]/10 bg-[#FAF6EE] p-4 sm:grid-cols-5"
                          >
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-medium">Zone Name</label>
                              <input
                                value={z.name}
                                onChange={(e) => {
                                  const zones = [...shippingDraft.zones];
                                  zones[idx] = { ...z, name: e.target.value };
                                  setShippingDraft({ ...shippingDraft, zones });
                                }}
                                className="mt-1 w-full rounded border border-[#3B2313]/15 bg-white px-2.5 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium">Base (INR)</label>
                              <input
                                type="number"
                                value={z.baseChargeInr}
                                onChange={(e) => {
                                  const zones = [...shippingDraft.zones];
                                  zones[idx] = { ...z, baseChargeInr: Number(e.target.value) };
                                  setShippingDraft({ ...shippingDraft, zones });
                                }}
                                className="mt-1 w-full rounded border border-[#3B2313]/15 bg-white px-2.5 py-1.5 text-xs font-mono-tabular"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium">Per Kg (INR)</label>
                              <input
                                type="number"
                                value={z.perKgInr}
                                onChange={(e) => {
                                  const zones = [...shippingDraft.zones];
                                  zones[idx] = { ...z, perKgInr: Number(e.target.value) };
                                  setShippingDraft({ ...shippingDraft, zones });
                                }}
                                className="mt-1 w-full rounded border border-[#3B2313]/15 bg-white px-2.5 py-1.5 text-xs font-mono-tabular"
                              />
                            </div>
                            <div className="flex items-end">
                              <label className="inline-flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={z.active}
                                  onChange={(e) => {
                                    const zones = [...shippingDraft.zones];
                                    zones[idx] = { ...z, active: e.target.checked };
                                    setShippingDraft({ ...shippingDraft, zones });
                                  }}
                                />
                                Active
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl border border-[#3B2313]/12 bg-white p-5 space-y-3">
                        <h3 className="font-display text-xl font-semibold">
                          Currency Conversion Rates (from 1 INR)
                        </h3>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                          {shippingDraft.currencies.map((c, idx) => (
                            <div key={c.code} className="rounded-lg bg-[#FAF6EE] p-3">
                              <label className="block text-xs font-semibold">
                                {c.code} ({c.symbol})
                              </label>
                              <input
                                type="number"
                                step="0.0001"
                                disabled={c.code === 'INR'}
                                value={c.rateFromInr}
                                onChange={(e) => {
                                  const currencies = [...shippingDraft.currencies];
                                  currencies[idx] = {
                                    ...c,
                                    rateFromInr: Number(e.target.value),
                                  };
                                  setShippingDraft({ ...shippingDraft, currencies });
                                }}
                                className="mt-1 w-full rounded border border-[#3B2313]/15 bg-white px-2 py-1 text-xs font-mono-tabular"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#23150B] px-5 py-2.5 text-xs font-semibold text-[#FAF6EE]"
                      >
                        <Save className="h-4 w-4" />
                        Save Shipping & Currencies
                      </button>
                    </form>
                  )}

                  {/* TAB 8: ORDERS & INQUIRIES */}
                  {tab === 'orders' && (
                    <div className="space-y-8">
                      <div>
                        <h3 className="font-display text-2xl font-semibold mb-3">
                          Customer Orders ({store.orders.length})
                        </h3>
                        {store.orders.length === 0 ? (
                          <p className="text-sm text-[#6B4D35]">No orders recorded yet.</p>
                        ) : (
                          <div className="space-y-4">
                            {store.orders.map((ord) => (
                              <div
                                key={ord.orderNumber}
                                className="rounded-xl border border-[#3B2313]/12 bg-white p-5 space-y-3 text-xs"
                              >
                                <div className="flex flex-wrap justify-between gap-2">
                                  <div>
                                    <span className="font-mono-tabular text-sm font-semibold">
                                      {ord.orderNumber}
                                    </span>
                                    <span className="ml-2 text-[#6B4D35]">
                                      {ord.customerName} · {ord.phone} · {ord.city}, {ord.country}
                                    </span>
                                  </div>
                                  <span className="font-mono-tabular font-semibold">
                                    ₹{ord.totalInr} ({ord.paymentStatus})
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                                  <select
                                    defaultValue={ord.orderStatus}
                                    id={`st-${ord.orderNumber}`}
                                    className="rounded border border-[#3B2313]/15 px-2.5 py-1.5"
                                  >
                                    <option value="received">received</option>
                                    <option value="preparing">preparing</option>
                                    <option value="dispatched">dispatched</option>
                                    <option value="delivered">delivered</option>
                                    <option value="cancelled">cancelled</option>
                                  </select>
                                  <input
                                    defaultValue={ord.trackingNumber}
                                    id={`trk-${ord.orderNumber}`}
                                    placeholder="Courier Tracking No."
                                    className="rounded border border-[#3B2313]/15 px-2.5 py-1.5 font-mono-tabular"
                                  />
                                  <input
                                    defaultValue={ord.trackingNotes}
                                    id={`note-${ord.orderNumber}`}
                                    placeholder="Tracking Notes"
                                    className="rounded border border-[#3B2313]/15 px-2.5 py-1.5"
                                  />
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const st = (
                                        document.getElementById(
                                          `st-${ord.orderNumber}`,
                                        ) as HTMLSelectElement
                                      ).value;
                                      const trk = (
                                        document.getElementById(
                                          `trk-${ord.orderNumber}`,
                                        ) as HTMLInputElement
                                      ).value;
                                      const note = (
                                        document.getElementById(
                                          `note-${ord.orderNumber}`,
                                        ) as HTMLInputElement
                                      ).value;
                                      await fetch(`/api/admin/orders/${ord.orderNumber}`, {
                                        method: 'PUT',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          Authorization: `Bearer ${token}`,
                                        },
                                        body: JSON.stringify({
                                          orderStatus: st,
                                          trackingNumber: trk,
                                          trackingNotes: note,
                                        }),
                                      });
                                      showToast(`Updated ${ord.orderNumber}`);
                                      void fetchDashboard(token);
                                    }}
                                    className="rounded-lg bg-[#23150B] px-3 py-1.5 font-semibold text-[#FAF6EE]"
                                  >
                                    Update Order
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="font-display text-2xl font-semibold mb-3">
                          Business Inquiries ({store.inquiries.length})
                        </h3>
                        {store.inquiries.length === 0 ? (
                          <p className="text-sm text-[#6B4D35]">No business inquiries submitted yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {store.inquiries.map((inq) => (
                              <div
                                key={inq.id}
                                className="rounded-xl border border-[#3B2313]/12 bg-white p-4 text-xs space-y-1"
                              >
                                <div className="flex justify-between">
                                  <span className="font-semibold text-sm">
                                    {inq.name} · {inq.inquiryType}
                                  </span>
                                  <span className="text-[#7D5B3E]">
                                    {inq.createdAt.slice(0, 10)}
                                  </span>
                                </div>
                                <p className="text-[#5E422C]">
                                  {inq.phone} {inq.email ? `· ${inq.email}` : ''}
                                </p>
                                <p className="pt-1 text-[#23150B]">{inq.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
