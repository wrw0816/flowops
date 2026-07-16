"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type AutoRefreshProps = {
  intervalSeconds?: number;
};

export default function AutoRefresh({
  intervalSeconds = 10,
}: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, intervalSeconds * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [intervalSeconds, router]);

  return null;
}