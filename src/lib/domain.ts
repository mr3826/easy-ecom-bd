export type UserRole = "admin" | "manager" | "customer";

export type PaymentProviderKey = "bkash" | "nagad";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type DeliveryStatus =
  | "pending"
  | "courier_created"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "returned"
  | "cancelled";

export type LandingSectionType =
  | "banner"
  | "title"
  | "subtitle"
  | "product_section"
  | "faq"
  | "testimonials"
  | "cta";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  alt: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  categoryId: string;
  brandId: string;
  isActive: boolean;
  featured: boolean;
  weightGrams: number;
  tags: string[];
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
}

export interface Cart {
  id: string;
  ownerId?: string;
  guestKey: string;
  items: CartItem[];
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: PaymentProviderKey;
  transactionId: string;
  amount: number;
  status: PaymentStatus;
  rawResponse: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentLog {
  id: string;
  paymentId: string;
  stage: "init" | "callback" | "verification" | "webhook" | "manual-update";
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface Courier {
  id: string;
  key: "pathao" | "steadfast";
  name: string;
  enabled: boolean;
  description: string;
}

export interface DeliveryShipment {
  id: string;
  orderId: string;
  courierKey: Courier["key"];
  trackingId: string;
  consignmentId?: string;
  status: DeliveryStatus;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  rawResponse: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderAmount: number;
  isActive: boolean;
}

export interface InventoryLog {
  id: string;
  productId: string;
  change: number;
  reason: string;
  createdAt: string;
}

export interface LandingPageSection {
  id: string;
  landingPageId: string;
  type: LandingSectionType;
  title?: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  productIds: string[];
  items: Array<{ title: string; body: string }>;
  ctaLabel?: string;
  ctaHref?: string;
  sortOrder: number;
}

export interface LandingPage {
  id: string;
  slug: string;
  title: string;
  metaDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  bannerImageUrl?: string;
  published: boolean;
  attachedProductIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  storeName: string;
  logoText: string;
  contactNumber: string;
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  pathaoEnabled: boolean;
  steadfastEnabled: boolean;
}

export interface Order {
  id: string;
  orderCode: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: string;
  deliveryCharge: number;
  discountAmount: number;
  subtotal: number;
  total: number;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  paymentProvider?: PaymentProviderKey;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface DatabaseState {
  users: User[];
  categories: Category[];
  brands: Brand[];
  products: Product[];
  productImages: ProductImage[];
  carts: Cart[];
  orders: Order[];
  payments: Payment[];
  paymentLogs: PaymentLog[];
  couriers: Courier[];
  deliveryShipments: DeliveryShipment[];
  landingPages: LandingPage[];
  landingPageSections: LandingPageSection[];
  coupons: Coupon[];
  inventoryLogs: InventoryLog[];
  settings: Settings;
  auditLogs: Array<{
    id: string;
    actorEmail: string;
    action: string;
    entity: string;
    entityId: string;
    note: string;
    createdAt: string;
  }>;
}

export const paymentStatuses: PaymentStatus[] = [
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "refunded",
];

export const deliveryStatuses: DeliveryStatus[] = [
  "pending",
  "courier_created",
  "picked_up",
  "in_transit",
  "delivered",
  "returned",
  "cancelled",
];

export const paymentProviders: Array<{
  key: PaymentProviderKey;
  name: string;
  description: string;
}> = [
  { key: "bkash", name: "bKash", description: "Direct merchant checkout" },
  { key: "nagad", name: "Nagad", description: "Direct merchant checkout" },
];

export const courierOptions: Array<{
  key: Courier["key"];
  name: string;
  description: string;
}> = [
  { key: "pathao", name: "Pathao Courier", description: "API-first parcel delivery" },
  { key: "steadfast", name: "Steadfast Courier", description: "Nationwide delivery network" },
];

