"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, User, Phone, Lock, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      setError("Enter valid 10-digit mobile number");
      return;
    }

    if (fullName.length < 3) {
      setError("Name must be at least 3 characters");
      return;
    }

    setLoading(true);

    try {
      // Check existing user
      const { data: existingUser } = await supabase
        .from("users")
        .select("mobile")
        .eq("mobile", mobile.trim())
        .single();

      if (existingUser) {
        setError("Mobile already registered. Please login.");
        setLoading(false);
        return;
      }

      // Insert user
      const { data: newUsers, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            full_name: fullName.trim(),
            mobile: mobile.trim(),
            password: password,
            created_at: new Date().toISOString(),
            balance: 100,
            kyc_verified: false,
            kyc_status: "not_submitted",
            status: "active",
            total_earnings: 0,
          },
        ])
        .select("*");

      if (insertError) {
        setError(insertError.message || "Registration failed");
        setLoading(false);
        return;
      }

      // Success
      setSuccess("Account created successfully!");
      setStep(2);

      const createdUser = newUsers?.[0];
      if (createdUser) {
        const { password: _password, ...userData } = createdUser;
        localStorage.setItem("user", JSON.stringify(userData));
      }
      
      // Store temp data
      localStorage.setItem("temp_user", JSON.stringify({
        mobile: mobile.trim(),
        registered: new Date().toISOString()
      }));

      // Auto redirect after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  // Step 1: Registration Form
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-md mx-auto pt-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <span className="text-white text-2xl font-bold">₹</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create Account
            </h1>
            <p className="text-gray-600">
              Start earning from your mobile data
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <form onSubmit={handleRegister} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Enter your full name"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <Phone size={18} />
                  </div>
                  <div className="absolute left-10 top-1/2 transform -translate-y-1/2">
                    <span className="text-gray-500">+91</span>
                  </div>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="98765 43210"
                    required
                    pattern="[0-9]{10}"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  We'll send OTP to this number
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Create a password"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 6 characters
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Re-enter your password"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirm && password !== confirm && (
                  <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-lg font-semibold text-white transition-all ${
                  loading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>

              {/* Login Link */}
              <div className="text-center pt-4 border-t border-gray-100">
                <p className="text-gray-600 text-sm">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="text-blue-600 font-semibold hover:underline"
                    disabled={loading}
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          </div>

          {/* Quick Benefits */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-blue-600 font-bold">₹100</div>
              <div className="text-xs text-gray-600">Signup Bonus</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-green-600 font-bold">24/7</div>
              <div className="text-xs text-gray-600">Support</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-purple-600 font-bold">100%</div>
              <div className="text-xs text-gray-600">Secure</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="text-orange-600 font-bold">Instant</div>
              <div className="text-xs text-gray-600">Earnings</div>
            </div>
          </div>

          {/* Security Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              🔒 Your data is 100% secure. We never share your information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Success Screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Account Created Successfully!
          </h2>
          
          <p className="text-gray-600 mb-6">
            Welcome to DataSell Pro! Opening your dashboard now.
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">Mobile:</span> {mobile}
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-semibold">Name:</span> {fullName}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>₹100 signup bonus credited</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Access to premium offers</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>24/7 customer support</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="text-sm text-gray-500 mb-4">
              Redirecting to dashboard...
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
