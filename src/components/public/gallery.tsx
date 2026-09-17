import Image from "next/image";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  if (images.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {images.map((src) => (
        <div key={src} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-tenant bg-tenant-surface">
          <Image src={src} alt={alt} fill className="object-cover" sizes="96px" />
        </div>
      ))}
    </div>
  );
}
