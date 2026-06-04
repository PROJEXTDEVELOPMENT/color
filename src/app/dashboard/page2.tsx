// app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Wallet, History, UserCheck, LogOut, Wifi, Zap, TrendingUp, Database, Shield, CreditCard, ArrowUpRight, Users, BarChart3, Rocket, Activity, CheckCircle, AlertCircle, Home, Bell, Settings } from "lucide-react";

type StoredUser = {
  id?: string;
  mobile?: string;
  email?: string;
  full_name?: string;
};

type UserProfile = {
  id: string;
  mobile: string;
  full_name?: string;
  balance: number;
  operator?: string;
  kyc_verified?: boolean;
  kyc_status?: 'pending' | 'verified' | 'rejected' | 'not_submitted';
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [usersCount] = useState<number>(860); // Fixed count for demo
  const [savingToDB, setSavingToDB] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [lastSavedAmount, setLastSavedAmount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Data selling simulation state
  const [selling, setSelling] = useState(false);
  const [mbSold, setMbSold] = useState<number>(0);
  const [moneyEarned, setMoneyEarned] = useState<number>(0);
  const [netSpeed, setNetSpeed] = useState<number>(0);
  const [totalEarningsToday, setTotalEarningsToday] = useState<number>(0);
  const intervalRef = useRef<number | null>(null);

  // Rate per MB (₹)
  const RATE_PER_MB = 0.25;

  // Initialize and load user data - FROM YOUR ORIGINAL WITHDRAWAL PAGE LOGIC
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Check localStorage for custom login - FROM YOUR ORIGINAL CODE
        const raw = localStorage.getItem("user");
        if (raw) {
          const parsed: StoredUser = JSON.parse(raw);
          setStoredUser(parsed);
          await loadUserProfile(parsed);
          setLoading(false);
          return;
        }

        // If not in localStorage, check Supabase auth - FROM YOUR ORIGINAL CODE
        const { data } = await supabase.auth.getUser();
        const authUser = data?.user;
        
        if (authUser) {
          // Fetch user from database using auth user's id
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (error) {
            console.error('Error fetching user:', error);
            router.replace("/login");
            return;
          }

          const parsed: StoredUser = {
            id: userData.id,
            mobile: userData.mobile,
            full_name: userData.full_name
          };
          setStoredUser(parsed);
          await loadUserProfile(parsed);
        } else {
          router.replace("/login");
        }
      } catch (err) {
        console.error("Dashboard init error:", err);
        setLoading(false);
      }
    };

    initializeDashboard();

    return () => {
      stopSellingInterval();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Load user profile from database using mobile number - FROM YOUR ORIGINAL WITHDRAWAL PAGE LOGIC
  async function loadUserProfile(user: StoredUser) {
    if (!user) return;
    
    try {
      let query = supabase.from("users").select("*");
      
      // Use mobile as primary identifier (as per your table structure)
      if (user.mobile) {
        query = query.eq("mobile", user.mobile);
      } else if (user.id) {
        query = query.eq("id", user.id);
      } else if (user.email) {
        query = query.eq("email", user.email);
      }
      
      const { data, error } = await query.single();
      
      if (error) {
        console.error("Error loading user profile:", error);
        setLoading(false);
        return;
      }

      if (data) {
        const userProfile: UserProfile = {
          id: data.id,
          mobile: data.mobile,
          full_name: data.full_name,
          balance: Number(data.balance) || 0,
          operator: data.operator,
          kyc_verified: data.kyc_verified || false,
          kyc_status: data.kyc_status || 'not_submitted'
        };
        
        setProfile(userProfile);
      }
    } catch (err) {
      console.error("loadUserProfile error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Update operator in database
  async function changeOperator(op: string) {
    if (!storedUser || !profile) return;
    
    // Update local state
    setProfile(prev => prev ? { ...prev, operator: op } : null);
    
    try {
      // Update in database - using mobile as identifier (from your original logic)
      const { error: updateError } = await supabase
        .from("users")
        .update({ 
          operator: op,
          updated_at: new Date().toISOString()
        })
        .eq("mobile", profile.mobile);

      if (updateError) {
        console.warn("update operator error:", updateError);
      }
    } catch (err) {
      console.warn("update operator err", err);
    }
  }

  // Save earned money to database - FIXED VERSION
  async function saveEarningsToDB(earnedAmount: number) {
    if (!profile || earnedAmount <= 0) {
      setErrorMessage("Invalid amount to save");
      return;
    }
    
    setSavingToDB(true);
    setErrorMessage(null);
    
    try {
      // First, get the current user data to ensure we have the latest balance
      const { data: currentUser, error: fetchError } = await supabase
        .from("users")
        .select("balance")
        .eq("mobile", profile.mobile)
        .single();

      if (fetchError) {
        console.error("Error fetching current balance:", fetchError);
        setErrorMessage("Failed to fetch current balance");
        throw fetchError;
      }

      const currentBalance = Number(currentUser?.balance) || 0;
      const newBalance = parseFloat((currentBalance + earnedAmount).toFixed(2));
      
      console.log("Current balance:", currentBalance);
      console.log("Earned amount:", earnedAmount);
      console.log("New balance:", newBalance);
      
      // Update balance in database (using mobile as identifier)
      const { error: updateError, data: updatedData } = await supabase
        .from("users")
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq("mobile", profile.mobile)
        .select()
        .single();

      if (updateError) {
        console.error("Update error details:", updateError);
        setErrorMessage(`Failed to update balance: ${updateError.message}`);
        throw updateError;
      }
      
      console.log("Update successful, updated data:", updatedData);
      
      // Update local state with the new balance
      setProfile(prev => prev ? { ...prev, balance: newBalance } : null);
      setLastSavedAmount(earnedAmount);
      setTotalEarningsToday(prev => parseFloat((prev + earnedAmount).toFixed(2)));
      
      // Show success notification
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
      
      console.log(`💰 Saved ₹${earnedAmount.toFixed(2)} to DB. New balance: ₹${newBalance.toFixed(2)}`);
      
      // Create a transaction record for tracking
      try {
        await supabase
          .from("transactions")
          .insert({
            user_id: profile.id,
            user_mobile: profile.mobile,
            type: 'data_sell',
            amount: earnedAmount,
            description: 'Earnings from data selling',
            status: 'completed',
            created_at: new Date().toISOString()
          });
      } catch (transactionErr) {
        console.warn("Could not create transaction record:", transactionErr);
        // Don't throw here, as the main update was successful
      }
      
    } catch (err: any) {
      console.error("Error saving earnings to DB:", err);
      setErrorMessage(err.message || "Failed to save earnings to database");
      
      // Show error alert to user
      alert(`❌ Error saving earnings: ${err.message || "Unknown error"}`);
    } finally {
      setSavingToDB(false);
    }
  }

  // Start selling simulation
  function startSelling() {
    if (selling) return;
    
    setSelling(true);
    setMbSold(0);
    setMoneyEarned(0);
    setNetSpeed(45); // Start with moderate speed

    intervalRef.current = window.setInterval(() => {
      // Realistic network speed variations
      const speedVariation = Math.random() * 30 - 15; // -15 to +15
      const newSpeed = Math.max(20, Math.min(120, netSpeed + speedVariation));
      setNetSpeed(parseFloat(newSpeed.toFixed(2)));

      // Calculate MB sold based on speed (MB/s = Mbps ÷ 8)
      const mbThisTick = parseFloat((newSpeed / 8).toFixed(3));
      
      setMbSold((m) => {
        const next = parseFloat((m + mbThisTick).toFixed(3));
        // Calculate money earned
        const earned = parseFloat((next * RATE_PER_MB).toFixed(2));
        setMoneyEarned(earned);
        return next;
      });
    }, 1000);
  }

  // Stop selling and save earnings to database
  async function stopSellingAndSave() {
    stopSellingInterval();
    setSelling(false);
    
    // Save earnings to database
    if (moneyEarned > 0) {
      await saveEarningsToDB(moneyEarned);
    }
    
    // Reset counters
    setMbSold(0);
    setMoneyEarned(0);
    setNetSpeed(0);
  }

  // Stop selling without saving
  function pauseSelling() {
    stopSellingInterval();
    setSelling(false);
    setNetSpeed(0);
  }

  function stopSellingInterval() {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  // Handle withdraw button click - REDIRECTS TO WITHDRAW PAGE
  function handleWithdraw() {
    router.push("/dashboard/withdraw");
  }

  // Handle KYC button click
  function handleKYC() {
    router.push("/dashboard/kyc");
  }

  // Handle transaction history
  function handleHistory() {
    router.push("/dashboard/history");
  }

  // Handle settings
  function handleSettings() {
    router.push("/dashboard/settings");
  }

  // Logout function
  async function handleLogout() {
    try {
      localStorage.removeItem("user");
      await supabase.auth.signOut();
    } catch (err) {
      console.warn(err);
    } finally {
      router.replace("/login");
    }
  }

  // Calculate earnings per second for display
  const earningsPerSecond = useMemo(() => {
    if (!selling || netSpeed === 0) return 0;
    // Calculate based on current MB sold and rate
    return parseFloat(((netSpeed / 8) * RATE_PER_MB).toFixed(2));
  }, [selling, netSpeed]);

  // Calculate estimated daily earnings
  const estimatedDailyEarnings = useMemo(() => {
    if (!selling) return 0;
    return parseFloat((earningsPerSecond * 60 * 60 * 8).toFixed(2)); // 8 hours
  }, [selling, earningsPerSecond]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-300">Loading dashboard...</p>
      </div>
    </div>
  );

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">User Not Found</h2>
          <p className="text-gray-300 mb-6">Unable to load your profile. Please login again.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 rounded-lg font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 pb-32">
      {/* Success Notification */}
      {showSaveSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-3 rounded-xl shadow-lg shadow-green-500/30 flex items-center gap-3">
            <CheckCircle size={20} />
            <span className="font-medium">₹{lastSavedAmount.toFixed(2)} added to your wallet!</span>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-gradient-to-r from-red-600 to-pink-700 px-6 py-3 rounded-xl shadow-lg shadow-red-500/30 flex items-center gap-3">
            <AlertCircle size={20} />
            <span className="font-medium">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Header with User Info */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="rounded-full bg-gradient-to-br from-[#0f5087] to-[#0a9bd8] w-12 h-12 flex items-center justify-center">
              <span className="font-bold text-lg">
                {profile?.full_name?.charAt(0) || "U"}
              </span>
            </div>
            {profile?.kyc_status === 'verified' && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <Shield size={10} className="text-white" />
              </div>
            )}
          </div>
          <div>
            <div className="text-lg font-bold">{profile?.full_name || "User"}</div>
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              ID: {profile?.id?.substring(0, 8)}...
            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1 p-2.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors active:scale-95"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Live Users Count */}
      <div className="bg-gradient-to-r from-[#0b4b66] to-[#155a83] p-5 rounded-xl mb-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold mb-1">{usersCount.toLocaleString()}</div>
            <div className="text-sm text-gray-200">
              Active Users Selling Data
            </div>
          </div>
          <div className="relative">
            <div className="bg-blue-900/30 p-3 rounded-full">
              <Users size={24} className="text-blue-300" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-xs font-bold">LIVE</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <TrendingUp size={12} className="text-green-400" />
          <span className="text-green-400">High demand for data today</span>
        </div>
      </div>

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-r from-[#14a0f0] to-[#29d2ff] p-5 rounded-xl text-black mb-5 relative shadow-lg shadow-blue-500/20">
        <div className="absolute top-4 right-4">
          <div className="bg-black/20 p-2 rounded-lg">
            <Wallet size={20} />
          </div>
        </div>
        
        <div className="mb-4">
          <div className="text-lg font-semibold mb-1">Wallet Balance</div>
          <div className="text-4xl font-bold flex items-baseline">
            ₹{profile?.balance.toFixed(2)}
            {selling && (
              <span className="ml-3 text-lg text-green-800 font-bold animate-pulse">
                +₹{moneyEarned.toFixed(2)}
              </span>
            )}
          </div>
          {profile?.mobile && (
            <div className="text-sm opacity-80 mt-2">
              Mobile: {profile.mobile}
            </div>
          )}
        </div>
        
        {/* Withdraw Button - REDIRECTS TO WITHDRAW PAGE */}
        <div className="flex gap-3">
          <button
            onClick={handleWithdraw}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-900 active:scale-95 transition-all duration-200 shadow-lg"
          >
            <CreditCard size={18} />
            <span>Withdraw Money</span>
            <ArrowUpRight size={16} />
          </button>
          
          {savingToDB && (
            <div className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg">
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Saving...</span>
            </div>
          )}
        </div>
        
        {/* KYC Status */}
        {profile?.kyc_status !== 'verified' && (
          <div className="mt-3 p-2 bg-red-500/20 rounded-lg border border-red-500/30">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} />
              <span className="text-xs font-medium">Complete KYC to withdraw money</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[#0b1b23] p-4 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-green-400" />
            <span className="text-sm text-gray-400">Today's Earnings</span>
          </div>
          <div className="text-xl font-bold">₹{totalEarningsToday.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">From data selling</div>
        </div>
        
        <div className="bg-[#0b1b23] p-4 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={16} className="text-blue-400" />
            <span className="text-sm text-gray-400">Est. Daily</span>
          </div>
          <div className="text-xl font-bold">₹{estimatedDailyEarnings.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">If selling continues</div>
        </div>
      </div>

      {/* Operator Selection */}
      <div className="bg-[#0b1b23] p-4 rounded-xl mb-5 border border-gray-800">
        <div className="mb-3 font-semibold flex items-center gap-2">
          <Wifi size={18} className="text-blue-400" />
          Select Network Operator
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: "Jio", color: "from-red-500 to-pink-600" },
            { name: "Airtel", color: "from-red-600 to-orange-600" },
            { name: "Vi", color: "from-purple-500 to-pink-500" },
            { name: "BSNL", color: "from-yellow-500 to-orange-500" },
            { name: "WiFi", color: "from-blue-500 to-cyan-500" },
            { name: "Other", color: "from-gray-600 to-gray-700" }
          ].map((op) => (
            <button
              key={op.name}
              onClick={() => changeOperator(op.name)}
              className={`py-3 px-2 rounded-lg transition-all duration-200 active:scale-95 ${
                profile?.operator === op.name
                  ? `bg-gradient-to-r ${op.color} text-white shadow-lg`
                  : "bg-gray-900 border border-gray-800 hover:border-gray-700"
              }`}
            >
              <div className="text-center text-sm font-medium">{op.name}</div>
            </button>
          ))}
        </div>
        {profile?.operator && (
          <div className="mt-3 text-sm text-center text-gray-400">
            Current: <span className="text-blue-400 font-medium">{profile.operator}</span>
          </div>
        )}
      </div>

      {/* Data Selling Control Panel */}
      <div className="bg-[#0b1b23] p-5 rounded-xl border border-gray-800">
        <div className="mb-5">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Rocket size={22} className="text-yellow-400" />
            Data Selling Control Panel
          </h3>
          <p className="text-sm text-gray-400">
            Start selling your unused data to earn money instantly
          </p>
        </div>

        {/* Network Speed Gauge */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-400" />
              <span className="text-sm font-medium">Network Speed</span>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${selling ? "animate-pulse text-green-400" : "text-gray-300"}`}>
                {netSpeed.toFixed(0)} Mbps
              </div>
              <div className={`text-xs ${selling ? "text-green-400 font-medium" : "text-gray-500"}`}>
                {selling ? "ACTIVE • HIGH SPEED" : "READY TO START"}
              </div>
            </div>
          </div>
          
          {/* Speed Progress Bar */}
          <div className="w-full h-2 bg-gray-800 rounded-full mb-1 overflow-hidden">
            <div
              style={{ width: `${Math.min(100, (netSpeed / 120) * 100)}%` }}
              className="h-2 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 transition-all duration-300"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>0 Mbps</span>
            <span>60 Mbps</span>
            <span>120 Mbps</span>
          </div>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#081316] p-4 rounded-xl border border-gray-800">
            <div className="text-xs text-gray-400 mb-2">DATA SOLD</div>
            <div className="text-2xl font-bold flex items-center gap-2">
              {mbSold.toFixed(2)} MB
              {selling && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              ≈ {Math.round(mbSold / 1024)} GB
            </div>
          </div>
          
          <div className="bg-[#081316] p-4 rounded-xl border border-gray-800">
            <div className="text-xs text-gray-400 mb-2">EARNINGS</div>
            <div className="text-2xl font-bold text-green-400">
              ₹{moneyEarned.toFixed(2)}
            </div>
            {selling && (
              <div className="text-xs text-green-300 mt-2 font-medium animate-pulse">
                +₹{earningsPerSecond.toFixed(2)}/sec
              </div>
            )}
          </div>
        </div>

        {/* Rate Information */}
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 p-4 rounded-xl mb-6 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Current Rate</div>
              <div className="text-xs text-gray-400">Per 100MB</div>
            </div>
            <div className="text-xl font-bold text-yellow-400">₹25.00</div>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Rate: ₹{RATE_PER_MB.toFixed(2)} per MB • Updated: Today
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!selling ? (
            <button
              onClick={startSelling}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold text-lg active:scale-95 transition-all duration-200 shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
              disabled={savingToDB}
            >
              <div className="flex items-center justify-center gap-2">
                <Rocket size={20} />
                START SELLING DATA
              </div>
            </button>
          ) : (
            <>
              <button
                onClick={stopSellingAndSave}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl font-bold text-lg active:scale-95 transition-all duration-200 shadow-lg shadow-red-500/20 animate-pulse"
              >
                <div className="flex items-center justify-center gap-2">
                  <Wallet size={20} />
                  SAVE ₹{moneyEarned.toFixed(2)} TO WALLET
                </div>
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={pauseSelling}
                  className="py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium active:scale-95 transition-all"
                >
                  PAUSE
                </button>
                <button
                  onClick={startSelling}
                  className="py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-medium active:scale-95 transition-all"
                >
                  MAX SPEED
                </button>
              </div>
            </>
          )}
        </div>

        {/* Database Status */}
        <div className="mt-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-blue-400" />
              <span className="text-sm text-gray-400">Database Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-400 font-medium">Active</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            All earnings are securely saved to cloud database in real-time
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-800 p-3 backdrop-blur-lg">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex flex-col items-center p-2"
          >
            <Home size={20} className="text-blue-400" />
            <span className="text-xs mt-1">Home</span>
          </button>
          
          <button
            onClick={handleHistory}
            className="flex flex-col items-center p-2"
          >
            <History size={20} className="text-gray-400" />
            <span className="text-xs mt-1">History</span>
          </button>
          
          <div className="relative">
            <div className="flex flex-col items-center">
              <div className="text-xs text-gray-400">Balance</div>
              <div className="text-sm font-bold">₹{profile?.balance.toFixed(2)}</div>
            </div>
          </div>
          
          <button
            onClick={handleKYC}
            className="flex flex-col items-center p-2"
          >
            <UserCheck size={20} className={profile?.kyc_status === 'verified' ? 'text-green-400' : 'text-yellow-400'} />
            <span className="text-xs mt-1">KYC</span>
          </button>
          
          <button
            onClick={handleWithdraw}
            className="flex flex-col items-center p-2"
          >
            <CreditCard size={20} className="text-green-400" />
            <span className="text-xs mt-1">Withdraw</span>
          </button>
        </div>
        
        {/* Live Earning Indicator */}
        {selling && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-4 py-1 rounded-full text-xs font-medium animate-pulse flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              LIVE: +₹{earningsPerSecond.toFixed(2)}/sec
            </div>
          </div>
        )}
      </div>

      {/* Add custom animation for slide down */}
      <style jsx>{`
        @keyframes slide-down {
          0% {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}