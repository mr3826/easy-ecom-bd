import Image from "next/image";
import { siteBrand } from "@/lib/site-brand";

export function SiteLogo({
  logoUrl,
  size,
  className,
}: {
  logoUrl?: string | null;
  size: number;
  className?: string;
}) {
  const source = logoUrl?.trim() || siteBrand.logoPath;

  return (
    <Image
      src={source}
      alt=""
      width={size}
      height={size}
      className={className}
      unoptimized={/^https?:\/\//i.test(source)}
    />
  );
}
