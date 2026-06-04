"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Shield, Wallet, Zap, Lock, Smartphone, TrendingUp } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [recentUsers, setRecentUsers] = useState<Array<{name: string, mobile: string, earnings: number}>>([]);

  // Load recent users from localStorage (for demo)
  useEffect(() => {
    const storedUsers = localStorage.getItem("recentUsers");
    if (storedUsers) {
      setRecentUsers(JSON.parse(storedUsers));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate mobile number
      if (!/^[0-9]{10}$/.test(mobile)) {
        setError("Please enter a valid 10-digit mobile number");
        setLoading(false);
        return;
      }

      // Fetch user
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("id, full_name, mobile, password, balance, last_login, total_earnings, status")
        .eq("mobile", mobile.trim())
        .single();

      if (fetchError || !data) {
        setError("Invalid mobile number or password");
        setLoading(false);
        return;
      }

      // Check if account is active
      if (data.status !== "active") {
        setError("Account is deactivated. Please contact support.");
        setLoading(false);
        return;
      }

      // Verify password (In production, use proper hashing comparison)
      if (data.password !== password) {
        setError("Invalid mobile number or password");
        setLoading(false);
        return;
      }

      // Update last login
      await supabase
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", data.id);

      // Store user data (exclude password)
      const { password: _, ...userData } = data;
      localStorage.setItem("user", JSON.stringify(userData));
      
      // Save as recent user
      const userInfo = {
        name: data.full_name.split(" ")[0], // First name only
        mobile: data.mobile.substring(6), // Last 4 digits
        earnings: data.total_earnings || 0
      };
      
      const updatedRecentUsers = [
        userInfo,
        ...recentUsers.filter(u => u.mobile !== userInfo.mobile).slice(0, 2)
      ];
      setRecentUsers(updatedRecentUsers);
      localStorage.setItem("recentUsers", JSON.stringify(updatedRecentUsers));

      // Remember me functionality
      if (rememberMe) {
        localStorage.setItem("rememberedMobile", mobile);
      } else {
        localStorage.removeItem("rememberedMobile");
      }

      // Show success and redirect
      alert(`🎉 Welcome back, ${data.full_name.split(" ")[0]}! Current balance: ₹${data.balance}`);
      router.push("/dashboard");

    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (storedMobile: string) => {
    setMobile(storedMobile);
    document.getElementById("password")?.focus();
  };

  const handleForgotPassword = () => {
    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
      setError("Please enter your mobile number first");
      return;
    }
    router.push(`/reset-password?mobile=${mobile}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 px-4 py-6">
      <div className="w-full max-w-md bg-gradient-to-b from-[#111827] to-[#1e293b] p-6 sm:p-8 rounded-2xl text-white shadow-2xl border border-gray-800">
        
        {/* Header Section */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              DataSell Pro
            </h1>
          </div>
          
          <p className="text-sm text-cyan-300 font-semibold mb-1">
            🔥 Trusted by 50,000+ Active Users
          </p>
          
          <div className="inline-flex items-center bg-green-900/30 text-green-300 px-3 py-1 rounded-full text-xs font-medium border border-green-800/50 mb-4">
            <TrendingUp className="w-3 h-3 mr-1" />
            24x7 Instant Withdrawal Active
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4 mb-6">
            <div className="flex flex-col items-center p-2 bg-gray-800/40 rounded-lg">
              <div className="text-lg font-bold text-green-400">₹2.5Cr+</div>
              <span className="text-xs text-gray-300">Paid Out</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-gray-800/40 rounded-lg">
              <div className="text-lg font-bold text-blue-400">98%</div>
              <span className="text-xs text-gray-300">Success Rate</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-gray-800/40 rounded-lg">
              <div className="text-lg font-bold text-yellow-400">&lt;5min</div>
              <span className="text-xs text-gray-300">Payout Time</span>
            </div>
          </div>
        </div>

        {/* Auth Tabs */}
        <div className="flex mb-6 rounded-xl overflow-hidden border border-gray-700 bg-gray-900/50">
          <button
            disabled
            className="flex-1 py-3 text-center bg-gradient-to-r from-blue-600 to-cyan-500 font-semibold shadow-lg"
            type="button"
          >
            🔐 Secure Login
          </button>
          <button
            onClick={() => router.push("/register")}
            className="flex-1 py-3 text-center hover:bg-gray-800/50 transition-colors font-semibold text-gray-300"
            type="button"
          >
            ✨ New Account
          </button>
        </div>

        {/* Recent Users (Quick Login) */}
        {recentUsers.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-300 mb-2">Quick Login</p>
            <div className="flex flex-wrap gap-2">
              {recentUsers.map((user, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleQuickLogin(user.mobile.padStart(10, '0'))}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 hover:bg-gray-700/60 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center text-xs font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-gray-400">***{user.mobile} • Earned ₹{user.earnings}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Mobile Number */}
          <div>
            <label htmlFor="mobile" className="block mb-1 font-medium text-sm text-gray-200">
              <Smartphone className="inline w-4 h-4 mr-2" />
              Mobile Number
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 flex items-center">
                <span className="mr-1">🇮🇳</span> +91
              </div>
              <input
                id="mobile"
                type="tel"
                className="w-full bg-gray-900 border border-gray-700 pl-16 p-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="9876543210"
                value={mobile}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setMobile(value);
                }}
                required
                pattern="^[0-9]{10}$"
                autoComplete="tel"
                maxLength={10}
              />
            </div>
            <p className="text-gray-400 text-xs mt-1">Enter your registered mobile number</p>
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="password" className="font-medium text-sm text-gray-200">
                <Lock className="inline w-4 h-4 mr-2" />
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="w-full bg-gray-900 border border-gray-700 p-3 pr-10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                minLength={6}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="remember" className="ml-2 text-sm text-gray-300">
              Remember this device for 30 days
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg">
              <p className="text-red-300 text-sm text-center flex items-center justify-center">
                <Shield className="w-4 h-4 mr-2" />
                {error}
              </p>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 disabled:opacity-50 transition-all duration-300 rounded-lg py-3.5 font-bold text-lg shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Logging in...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <Zap className="w-5 h-5 mr-2" />
                Access My Account
              </span>
            )}
          </button>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 p-3 bg-gray-900/40 rounded-lg border border-gray-700">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-300">
              256-bit Encryption • RBI Compliant • Your Data is Safe
            </span>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">New to DataSell Pro?</span>
            </div>
          </div>

          {/* Create Account Button */}
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 transition-all duration-300 rounded-lg py-3.5 font-bold text-lg shadow-lg shadow-green-900/30 hover:shadow-green-900/50"
          >
            <span className="flex items-center justify-center">
              <Wallet className="w-5 h-5 mr-2" />
              Create Account & Get ₹10 Bonus
            </span>
          </button>

          {/* Login Benefits */}
          <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 p-4 rounded-xl border border-blue-800/30">
            <h4 className="font-semibold text-sm text-gray-200 mb-2">🌟 Login Benefits:</h4>
            <ul className="text-xs text-gray-300 space-y-1">
              <li className="flex items-center">
                <div className="w-1 h-1 bg-green-400 rounded-full mr-2"></div>
                Daily login bonus: ₹5 per day
              </li>
              <li className="flex items-center">
                <div className="w-1 h-1 bg-green-400 rounded-full mr-2"></div>
                Check your referral earnings
              </li>
              <li className="flex items-center">
                <div className="w-1 h-1 bg-green-400 rounded-full mr-2"></div>
                Instant withdrawal available 24/7
              </li>
              <li className="flex items-center">
                <div className="w-1 h-1 bg-green-400 rounded-full mr-2"></div>
                Access to exclusive high-paying offers
              </li>
            </ul>
          </div>

          {/* Testimonial */}
          <div className="text-center pt-4">
            <div className="inline-flex items-center gap-2 bg-gray-800/40 px-4 py-2 rounded-full">
              <div className="text-left">
                <p className="text-sm text-gray-300">"Withdrawn ₹15,000 in 30 days! Legit app!"</p>
                <p className="text-xs text-cyan-300">- Priya, Delhi</p>
              </div>
            </div>
          </div>
        </form>

        {/* Support Section */}
        <div className="mt-6 pt-4 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-400">
            Need help? <span className="text-blue-400 font-semibold">Call 1800-123-4567</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            24/7 Customer Support • Hindi/English/Tamil
          </p>
        </div>
      </div>
    </div>
  );
}