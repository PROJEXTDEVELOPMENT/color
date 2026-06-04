"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Phone, Lock, LogIn, AlertCircle, Smartphone } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Fix for localStorage - only run on client
  useEffect(() => {
    setIsClient(true);
    
    // Check for remembered user only on client
    if (typeof window !== "undefined") {
      const remembered = localStorage.getItem("remembered_user");
      if (remembered) {
        try {
          const user = JSON.parse(remembered);
          setMobile(user.mobile);
          setRememberMe(true);
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!/^\d{10}$/.test(mobile)) {
      setError("Enter valid 10-digit mobile number");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { data, error: supabaseError } = await supabase
        .from("users")
        .select("*")
        .eq("mobile", mobile.trim())
        .eq("password", password)
        .single();

      if (supabaseError || !data) {
        setError("Invalid mobile number or password");
        setLoading(false);
        return;
      }

      if (data.status && data.status !== "active") {
        setError("Account is deactivated. Please contact support.");
        setLoading(false);
        return;
      }

      const { password: _password, ...userData } = data;

      await supabase
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("mobile", mobile.trim());

      // Store user in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Remember me functionality
        if (rememberMe) {
          localStorage.setItem("remembered_user", JSON.stringify({
            mobile: mobile.trim(),
            timestamp: new Date().toISOString()
          }));
        } else {
          localStorage.removeItem("remembered_user");
        }
      }

      // Redirect to dashboard
      router.push("/dashboard");

    } catch (err: any) {
      setError("Login failed. Please try again.");
      setLoading(false);
    }
  };

  // Don't render until client-side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full mb-4">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">
            Sign in to continue earning
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          {/* Login/Register Tabs */}
          <div className="flex mb-6 border-b border-gray-200">
            <button
              className="flex-1 py-3 text-center font-semibold border-b-2 border-blue-600 text-blue-600"
            >
              Login
            </button>
            <button
              onClick={() => router.push("/register")}
              className="flex-1 py-3 text-center font-semibold text-gray-500 hover:text-gray-700 transition-colors"
              disabled={loading}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

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
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  disabled={loading}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <label htmlFor="remember" className="text-sm text-gray-600">
                  Remember me
                </label>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] shadow-md hover:shadow-lg'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to DataSell Pro?</span>
              </div>
            </div>

            {/* Register Button */}
            <button
              type="button"
              onClick={() => router.push("/register")}
              disabled={loading}
              className="w-full py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors active:scale-[0.98]"
            >
              Create New Account
            </button>
          </form>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-blue-600 font-bold text-sm">50K+</div>
            <div className="text-xs text-gray-600">Users</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-green-600 font-bold text-sm">₹2.5Cr+</div>
            <div className="text-xs text-gray-600">Paid</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-purple-600 font-bold text-sm">4.9★</div>
            <div className="text-xs text-gray-600">Rating</div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                R
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                ))}
              </div>
              <p className="text-sm text-gray-700 italic">
                "Earned ₹8,500 last month. Best platform for side income!"
              </p>
              <p className="text-xs text-gray-500 mt-1 font-medium">
                - Rahul, Student
              </p>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            🔒 Your login is secured with end-to-end encryption
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Need help? WhatsApp: +91 98765 43210
          </p>
        </div>
      </div>
    </div>
  );
}
