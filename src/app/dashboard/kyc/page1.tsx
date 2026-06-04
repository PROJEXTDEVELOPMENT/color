// app/dashboard/kyc/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, User, Phone, Calendar, CheckCircle, Loader, Lock, AlertCircle } from "lucide-react";

export default function KYCPage() {
  const router = useRouter();
  
  // Form states
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [dob, setDob] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [inputCaptcha, setInputCaptcha] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load user data from localStorage on mount
  useEffect(() => {
    const loadUserData = () => {
      try {
        const raw = localStorage.getItem("user");
        if (raw) {
          const parsed = JSON.parse(raw);
          
          // Set full name if available
          if (parsed.full_name) {
            setFullName(parsed.full_name);
          }
          
          // Set mobile number if available
          if (parsed.mobile) {
            setMobileNumber(parsed.mobile);
          }
        }
      } catch (err) {
        console.error("Error loading user data:", err);
      }
    };
    
    loadUserData();
    generateCaptcha();
  }, []);

  // Generate 4-digit captcha
  const generateCaptcha = () => {
    const randomCaptcha = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptcha(randomCaptcha);
    setInputCaptcha("");
  };

  // Validate form
  const validateForm = () => {
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your full name");
      return false;
    }

    if (fullName.trim().length < 3) {
      setError("Name must be at least 3 characters");
      return false;
    }

    if (!mobileNumber.trim()) {
      setError("Please enter your mobile number");
      return false;
    }

    if (mobileNumber.trim().length !== 10 || !/^\d+$/.test(mobileNumber)) {
      setError("Please enter a valid 10-digit mobile number");
      return false;
    }

    if (!dob) {
      setError("Please select your date of birth");
      return false;
    }

    // Check if user is at least 18 years old
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      if (age - 1 < 18) {
        setError("You must be at least 18 years old");
        return false;
      }
    } else if (age < 18) {
      setError("You must be at least 18 years old");
      return false;
    }

    if (!inputCaptcha) {
      setError("Please enter the captcha code");
      return false;
    }

    if (inputCaptcha !== captcha) {
      setError("Captcha code is incorrect");
      generateCaptcha();
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Store KYC data in localStorage
      const raw = localStorage.getItem("user");
      if (raw) {
        const user = JSON.parse(raw);
        const updatedUser = {
          ...user,
          full_name: fullName.trim(),
          mobile: mobileNumber.trim(),
          dob: dob,
          kyc_submitted: true,
          kyc_submitted_at: new Date().toISOString()
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      // Show success message
      alert(" KYC Submitted proessed!\n\nYour verification is being processed. You will be notified once verified.");
      
      // Redirect to verification page
      router.push("/dashboard/verify");

    } catch (error) {
      console.error("KYC submission error:", error);
      setError("Failed to submit KYC. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-gray-300 hover:text-white active:scale-95"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Back</span>
        </button>
        
        <div className="text-lg font-bold">KYC Verification</div>
        
        <div className="w-10"></div>
      </div>

      {/* KYC Banner */}
      <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 p-4 rounded-xl mb-6 border border-blue-500/30">
        <div className="flex items-start gap-3">
          <div className="bg-blue-500/20 p-2 rounded-lg">
            <Shield size={20} className="text-blue-400" />
          </div>
          <div>
            <div className="font-bold text-lg">Complete KYC</div>
            <div className="text-sm text-gray-300 mt-1">
              Required for withdrawals • Secure & Encrypted • 24 Hour Processing
            </div>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-[#0b1b23] p-5 rounded-xl mb-6">
        <h2 className="text-xl font-bold mb-2">Basic Information</h2>
        <p className="text-sm text-gray-400 mb-6">Enter your basic details for verification</p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <User size={16} />
                Full Name *
              </div>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full p-4 rounded-lg bg-[#081316] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
              required
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Phone size={16} />
                Mobile Number *
              </div>
            </label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Enter 10-digit mobile number"
              maxLength={10}
              className="w-full p-4 rounded-lg bg-[#081316] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
              required
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                Date of Birth *
              </div>
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full p-4 rounded-lg bg-[#081316] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
              required
            />
            <p className="text-xs text-gray-400 mt-2">
              You must be at least 18 years old
            </p>
          </div>

          {/* Captcha */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Security Verification *
            </label>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 bg-gray-900 p-4 rounded-lg text-2xl font-bold tracking-widest text-center">
                {captcha}
              </div>
              <button
                type="button"
                onClick={generateCaptcha}
                className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 active:scale-95"
                disabled={submitting}
              >
                ↻
              </button>
            </div>
            
            <input
              type="text"
              value={inputCaptcha}
              onChange={(e) => setInputCaptcha(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Enter the 4-digit code above"
              maxLength={4}
              className="w-full p-4 rounded-lg bg-[#081316] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
              required
            />
          </div>

          {/* Security Info */}
          <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
            <div className="flex items-start gap-2">
              <Lock size={16} className="text-blue-400 mt-0.5" />
              <div className="text-sm text-gray-300">
                Your information is encrypted and stored securely. We use 256-bit SSL encryption to protect your data.
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${submitting ? 'bg-blue-800' : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/20'}`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader size={20} className="animate-spin" />
                Submitting KYC...
              </span>
            ) : (
              'Submit KYC Verification'
            )}
          </button>
        </form>
      </div>

      {/* Information Box */}
      <div className="bg-[#0b1b23] p-4 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle size={18} className="text-green-400" />
          <span className="font-medium">Verification Process</span>
        </div>
        <ul className="space-y-3 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5"></div>
            <span>Enter your basic information</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5"></div>
            <span>Submit for verification (takes 24 hours)</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5"></div>
            <span>Get notified once verified</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5"></div>
            <span>Start making withdrawals</span>
          </li>
        </ul>
      </div>

      {/* Bottom Text */}
      <div className="text-center mt-6">
        <p className="text-xs text-gray-500">
          By submitting KYC, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}