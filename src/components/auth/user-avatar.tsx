"use client";

import Image from "next/image";
import { useState } from "react";

export function UserAvatar({ name, image, className = "" }: { name: string; image?: string; className?: string }) {
  const [failedImage, setFailedImage] = useState<string>();
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toLocaleUpperCase("hu");

  return (
    <span aria-hidden="true" className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-brand/10 font-bold text-blue-800 dark:text-blue-300 ${className}`}>
      {image && failedImage !== image
        ? <Image src={image} alt="" fill unoptimized className="object-cover" onError={() => setFailedImage(image)} />
        : initials}
    </span>
  );
}
