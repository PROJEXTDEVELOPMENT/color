"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem("user");

    if (user) {
      router.push("/dashboard"); // user logged in
    } else {
      router.push("/login"); // not logged in
    }
  }, [router]);

  return null; // nothing to show
}
