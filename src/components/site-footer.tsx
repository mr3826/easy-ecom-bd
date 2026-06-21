import Link from "next/link";
import { getSettings } from "@/server/store";

export function SiteFooter() {
  const settings = getSettings();

  return (
    <footer className="border-t border-black/5 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <p className="text-lg font-semibold text-white">{settings.storeName}</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
            Full ecommerce stack for Bangladesh with bKash, Nagad, courier sync, and landing pages built in.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Link href="/products" className="hover:text-white">
            Products
          </Link>
          <Link href="/track" className="hover:text-white">
            Track order
          </Link>
          <Link href="/login" className="hover:text-white">
            Login
          </Link>
          <Link href="/admin" className="hover:text-white">
            Admin
          </Link>
        </div>
        <div className="text-sm text-slate-400">
          <p>Contact: {settings.contactNumber}</p>
          <p className="mt-2">
            Delivery charge: {settings.deliveryCharge} BDT, free over {settings.freeDeliveryThreshold} BDT.
          </p>
        </div>
      </div>
    </footer>
  );
}

