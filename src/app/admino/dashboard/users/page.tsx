"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type User = {
  id: string;
  full_name: string | null;
  mobile: string;
  balance: number;
  kyc_verified: boolean;
  kyc_status: string;
  created_at: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔐 Admin auth check
    const admin = localStorage.getItem("admin_logged_in");
    if (admin !== "true") {
      router.replace("/admino");
      return;
    }

    // ✅ Create Supabase client ONLY in browser
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase env missing");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setUsers(data);
      }

      setLoading(false);
    };

    fetchUsers();
  }, [router]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Manage Users</h1>

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border">Name</th>
                <th className="p-3 border">Mobile</th>
                <th className="p-3 border">Balance</th>
                <th className="p-3 border">KYC Status</th>
                <th className="p-3 border">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="text-center">
                  <td className="p-2 border">{u.full_name || "-"}</td>
                  <td className="p-2 border">{u.mobile}</td>
                  <td className="p-2 border">₹{u.balance}</td>
                  <td className="p-2 border">{u.kyc_status}</td>
                  <td className="p-2 border">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
