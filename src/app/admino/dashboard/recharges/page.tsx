"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Recharge = {
  id: number;
  mobile: string;
  utr: string;
  screenshot: string;
  status: string;
  created_at: string;
};

export default function AdminRechargesPage() {
  const router = useRouter();
  const [data, setData] = useState<Recharge[]>([]);
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

    const fetchRecharges = async () => {
      const { data, error } = await supabase
        .from("kycpayments") // or recharges table if separate
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setData(data);
      }

      setLoading(false);
    };

    fetchRecharges();
  }, [router]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Recharge Requests</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border">Mobile</th>
                <th className="p-3 border">UTR</th>
                <th className="p-3 border">Screenshot</th>
                <th className="p-3 border">Status</th>
                <th className="p-3 border">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="text-center">
                  <td className="p-2 border">{item.mobile}</td>
                  <td className="p-2 border">{item.utr}</td>
                  <td className="p-2 border">
                    <img
                      src={item.screenshot}
                      className="w-16 h-16 object-cover mx-auto rounded"
                    />
                  </td>
                  <td className="p-2 border">{item.status}</td>
                  <td className="p-2 border">
                    {new Date(item.created_at).toLocaleString()}
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
