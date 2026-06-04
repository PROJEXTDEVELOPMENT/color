"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError("");

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("mobile", mobile.trim())
      .eq("password", password)
      .single();

    if (!data) {
      setError("Invalid mobile number or password");
      return;
    }

    localStorage.setItem("user", JSON.stringify(data));
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 py-10">
      <div className="w-full max-w-md bg-[#111827] p-8 rounded-xl text-white shadow-lg">
        <h2 className="text-center text-3xl font-extrabold mb-2">Data Sell Pro</h2>
        <p className="text-center text-gray-400 mb-8 text-sm sm:text-base">
          Turn your mobile data into money
        </p>

        <div className="flex mb-8 rounded-full overflow-hidden border border-gray-700">
          <button
            disabled
            className="flex-1 py-3 text-center bg-blue-600 cursor-default font-semibold"
            aria-current="page"
            type="button"
          >
            Login
          </button>
          <button
            onClick={() => router.push("/register")}
            className="flex-1 py-3 text-center bg-gray-700 hover:bg-gray-600 transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
            aria-label="Go to register page"
            type="button"
          >
            Register
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="mobile" className="block mb-1 font-medium text-sm">
              Mobile Number
            </label>
            <input
              id="mobile"
              type="tel"
              className="w-full bg-black p-3 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Enter your mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
              pattern="^[0-9]{10,15}$"
              title="Please enter a valid mobile number"
              autoComplete="tel"
            />
          </div>

          <div>
            <label htmlFor="password" className="block mb-1 font-medium text-sm">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full bg-black p-3 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-red-500 font-semibold text-sm text-center" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 transition-colors rounded-md py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
