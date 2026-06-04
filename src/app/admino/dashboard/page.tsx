"use client";

import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem("admin_logged_in");
    localStorage.removeItem("admin_email");
    router.replace("/admino");
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>

        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Logout
        </button>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">
          Quick Actions
        </h2>

        <div className="flex gap-4 flex-wrap">
          <button
            onClick={() => router.push("/admino/dashboard/users")}
            className="px-6 py-3 bg-black text-white rounded"
          >
            Manage Users
          </button>

          <button
            onClick={() => router.push("/admino/dashboard/kyc")}
            className="px-6 py-3 bg-black text-white rounded"
          >
            Review KYC
          </button>

          <button
            onClick={() => router.push("/admino/dashboard/recharges")}
            className="px-6 py-3 bg-black text-white rounded"
          >
            View Recharges
          </button>
        </div>
      </div>
    </div>
  );
}
