"use client";

import Image from "next/image";
import { useState } from "react";

/** Cover image with a pulsing skeleton placeholder that fades out once the image loads. */
export function ProjectCoverImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-foreground/[0.05] transition-opacity duration-300 ${
          loaded ? "opacity-0" : "animate-pulse opacity-100"
        }`}
      />
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
        onLoad={() => setLoaded(true)}
        className={`object-cover transition-[opacity,transform] duration-300 group-hover:scale-[1.025] ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
