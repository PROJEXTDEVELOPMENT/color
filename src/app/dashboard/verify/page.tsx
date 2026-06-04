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
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [timeLeft, setTimeLeft] = useState(300);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // QR
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isQrLoading, setIsQrLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // 💰 Payment config
  const upiId = "openaiaxcellsahu6800@fam";
  const amount = "149";
  const paymentNote = ".";

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
    const generateQRCode = async () => {
      try {
        const upiString = `upi://pay?pa=${upiId}&pn=KYC%20Verification&am=${amount}&cu=INR&tn=${encodeURIComponent(
          paymentNote
        )}`;
        const url = await QRCode.toDataURL(upiString, { width: 256, margin: 2 });
        setQrCodeUrl(url);
      } catch {
        setQrCodeUrl("/fallback-qr.png");
      } finally {
        setIsQrLoading(false);
      }
    };

    generateQRCode();
  }, []);

  // ⏱ Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((p) => (p > 0 ? p - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 📤 Screenshot upload
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setError("Only PNG or JPG files allowed");
      return;
    }

    setScreenshot(file);
    setError("");

    const reader = new FileReader();
    reader.onloadend = () =>
      setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ✅ REAL BACKEND SUBMIT (same as Recharge)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (utr.length !== 12) {
      setError("UTR must be a 12-digit number");
      return;
    }

    if (!screenshot) {
      setError("Please upload payment screenshot");
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
      setError("Server error. Please try again.");
      setSubmitting(false);
    }
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `kyc-payment-qr-${upiId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isTimeExpired = timeLeft === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-gray-300 hover:text-white active:scale-95"
          disabled={submitting}
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Back</span>
        </button>
        
        <div className="text-lg font-bold">KYC Payment Verification</div>
        
        <div className="w-10"></div>
      </div>

      {/* Main Container */}
      <div className="bg-[#0b1b23] p-5 rounded-xl mb-6">
        {/* Payment Info Banner */}
        <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 p-5 rounded-xl border border-blue-500/30 mb-6">
          <div className="text-center mb-4">
            <p className="text-gray-300 text-sm mb-2">KYC Verification Fee</p>
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              ₹{amount}
            </div>
            <p className="text-gray-400 text-xs mt-2">One Time Payment | Non-Refundable</p>
          </div>

          {/* UPI ID Display */}
          <div className="bg-[#081316] p-3 rounded-lg mb-4 border border-gray-700">
            <p className="text-xs text-gray-400 mb-1">UPI ID for Payment</p>
            <div className="flex items-center justify-between">
              <code className="text-lg font-mono text-cyan-400 break-all">{upiId}</code>
              <button
                onClick={handleCopyUPI}
                className="ml-2 p-2 bg-blue-900/50 hover:bg-blue-800 rounded-lg transition-colors"
                title="Copy UPI ID"
              >
                {copied ? (
                  <CheckCircle size={18} className="text-green-400" />
                ) : (
                  <Copy size={18} className="text-blue-400" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Copy this UPI ID and send exact amount via any UPI app
            </p>
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center mb-4">
            <p className="text-sm text-gray-300 mb-3">Scan QR Code with UPI App</p>
            
            <div className="relative">
              <div 
                ref={qrRef}
                className="bg-white p-4 rounded-lg w-64 h-64 flex items-center justify-center"
              >
                {isQrLoading ? (
                  <div className="flex flex-col items-center justify-center">
                    <Loader size={32} className="animate-spin text-blue-500 mb-2" />
                    <p className="text-xs text-gray-600">Generating QR Code...</p>
                  </div>
                ) : (
                  <>
                    <img
                      src={qrCodeUrl}
                      alt="UPI Payment QR Code"
                      className="w-56 h-56 object-contain"
                    />
                    <button
                      onClick={handleDownloadQR}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black p-2 rounded-lg text-white"
                      title="Download QR Code"
                    >
                      <Download size={16} />
                    </button>
                  </>
                )}
              </div>
              
              {/* Amount overlay on QR */}
              <div className="absolute bottom-6 left-0 right-0 text-center">
                <div className="inline-block bg-black/80 text-white px-3 py-1 rounded-lg">
                  <span className="font-bold">₹{amount}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <div className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg ${isTimeExpired ? 'bg-red-900/30' : 'bg-blue-900/30'}`}>
                <Clock size={16} className={isTimeExpired ? 'text-red-400' : 'text-blue-400'} />
                <span className={`font-semibold ${isTimeExpired ? 'text-red-400' : 'text-blue-400'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {isTimeExpired ? "Payment window expired" : "Complete payment within time limit"}
              </p>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-[#081316] p-3 rounded-lg border border-gray-700">
            <p className="text-sm font-medium text-gray-300 mb-2">Payment Instructions:</p>
            <ol className="text-xs text-gray-400 space-y-1 list-decimal pl-4">
              <li>Scan QR code with any UPI app (GPay, PhonePe, Paytm, etc.)</li>
              <li>Verify amount is ₹{amount} before paying</li>
              <li>UPI ID: {upiId}</li>
              <li>Save payment screenshot with UTR number</li>
              <li>Return here to submit payment details</li>
            </ol>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* UTR Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              UTR Number (12 digits) *
            </label>
            <input
              type="text"
              value={utr}
              onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="Enter 12-digit UTR number"
              maxLength={12}
              className="w-full p-4 rounded-lg bg-[#081316] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 placeholder-gray-500"
              disabled={submitting}
            />
            <p className="text-xs text-gray-400 mt-2">
              Find UTR number in your bank statement or UPI app transaction details
            </p>
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Screenshot *
            </label>
            
            {screenshotPreview ? (
              <div className="relative mb-3">
                <div className="relative w-full h-48 rounded-lg border-2 border-green-500/30 bg-[#081316] overflow-hidden">
                  <img
                    src={screenshotPreview}
                    alt="Payment Screenshot"
                    className="w-full h-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setScreenshot(null);
                    setScreenshotPreview("");
                  }}
                  className="absolute top-2 right-2 bg-red-900/80 hover:bg-red-900 p-2 rounded-lg text-white"
                  disabled={submitting}
                >
                  ✕
                </button>
              </div>
            ) : null}

            <label className={`w-full flex flex-col items-center px-4 py-8 bg-[#081316] border-2 border-dashed rounded-lg cursor-pointer transition-colors ${submitting ? 'border-gray-600 cursor-not-allowed' : 'border-gray-700 hover:border-blue-500'}`}>
              <Upload size={24} className="text-blue-400 mb-2" />
              <span className="text-sm font-medium text-gray-300">
                {screenshot ? screenshot.name : "Click to upload payment screenshot"}
              </span>
              <span className="text-xs text-gray-400 mt-1">
                PNG or JPG (Max 5MB)
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={handleScreenshotUpload}
                disabled={submitting}
              />
            </label>
          </div>

          {/* Payment Verification Info */}
          <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-300">
                <p className="font-medium mb-1">Verification Process</p>
                <p className="text-xs">Your payment will be manually verified within 24 hours. Make sure:</p>
                <ul className="text-xs text-gray-400 mt-1 pl-4 list-disc">
                  <li>Amount is exactly ₹{amount}</li>
                  <li>UTR number matches your transaction</li>
                  <li>Screenshot clearly shows payment details</li>
                  <li>Payment is made to correct UPI ID: {upiId}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || isTimeExpired}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              submitting || isTimeExpired
                ? 'bg-blue-800 opacity-50 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95'
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader size={20} className="animate-spin" />
                Submitting Payment Details...
              </span>
            ) : isTimeExpired ? (
              'Payment Window Expired'
            ) : (
              'Submit Payment Details'
            )}
          </button>
        </form>
      </div>

      {/* Benefits Section */}
      <div className="bg-[#0b1b23] p-5 rounded-xl mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle size={18} className="text-green-400" />
          <span className="font-medium">After Verification Benefits</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-3 p-3 bg-green-900/10 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
            <div>
              <span className="text-sm font-medium text-gray-300">Verified Account</span>
              <p className="text-xs text-gray-400">Full platform access</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-blue-900/10 rounded-lg">
            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
            <div>
              <span className="text-sm font-medium text-gray-300">Fast Withdrawals</span>
              <p className="text-xs text-gray-400">Processed in 2-4 hours</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-purple-900/10 rounded-lg">
            <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
            <div>
              <span className="text-sm font-medium text-gray-300">Higher Limits</span>
              <p className="text-xs text-gray-400">Increased transaction limits</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-amber-900/10 rounded-lg">
            <div className="w-2 h-2 bg-amber-400 rounded-full mt-2"></div>
            <div>
              <span className="text-sm font-medium text-gray-300">Priority Support</span>
              <p className="text-xs text-gray-400">24/7 dedicated support</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Section */}
      <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-300">
            <p className="font-medium mb-1">⚠️ Important Security Notice</p>
            <p className="text-xs">
              Only make payment to the official UPI ID shown above. Fake payments, incorrect amounts, or payments to other UPI IDs will result in permanent account suspension. Payment verification is manual and may take up to 24 hours.
            </p>
          </div>
        </div>
      </div>

      {/* Support Info */}
      <div className="bg-gray-900/50 p-4 rounded-xl mt-4">
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-2">Need help with payment?</p>
          <p className="text-xs text-gray-500">
            Contact support at: support@kycverify.com | WhatsApp: +91 9876543210
          </p>
        </div>
      </div>

      {/* Footer Text */}
      <div className="text-center mt-6">
        <p className="text-xs text-gray-500">
          By submitting payment details, you agree to our Terms of Service and Privacy Policy.<br />
          KYC verification fee is non-refundable once processed.
        </p>
      </div>
    </div>
  );
}
