"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader,
  Copy,
  Download,
} from "lucide-react";
import QRCode from "qrcode";

export default function KYCVerifyPage() {
  const router = useRouter();
  const qrRef = useRef<HTMLDivElement>(null);

  // 🔐 Logged-in user
  const [user, setUser] = useState<any>(null);

  // Form states
  const [utr, setUtr] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // QR + timer
  const [qrUrl, setQrUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(300);
  const [copied, setCopied] = useState(false);

  // 💰 Payment config
  const upiId = "openaiaxcellsahu6800@fam";
  const amount = "149";
  const note = "KYC Verification Fee";

  // 🔐 Auth check (same as Withdraw / Recharge)
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      router.replace("/login");
      return;
    }
    setUser(JSON.parse(raw));
  }, [router]);

  // 🔳 Generate QR
  useEffect(() => {
    const generateQR = async () => {
      try {
        const upi = `upi://pay?pa=${upiId}&pn=KYC%20Verification&am=${amount}&cu=INR&tn=${encodeURIComponent(
          note
        )}`;
        const url = await QRCode.toDataURL(upi, { width: 256, margin: 2 });
        setQrUrl(url);
      } catch {
        setQrUrl("/fallback-qr.png");
      } finally {
        setQrLoading(false);
      }
    };
    generateQR();
  }, []);

  // ⏱ Countdown
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft((p) => (p > 0 ? p - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // 📤 Screenshot upload
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];

    if (file.size > 5 * 1024 * 1024) {
      setError("File must be under 5MB");
      return;
    }

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setError("Only PNG or JPG allowed");
      return;
    }

    setScreenshot(file);
    setError("");

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ✅ Submit (same backend logic as Recharge)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (utr.length !== 12) {
      setError("UTR must be 12 digits");
      return;
    }
    if (!screenshot) {
      setError("Upload payment screenshot");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("utr", utr);
      fd.append("mobile", user.mobile);
      fd.append("file", screenshot);

      const res = await fetch("/api/recharge", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Submission failed");
        setSubmitting(false);
        return;
      }

      alert(
        "✅ Payment submitted successfully.\n\nKYC will be verified within 24 hours."
      );
      router.push("/dashboard");
    } catch {
      setError("Server error. Try again.");
      setSubmitting(false);
    }
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
      2,
      "0"
    )}`;

  const expired = timeLeft === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 pb-24 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-gray-300"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="font-bold">KYC Payment</h1>
        <div />
      </div>

      {/* Amount */}
      <div className="bg-[#0b1b23] p-5 rounded-xl text-center mb-5">
        <p className="text-gray-400 text-sm">KYC Fee</p>
        <div className="text-4xl font-bold text-cyan-400">₹{amount}</div>
      </div>

      {/* UPI */}
      <div className="bg-[#081316] p-4 rounded-lg mb-4">
        <div className="flex justify-between items-center">
          <code className="text-cyan-400 break-all">{upiId}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(upiId);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      {/* QR */}
      <div className="flex flex-col items-center mb-6">
        <div className="bg-white p-3 rounded-lg">
          {qrLoading ? (
            <Loader className="animate-spin text-blue-500" />
          ) : (
            <img src={qrUrl} className="w-56 h-56" />
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Clock size={16} />
          <span className={expired ? "text-red-400" : "text-blue-400"}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 p-3 rounded-lg mb-4 flex gap-2">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <input
          type="text"
          placeholder="12-digit UTR"
          value={utr}
          maxLength={12}
          onChange={(e) =>
            setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))
          }
          className="w-full p-4 rounded-lg bg-[#081316] border border-gray-700"
        />

        {preview && (
          <img
            src={preview}
            className="w-full h-48 object-contain rounded-lg border"
          />
        )}

        <label className="flex flex-col items-center p-6 border-2 border-dashed rounded-lg cursor-pointer">
          <Upload />
          <span className="text-sm mt-2">
            {screenshot ? screenshot.name : "Upload Screenshot"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </label>

        <button
          disabled={submitting || expired}
          className={`w-full py-4 rounded-xl font-bold ${
            submitting || expired
              ? "bg-gray-700"
              : "bg-gradient-to-r from-blue-500 to-cyan-500"
          }`}
        >
          {submitting ? "Submitting..." : "Submit Payment"}
        </button>
      </form>
    </div>
  );
}
