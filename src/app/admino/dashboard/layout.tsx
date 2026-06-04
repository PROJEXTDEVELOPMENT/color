"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const isAdmin = localStorage.getItem("admin_logged_in");
    if (isAdmin !== "true") {
      router.replace("/admino");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100">
      {children}
    </div>
  );
}
