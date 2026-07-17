import type { StaticImageData } from "next/image";

export function BrandIcon({
  src,
  className,
}: {
  src: string | StaticImageData;
  className?: string;
}) {
  const url = typeof src === "string" ? src : src.src;

  return (
    <span
      aria-hidden="true"
      className={["inline-block shrink-0 bg-current", className].filter(Boolean).join(" ")}
      style={{
        WebkitMaskImage: `url(${url})`,
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskImage: `url(${url})`,
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "contain",
      }}
    />
  );
}
