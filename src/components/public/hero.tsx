import Image from "next/image";
import type { Business, BusinessTheme } from "@/lib/types";

export function Hero({ business, theme }: { business: Business; theme: BusinessTheme }) {
  const heroImage = theme.hero_image_url;
  const logo = theme.logo_url;

  if (theme.hero_style === "minimal") {
    return (
      <header className="flex flex-col items-center gap-3 px-4 pb-6 pt-10 text-center">
        {logo ? (
          <Image src={logo} alt={`${business.name} logo`} width={56} height={56} className="rounded-tenant" />
        ) : null}
        <h1 className="font-tenant-heading text-2xl font-semibold">{business.name}</h1>
        {business.tagline ? <p className="text-sm text-tenant-secondary">{business.tagline}</p> : null}
      </header>
    );
  }

  if (theme.hero_style === "logo-centric") {
    return (
      <header className="relative flex min-h-[40vh] flex-col items-center justify-center gap-4 bg-tenant-surface px-4 text-center">
        {logo ? (
          <Image
            src={logo}
            alt={`${business.name} logo`}
            width={96}
            height={96}
            className="rounded-tenant shadow-lg"
          />
        ) : null}
        <h1 className="font-tenant-heading text-3xl font-semibold">{business.name}</h1>
        {business.tagline ? <p className="max-w-sm text-sm text-tenant-secondary">{business.tagline}</p> : null}
      </header>
    );
  }

  if (theme.hero_style === "split") {
    return (
      <header className="flex flex-col sm:flex-row sm:items-stretch">
        <div className="relative h-48 w-full sm:h-64 sm:w-1/2">
          {heroImage ? (
            <Image src={heroImage} alt={business.name} fill priority className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />
          ) : (
            <div className="h-full w-full bg-tenant-surface" />
          )}
        </div>
        <div className="flex w-full flex-col justify-center gap-2 bg-tenant-surface px-6 py-6 sm:w-1/2">
          {logo ? (
            <Image src={logo} alt="" width={40} height={40} className="rounded-tenant" />
          ) : null}
          <h1 className="font-tenant-heading text-2xl font-semibold sm:text-3xl">{business.name}</h1>
          {business.tagline ? <p className="text-sm text-tenant-secondary">{business.tagline}</p> : null}
        </div>
      </header>
    );
  }

  // full-bleed (default)
  return (
    <header className="relative flex h-[46vh] min-h-[280px] flex-col justify-end overflow-hidden">
      {heroImage ? (
        <Image
          src={heroImage}
          alt={business.name}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-tenant-surface" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="relative flex items-end gap-3 px-4 pb-6">
        {logo ? (
          <Image
            src={logo}
            alt=""
            width={48}
            height={48}
            className="rounded-tenant border-2 border-white/80 shadow-md"
          />
        ) : null}
        <div>
          <h1 className="font-tenant-heading text-2xl font-semibold text-white sm:text-3xl">
            {business.name}
          </h1>
          {business.tagline ? <p className="text-sm text-white/85">{business.tagline}</p> : null}
        </div>
      </div>
    </header>
  );
}
