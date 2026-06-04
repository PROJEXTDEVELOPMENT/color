"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  User,
  Phone,
  CheckCircle,
  Loader,
  Lock,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

export default function KYCPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 🔐 Load logged-in user
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      router.replace("/login");
      return;
    }

    const parsed = JSON.parse(raw);
    setUser(parsed);

    if (parsed.full_name) setFullName(parsed.full_name);
    if (parsed.mobile) setMobileNumber(parsed.mobile);
  }, [router]);

  // ✅ Validate form
  const validateForm = () => {
    setError("");

    if (!fullName || fullName.trim().length < 3) {
      setError("Please enter a valid full name");
      return false;
    }

    if (!mobileNumber || mobileNumber.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return false;
    }

    return true;
  };

  // 🚀 Submit KYC (FIXED BACKEND LOGIC)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase environment variables missing");
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: insertError } = await supabase
        .from("kycdetail")
        .insert({
          loggedin_number: user.mobile,
          full_name: fullName.trim(),
          mobile: mobileNumber.trim(),
          status: "pending",
        });

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        throw new Error(insertError.message);
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          full_name: fullName.trim(),
          mobile: mobileNumber.trim(),
          kyc_status: "pending",
          kyc_verified: false,
          updated_at: new Date().toISOString(),
        })
        .eq("mobile", user.mobile);

      if (updateError) {
        console.error("Supabase user update error:", updateError);
        throw new Error(updateError.message);
      }

      // Update local user
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          full_name: fullName,
          mobile: mobileNumber,
          kyc_status: "pending",
          kyc_submitted: true,
        })
      );

      alert(
        "✅ KYC submitted successfully.\n\nVerification will be completed within 24 hours."
      );

      router.push("/dashboard/verify");
    } catch (err: any) {
      console.error("KYC submit failed:", err);
      setError(err.message || "Failed to submit KYC. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-gray-300 hover:text-white"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="text-lg font-bold">KYC Verification</div>
        <div className="w-10" />
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 p-4 rounded-xl mb-6 border border-blue-500/30">
        <div className="flex gap-3">
          <div className="bg-blue-500/20 p-2 rounded-lg">
            <Shield size={20} className="text-blue-400" />
          </div>
          <div>
            <div className="font-bold text-lg">Complete KYC</div>
            <div className="text-sm text-gray-300">
              Required for withdrawals • Secure • 24h processing
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-[#0b1b23] p-5 rounded-xl mb-6">
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="text-sm text-gray-300 flex gap-2 mb-2">
              <User size={16} /> Full Name *
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-4 rounded-lg bg-[#081316] border border-gray-700"
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="text-sm text-gray-300 flex gap-2 mb-2">
              <Phone size={16} /> Mobile Number *
            </label>
            <input
              value={mobileNumber}
              maxLength={10}
              onChange={(e) =>
                setMobileNumber(e.target.value.replace(/\D/g, ""))
              }
              className="w-full p-4 rounded-lg bg-[#081316] border border-gray-700"
            />
          </div>

          {/* Security Info */}
          <div className="bg-blue-900/20 p-4 rounded-lg flex gap-2 text-sm text-gray-300">
            <Lock size={16} className="text-blue-400" />
            Your information is encrypted and securely stored.
          </div>

          {/* Submit */}
          <button
            disabled={submitting}
            className={`w-full py-4 rounded-xl font-bold transition ${
              submitting
                ? "bg-blue-800"
                : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg"
            }`}
          >
            {submitting ? (
              <span className="flex justify-center gap-2">
                <Loader size={20} className="animate-spin" />
                Submitting KYC...
              </span>
            ) : (
              "Submit KYC Verification"
            )}
          </button>
        </form>
      </div>

      {/* Info */}
      <div className="bg-[#0b1b23] p-4 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle size={18} className="text-green-400" />
          <span className="font-medium">Verification Process</span>
        </div>
        <ul className="text-sm text-gray-400 space-y-2">
          <li>• Submit personal details</li>
          <li>• Manual verification within 24 hours</li>
          <li>• Withdrawals enabled after approval</li>
        </ul>
      </div>

      <div className="text-center text-xs text-gray-500 mt-6">
        By submitting KYC, you agree to our Terms & Privacy Policy
      </div>
    </div>
  );
}
