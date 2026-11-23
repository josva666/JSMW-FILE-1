export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export interface ProductVariant {
  id: string;
  weight: string;
  priceInr: number;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  originNote: string;
  imageUrl: string;
  videoUrl: string;
  featured: boolean;
  active: boolean;
  variants: ProductVariant[];
}

export interface CompanyInfo {
  brandCode: string;
  companyName: string;
  tagline: string;
  history: string;
  brandStory: string;
  sourcingInfo: string;
  mission: string;
  vision: string;
  values: string[];
}

export interface OwnerProfile {
  name: string;
  roleTitle: string;
  photoUrl: string;
  education: string;
  biography: string;
  professionalBackground: string;
  companyJourney: string;
  vision: string;
}

export interface CoFounderProfile {
  name: string;
  roleTitle: string;
  photoUrl: string;
  education: string;
  biography: string;
  responsibilities: string;
}

export interface CertificateDoc {
  id: string;
  title: string;
  authority: string;
  registrationNumber: string;
  issueDate: string;
  validityDate: string;
  fileUrl: string;
  fileType: 'image' | 'pdf';
  fileName: string;
  uploadedAt: string;
}

export interface CustomerReview {
  id: string;
  customerName: string;
  location: string;
  rating: number;
  comment: string;
  reviewDate: string;
  status: 'published' | 'pending';
}

export interface ContactInfo {
  company: string;
  location: string;
  mobile: string;
  whatsapp: string;
  email: string;
  instagram: string;
  youtube: string;
  fullAddress: string;
  mapLat: number;
  mapLng: number;
  mapLabel: string;
  mapZoom: number;
}

export interface ShippingZone {
  id: string;
  name: string;
  regionType: 'domestic' | 'international';
  countries: string;
  baseChargeInr: number;
  perKgInr: number;
  freeAboveInr: number | null;
  estimatedTransit: string;
  active: boolean;
}

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  rateFromInr: number;
  label: string;
}

export interface ShippingConfig {
  currencies: CurrencyConfig[];
  zones: ShippingZone[];
}

export interface OrderItem {
  productId: string;
  productName: string;
  variantId: string;
  weight: string;
  quantity: number;
  unitPriceInr: number;
}

export interface OrderRecord {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  shippingZoneId: string;
  shippingZoneName: string;
  items: OrderItem[];
  currencyCode: CurrencyCode;
  subtotalInr: number;
  shippingInr: number;
  totalInr: number;
  paymentMethod: 'stripe' | 'razorpay' | 'invoice_request';
  paymentStatus: 'pending_payment' | 'paid' | 'awaiting_gateway_config';
  orderStatus: 'received' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled';
  trackingNumber: string;
  trackingNotes: string;
  gatewayOrderId?: string;
  gatewaySessionId?: string;
}

export interface BusinessInquiry {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  inquiryType: string;
  subject: string;
  message: string;
  status: 'new' | 'reviewed';
}

export interface GatewayStatus {
  stripeConfigured: boolean;
  razorpayConfigured: boolean;
  razorpayKeyId: string | null;
  adminPasscodeCustomised: boolean;
}

export interface StoreData {
  products: Product[];
  company: CompanyInfo;
  owner: OwnerProfile;
  coFounder: CoFounderProfile;
  certificates: CertificateDoc[];
  reviews: CustomerReview[];
  contact: ContactInfo;
  shipping: ShippingConfig;
  orders: OrderRecord[];
  inquiries: BusinessInquiry[];
}

export interface StorefrontPayload {
  products: Product[];
  company: CompanyInfo;
  owner: OwnerProfile;
  coFounder: CoFounderProfile;
  certificates: CertificateDoc[];
  reviews: CustomerReview[];
  contact: ContactInfo;
  shipping: ShippingConfig;
  gatewayStatus: GatewayStatus;
}

export interface CartItem {
  productId: string;
  productName: string;
  imageUrl: string;
  variantId: string;
  weight: string;
  priceInr: number;
  quantity: number;
}
