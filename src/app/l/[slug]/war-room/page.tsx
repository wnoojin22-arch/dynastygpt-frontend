"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function WarRoomRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const slug = pathname.split("/")[2] || "";

  useEffect(() => {
    router.replace(`/l/${slug}/dashboard`);
  }, [router, slug]);

  return null;
}
