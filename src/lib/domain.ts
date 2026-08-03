type UserRole = "admin" | "super_admin" | "customer";

export type PaymentProviderKey = "cod" | "bkash";

export type OrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "delivered";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type DeliveryStatus =
  | "pending"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "returned"
  | "cancelled";

export type DeliveryZone = "inside_dhaka" | "sub_dhaka" | "outside_dhaka";

type LandingSectionType =
  | "banner"
  | "carousel"
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
  updatedAt?: string;
}

export interface Address {
  id: string;
  userId?: string | null;
  guestKey?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  district: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  alt: string;
  sortOrder: number;
}

export type ProductCondition = "new" | "used" | "refurbished";

export type ProductSource = "manual" | "bulk";

export type ProductWeightUnit = "g" | "kg" | "lb" | "oz";

export type ProductDimensionUnit = "cm" | "mm" | "in";

export interface ProductVariantGroup {
  name: string;
  options: string[];
  priceAdjustment: number;
  sku?: string;
}

export interface ProductMetadata {
  condition: ProductCondition;
  source: ProductSource;
  isPhysical: boolean;
  minOrderQuantity: number;
  maxOrderQuantity?: number | null;
  returnable: boolean;
  returnWindowDays?: number | null;
  warrantyText?: string | null;
  expiryDate?: string | null;
  handlingTimeDays?: number | null;
  shippingClass?: string | null;
  packageWeight?: number | null;
  packageWeightUnit?: ProductWeightUnit | null;
  packageLength?: number | null;
  packageWidth?: number | null;
  packageHeight?: number | null;
  packageDimensionsUnit?: ProductDimensionUnit | null;
  taxEnabled: boolean;
  discountEnabled: boolean;
  variantGroups: ProductVariantGroup[];
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
  lowStockThreshold: number;
  categoryId: string;
  /** Optional: products can be listed without a brand. */
  brandId: string | null;
  isActive: boolean;
  featured: boolean;
  archivedAt?: string | Date | null;
  weightGrams: number;
  tags: string[];
  searchKeywords: string[];
  metadata?: ProductMetadata | null;
  createdAt: string;
  updatedAt?: string;
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
  couponCode?: string | null;
  items: CartItem[];
  updatedAt: string;
}

interface OrderItem {
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
  stage: string;
  payload: unknown;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderAmount: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryLog {
  id: string;
  productId: string;
  orderId?: string | null;
  actorId?: string | null;
  change: number;
  oldStock: number;
  newStock: number;
  reason: string;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
}

type LandingSectionItem = {
  id?: string;
  title?: string;
  body?: string;
  eyebrow?: string;
  imageUrl?: string;
  imageAlt?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  chips?: string[] | string;
  accentClass?: string;
  reverse?: boolean | string;
};

export interface LandingPageSection {
  id: string;
  landingPageId: string;
  type: LandingSectionType;
  title?: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  productIds: string[];
  items: LandingSectionItem[];
  ctaLabel?: string;
  ctaHref?: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
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
  publishedAt?: string | Date | null;
  attachedProductIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  storeName: string;
  logoText: string;
  logoUrl?: string | null;
  supportEmail?: string | null;
  contactNumber: string;
  address: string;
  businessHours: string;
  deliveryAreas: string[];
  returnRefundPolicy: string;
  confirmationMessageTemplate: string;
  metaPixelId?: string | null;
  gtmContainerId?: string | null;
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  codEnabled: boolean;
  bkashEnabled: boolean;
  bkashAccountNumber?: string | null;
  bkashInstructions: string;
  insideDhakaDeliveryCharge: number;
  subDhakaDeliveryCharge: number;
  outsideDhakaDeliveryCharge: number;
  insideDhakaCodEnabled: boolean;
  subDhakaCodEnabled: boolean;
  outsideDhakaCodEnabled: boolean;
  smtpHost?: string | null;
  smtpPort?: string | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  orderCode: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  district: string;
  shippingAddress: string;
  deliveryCharge: number;
  discountAmount: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  paymentProvider?: PaymentProviderKey;
  deliveryZone: DeliveryZone;
  notes?: string;
  adminNotes?: string | null;
  couponCode?: string | null;
  inventoryReservedAt?: string | Date | null;
  inventoryReleasedAt?: string | Date | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  actorId?: string | null;
  actorEmail?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface DatabaseState {
  users: User[];
  categories: Category[];
  brands: Brand[];
  products: Product[];
  productImages: ProductImage[];
  carts: Cart[];
  orders: Order[];
  orderStatusHistory: OrderStatusHistory[];
  payments: Payment[];
  paymentLogs: PaymentLog[];
  landingPages: LandingPage[];
  landingPageSections: LandingPageSection[];
  coupons: Coupon[];
  inventoryLogs: InventoryLog[];
  addresses: Address[];
  settings: Settings;
  auditLogs: Array<{
    id: string;
    actorEmail: string | null;
    action: string;
    entity: string;
    entityId: string;
    oldValue: unknown;
    newValue: unknown;
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

export const orderStatuses: OrderStatus[] = [
  "draft",
  "pending",
  "confirmed",
  "cancelled",
  "delivered",
];

export const deliveryStatuses: DeliveryStatus[] = [
  "pending",
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
  { key: "cod", name: "Cash on Delivery", description: "Collect payment during delivery" },
  { key: "bkash", name: "bKash", description: "Mobile financial service checkout" },
];

export const deliveryZones: Array<{
  key: DeliveryZone;
  name: string;
  description: string;
}> = [
  { key: "inside_dhaka", name: "Inside Dhaka", description: "Dhaka city delivery" },
  { key: "sub_dhaka", name: "Sub-Dhaka", description: "Dhaka division outside city" },
  { key: "outside_dhaka", name: "Outside Dhaka", description: "Nationwide delivery" },
];
