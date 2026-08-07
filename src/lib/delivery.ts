export type DeliveryZone = "inside_dhaka" | "sub_dhaka" | "outside_dhaka";

export interface DeliverySettings {
  freeDeliveryThreshold: number;
  insideDhakaDeliveryCharge: number;
  subDhakaDeliveryCharge: number;
  outsideDhakaDeliveryCharge: number;
}

export const DELIVERY_ZONE_VALUES: ReadonlyArray<DeliveryZone> = ["inside_dhaka", "sub_dhaka", "outside_dhaka"];

const districtToZone: Record<string, DeliveryZone> = {
  dhaka: "inside_dhaka",
  gulshan: "inside_dhaka",
  banani: "inside_dhaka",
  dhanmondi: "inside_dhaka",
  mirpur: "inside_dhaka",
  uttara: "inside_dhaka",
  mohammadpur: "inside_dhaka",
  tejgaon: "inside_dhaka",
  ramna: "inside_dhaka",
  motijheel: "inside_dhaka",
  gazipur: "sub_dhaka",
  narayanganj: "sub_dhaka",
  savar: "sub_dhaka",
  keraniganj: "sub_dhaka",
  tangail: "sub_dhaka",
  manikganj: "sub_dhaka",
  munshiganj: "sub_dhaka",
  narsingdi: "sub_dhaka",
};

export function isDeliveryZone(value: unknown): value is DeliveryZone {
  return typeof value === "string" && (DELIVERY_ZONE_VALUES as ReadonlyArray<string>).includes(value);
}

export function deriveDeliveryZone(district: string): DeliveryZone {
  const normalized = district.trim().toLowerCase();
  return districtToZone[normalized] ?? "outside_dhaka";
}

export function getDeliveryChargeForZone(settings: DeliverySettings, zone: DeliveryZone, subtotalAfterDiscount = 0): number {
  if (subtotalAfterDiscount >= settings.freeDeliveryThreshold) return 0;
  if (zone === "inside_dhaka") return settings.insideDhakaDeliveryCharge;
  if (zone === "sub_dhaka") return settings.subDhakaDeliveryCharge;
  return settings.outsideDhakaDeliveryCharge;
}

export const deliveryZones: Array<{
  key: DeliveryZone;
  name: string;
  description: string;
}> = [
  { key: "inside_dhaka", name: "Inside Dhaka", description: "Dhaka city delivery" },
  { key: "sub_dhaka", name: "Sub-Dhaka", description: "Dhaka division outside city" },
  { key: "outside_dhaka", name: "Outside Dhaka", description: "Nationwide delivery" },
];

export const deliveryDistricts: Array<{ zone: DeliveryZone; name: string }> = [
  { zone: "inside_dhaka", name: "Dhaka" },
  { zone: "inside_dhaka", name: "Gulshan" },
  { zone: "inside_dhaka", name: "Banani" },
  { zone: "inside_dhaka", name: "Dhanmondi" },
  { zone: "inside_dhaka", name: "Mirpur" },
  { zone: "inside_dhaka", name: "Uttara" },
  { zone: "inside_dhaka", name: "Mohammadpur" },
  { zone: "inside_dhaka", name: "Tejgaon" },
  { zone: "inside_dhaka", name: "Ramna" },
  { zone: "inside_dhaka", name: "Motijheel" },
  { zone: "sub_dhaka", name: "Gazipur" },
  { zone: "sub_dhaka", name: "Narayanganj" },
  { zone: "sub_dhaka", name: "Savar" },
  { zone: "sub_dhaka", name: "Keraniganj" },
  { zone: "sub_dhaka", name: "Tangail" },
  { zone: "sub_dhaka", name: "Manikganj" },
  { zone: "sub_dhaka", name: "Munshiganj" },
  { zone: "sub_dhaka", name: "Narsingdi" },
];
