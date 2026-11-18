"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { HiOutlineMapPin } from "react-icons/hi2";
import { getTripCover } from "@/lib/api";

export function TripCardCover({ slug, children }: { slug: string; children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [failedImageUrl, setFailedImageUrl] = useState<string>();
  const { data } = useQuery({
    queryKey: ["trip-cover", slug],
    queryFn: ({ signal }) => getTripCover(slug, signal),
    enabled: nearViewport || (typeof window !== "undefined" && typeof IntersectionObserver === "undefined"),
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (nearViewport || !viewport.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setNearViewport(true);
    }, { rootMargin: "160px" });
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [nearViewport]);

  const cover = data?.imageUrl === failedImageUrl ? null : data;
  return <div ref={viewport} className="relative aspect-video overflow-hidden bg-linear-to-br from-sky-100 to-blue-200 dark:from-slate-700 dark:to-blue-950">
    <HiOutlineMapPin aria-hidden="true" className="absolute top-1/2 left-1/2 size-12 -translate-1/2 text-blue-700/70 dark:text-blue-200/80" />
    {cover && <>
      <Image
        src={cover.imageUrl}
        alt=""
        fill
        unoptimized
        referrerPolicy="no-referrer"
        className="object-cover"
        onError={() => setFailedImageUrl(cover.imageUrl)}
      />
      <div className="absolute right-2 bottom-2 z-10 max-w-[calc(100%-1rem)] rounded-md bg-black/80 px-2 py-1 text-right text-[0.6875rem] leading-tight text-white">
        <a href={cover.sourceUrl} target="_blank" rel="noreferrer" className="wrap-anywhere hover:underline focus-visible:underline">
          {cover.author || "Wikimedia Commons"}
        </a>
        {" · "}
        {cover.licenseUrl ? <a href={cover.licenseUrl} target="_blank" rel="noreferrer" className="hover:underline focus-visible:underline">
          {cover.license}
        </a> : cover.license}
      </div>
    </>}
    {children}
  </div>;
}
