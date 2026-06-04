// app/dashboard/page.tsx
"use client";
export const dynamic = "force-dynamic";
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

type WithdrawalPopup = {
  name: string;
  amount: number;
  method: string;
  time: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [usersCount] = useState<number>(860);
  const [savingToDB, setSavingToDB] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [lastSavedAmount, setLastSavedAmount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Data selling simulation state
  const [selling, setSelling] = useState(false);
  const [mbSold, setMbSold] = useState<number>(0);
  const [moneyEarned, setMoneyEarned] = useState<number>(0);
  const [netSpeed, setNetSpeed] = useState<number>(0);
  const [speedHistory, setSpeedHistory] = useState<number[]>(Array(24).fill(0));
  const [totalEarningsToday, setTotalEarningsToday] = useState<number>(0);
  const intervalRef = useRef<number | null>(null);

  // Withdrawal notifications popup
  const [withdrawalPopups, setWithdrawalPopups] = useState<WithdrawalPopup[]>([]);
  const [currentPopupIndex, setCurrentPopupIndex] = useState(0);
  const [showPopup, setShowPopup] = useState(true);

  // Rate per MB (₹)
  const RATE_PER_MB = 0.25;

  // Indian names for withdrawal notifications
  const indianNames = [
    "Raj Kumar", "Priya Sharma", "Amit Patel", "Deepika Singh", "Rahul Verma", 
    "Anjali Gupta", "Vikram Joshi", "Sneha Reddy", "Karan Malhotra", "Pooja Mehta",
    "Rohit Nair", "Neha Choudhary", "Sanjay Mishra", "Divya Kapoor", "Arun Tiwari",
    "Mona Desai", "Vishal Yadav", "Kavita Srinivasan", "Alok Bansal", "Swati Rajput"
  ];

  const withdrawalMethods = ["UPI", "Paytm", "Google Pay", "PhonePe", "Bank Transfer", "UPI"];
  const withdrawalAmounts = [1499, 2499, 3499, 4999, 7999, 9999, 12999, 14999, 19999, 24999];

  // Initialize withdrawal popups
  useEffect(() => {
    const popups: WithdrawalPopup[] = [];
    for (let i = 0; i < 7; i++) {
      const name = indianNames[Math.floor(Math.random() * indianNames.length)];
      const amount = withdrawalAmounts[Math.floor(Math.random() * withdrawalAmounts.length)];
      const method = withdrawalMethods[Math.floor(Math.random() * withdrawalMethods.length)];
      const time = `${Math.floor(Math.random() * 5) + 1} min ago`;
      
      popups.push({ name, amount, method, time });
    }
    setWithdrawalPopups(popups);
  }, []);

  // Rotate through withdrawal popups
  useEffect(() => {
    const popupInterval = setInterval(() => {
      setShowPopup(false);
      setTimeout(() => {
        setCurrentPopupIndex((prev) => (prev + 1) % withdrawalPopups.length);
        setShowPopup(true);
      }, 300);
    }, 4000);

    return () => clearInterval(popupInterval);
  }, [withdrawalPopups.length]);

  // Initialize and load user data
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Try localStorage first (custom login)
        const raw = localStorage.getItem("user");
        if (raw) {
          const parsed: StoredUser = JSON.parse(raw);
          setStoredUser(parsed);
          await loadProfile(parsed);
          setLoading(false);
          return;
        }

        // Fallback to Supabase Auth
        const { data } = await supabase.auth.getUser();
        const authUser = data?.user;
        if (authUser) {
          const parsed: StoredUser = { 
            id: authUser.id, 
            email: authUser.email ?? undefined 
          };
          setStoredUser(parsed);
          await loadProfile(parsed);
          setLoading(false);
          return;
        }

        // Not logged in → redirect
        router.replace("/login");
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
  }, []);

  // Load user profile from database
  async function loadProfile(user: StoredUser) {
    if (!user) return;
    
    try {
      let query = supabase.from("users").select("*");
      
      if (user.id) {
        query = query.eq("id", user.id);
      } else if (user.mobile) {
        query = query.eq("mobile", user.mobile);
      } else if (user.email) {
        query = query.eq("email", user.email);
      }
      
      const { data, error } = await query.single();
      
      if (!error && data) {
        const userProfile: UserProfile = {
          id: data.id,
          mobile: data.mobile,
          full_name: data.full_name,
          balance: Number(data.balance ?? 0),
          operator: data.operator,
          kyc_verified: data.kyc_verified || false,
          kyc_status: data.kyc_status || 'not_submitted'
        };
        
        setProfile(userProfile);
      } else {
        // Create new profile if doesn't exist
        if (user.email || user.mobile) {
          const { data: newUser } = await supabase
            .from("users")
            .upsert({
              email: user.email,
              mobile: user.mobile,
              balance: 0,
              kyc_status: 'not_submitted',
              created_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (newUser) {
            const userProfile: UserProfile = {
              id: newUser.id,
              mobile: newUser.mobile,
              full_name: newUser.full_name,
              balance: 0,
              operator: newUser.operator,
              kyc_verified: newUser.kyc_verified || false,
              kyc_status: newUser.kyc_status || 'not_submitted'
            };
            setProfile(userProfile);
          }
        }
      }
    } catch (err) {
      console.error("loadProfile error", err);
    }
  }

  // Update operator in database
  async function changeOperator(op: string) {
    if (!storedUser) return;
    
    setProfile((p) => (p ? { ...p, operator: op } : null));
    
    try {
      let updateQuery = supabase.from("users").update({ operator: op });
      
      if (storedUser.id) {
        updateQuery = updateQuery.eq("id", storedUser.id);
      } else if (storedUser.mobile) {
        updateQuery = updateQuery.eq("mobile", storedUser.mobile);
      } else if (storedUser.email) {
        updateQuery = updateQuery.eq("email", storedUser.email);
      }
      
      await updateQuery;
    } catch (err) {
      console.warn("update operator err", err);
    }
  }

  // Save earned money to database
  async function saveEarningsToDB(earnedAmount: number) {
    if (!storedUser || earnedAmount <= 0) {
      setErrorMessage("Invalid amount to save");
      return;
    }
    
    setSavingToDB(true);
    setErrorMessage(null);
    
    try {
      let selectQuery = supabase.from("users").select("balance");
      
      if (storedUser.id) {
        selectQuery = selectQuery.eq("id", storedUser.id);
      } else if (storedUser.mobile) {
        selectQuery = selectQuery.eq("mobile", storedUser.mobile);
      } else if (storedUser.email) {
        selectQuery = selectQuery.eq("email", storedUser.email);
      }
      
      const { data: currentData, error: selectError } = await selectQuery.single();
      
      if (selectError) {
        console.error("Error fetching current balance:", selectError);
        setErrorMessage("Failed to fetch current balance");
        throw selectError;
      }
      
      const currentBalance = Number(currentData?.balance ?? 0);
      const newBalance = parseFloat((currentBalance + earnedAmount).toFixed(2));
      
      let updateQuery = supabase.from("users").update({ balance: newBalance });
      
      if (storedUser.id) {
        updateQuery = updateQuery.eq("id", storedUser.id);
      } else if (storedUser.mobile) {
        updateQuery = updateQuery.eq("mobile", storedUser.mobile);
      } else if (storedUser.email) {
        updateQuery = updateQuery.eq("email", storedUser.email);
      }
      
      const { error: updateError, data: updatedData } = await updateQuery.select().single();
      
      if (updateError) {
        console.error("Update error details:", updateError);
        setErrorMessage(`Failed to update balance: ${updateError.message}`);
        throw updateError;
      }
      
      setProfile((p) => (p ? { ...p, balance: newBalance } : { 
        id: storedUser.id || '',
        mobile: storedUser.mobile || '',
        full_name: storedUser.full_name,
        balance: newBalance,
        kyc_status: 'not_submitted'
      }));
      
      setLastSavedAmount(earnedAmount);
      setTotalEarningsToday(prev => parseFloat((prev + earnedAmount).toFixed(2)));
      
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
      
      try {
        await supabase
          .from("transactions")
          .insert({
            user_id: storedUser.id || profile?.id,
            user_mobile: storedUser.mobile || profile?.mobile,
            type: 'data_sell',
            amount: earnedAmount,
            description: 'Earnings from data selling',
            status: 'completed',
            created_at: new Date().toISOString()
          });
      } catch (transactionErr) {
        console.warn("Could not create transaction record:", transactionErr);
      }
      
    } catch (err: any) {
      console.error("Error saving earnings to DB:", err);
      setErrorMessage(err.message || "Failed to save earnings to database");
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
    setNetSpeed(45);
    setSpeedHistory(Array(23).fill(0).concat(45));

    intervalRef.current = window.setInterval(() => {
      setNetSpeed((previousSpeed) => {
        const speedVariation = Math.random() * 30 - 15;
        const nextSpeed = parseFloat(
          Math.max(20, Math.min(120, previousSpeed + speedVariation)).toFixed(2)
        );

        setSpeedHistory((history) => [...history.slice(-23), nextSpeed]);

        const mbThisTick = parseFloat((nextSpeed / 16).toFixed(3));
        setMbSold((m) => {
          const next = parseFloat((m + mbThisTick).toFixed(3));
          const earned = parseFloat((next * RATE_PER_MB).toFixed(2));
          setMoneyEarned(earned);
          return next;
        });

        return nextSpeed;
      });
    }, 1000);
  }

  // Stop selling and save earnings to database
  async function stopSellingAndSave() {
    stopSellingInterval();
    setSelling(false);
    
    if (moneyEarned > 0) {
      await saveEarningsToDB(moneyEarned);
    }
    
    setMbSold(0);
    setMoneyEarned(0);
    setNetSpeed(0);
    setSpeedHistory(Array(24).fill(0));
  }

  // Stop selling without saving
  function pauseSelling() {
    stopSellingInterval();
    setSelling(false);
    setNetSpeed(0);
    setSpeedHistory(Array(24).fill(0));
  }

  function stopSellingInterval() {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  // Handle withdraw button click
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
    return parseFloat(((netSpeed / 16) * RATE_PER_MB).toFixed(2));
  }, [selling, netSpeed]);

  // Calculate estimated daily earnings
  const estimatedDailyEarnings = useMemo(() => {
    if (!selling) return 0;
    return parseFloat((earningsPerSecond * 60 * 60 * 8).toFixed(2));
  }, [selling, earningsPerSecond]);

  const speedGraphPath = useMemo(() => {
    const width = 320;
    const height = 84;
    const maxSpeed = 120;
    const points = speedHistory.map((speed, index) => {
      const x = (index / Math.max(speedHistory.length - 1, 1)) * width;
      const y = height - (Math.min(speed, maxSpeed) / maxSpeed) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return points.length ? `M ${points.join(" L ")}` : "";
  }, [speedHistory]);

  const speedGraphAreaPath = useMemo(() => {
    if (!speedGraphPath) return "";
    return `${speedGraphPath} L 320,84 L 0,84 Z`;
  }, [speedGraphPath]);

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

      {/* Header - Mobile Optimized */}
      <div className="flex items-center justify-between mb-6">
        {/* Website Name */}
        <div className="flex items-center">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              DataMoney
            </h1>
            <p className="text-xs text-gray-400">Earn from your data</p>
          </div>
        </div>

        {/* Header Icons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleWithdraw}
            className="p-2 bg-green-600/20 rounded-lg hover:bg-green-600/30 transition-colors relative"
          >
            <CreditCard size={20} className="text-green-400" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </button>
          
          <button
            onClick={handleKYC}
            className={`p-2 rounded-lg transition-colors relative ${
              profile.kyc_status === 'verified' 
                ? 'bg-green-600/20 hover:bg-green-600/30' 
                : 'bg-yellow-600/20 hover:bg-yellow-600/30'
            }`}
          >
            <UserCheck size={20} className={
              profile.kyc_status === 'verified' ? 'text-green-400' : 'text-yellow-400'
            } />
            {profile.kyc_status !== 'verified' && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            )}
          </button>
        </div>
      </div>

      {/* Withdrawal Notifications Popup - Green Psychology Attractive */}
      {withdrawalPopups.length > 0 && showPopup && (
        <div className={`mb-4 ${showPopup ? 'animate-slide-in-right' : 'animate-slide-out-right'}`}>
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-600/10 border-l-4 border-green-500 p-3 rounded-r-lg shadow-lg">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">₹</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                  <CheckCircle size={10} className="text-gray-900" />
                </div>
              </div>
              <div className="flex-1">
                <div className="font-bold text-green-300">
                  {withdrawalPopups[currentPopupIndex].name}
                </div>
                <div className="text-sm">
                  Withdrew <span className="font-bold text-white">₹{withdrawalPopups[currentPopupIndex].amount}</span> via {withdrawalPopups[currentPopupIndex].method}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {withdrawalPopups[currentPopupIndex].time} • Success
                </div>
              </div>
              <div className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded">
                PAID
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              {withdrawalPopups.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    idx === currentPopupIndex 
                      ? 'bg-green-400' 
                      : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DB Connection Status */}
      {savingToDB && (
        <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg animate-pulse">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Saving ₹{moneyEarned.toFixed(2)} to database...</span>
          </div>
        </div>
      )}

      {/* Live Users Count */}
      <div className="bg-gradient-to-r from-[#0b4b66] to-[#155a83] p-5 rounded-xl mb-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold mb-1">{usersCount.toLocaleString()}</div>
            <div className="text-sm text-gray-200">
              Users Selling Data Now
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
        
        {/* Withdraw Button */}
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
            { name: "Jio", icon: "Jio", color: "from-red-500 to-pink-600", iconClass: "bg-red-600 text-white" },
            { name: "Airtel", icon: "A", color: "from-red-600 to-orange-600", iconClass: "bg-red-500 text-white" },
            { name: "Vi", icon: "Vi", color: "from-purple-500 to-pink-500", iconClass: "bg-gradient-to-br from-yellow-300 to-red-500 text-black" },
            { name: "BSNL", icon: "B", color: "from-yellow-500 to-orange-500", iconClass: "bg-gradient-to-br from-blue-500 to-green-500 text-white" },
            { name: "WiFi", icon: "Wi", color: "from-blue-500 to-cyan-500", iconClass: "bg-cyan-500 text-black" },
            { name: "Other", icon: "...", color: "from-gray-600 to-gray-700", iconClass: "bg-gray-600 text-white" }
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
              <div className="flex items-center justify-center gap-2 text-sm font-medium">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black leading-none shadow-inner ${op.iconClass}`}>
                  {op.icon}
                </span>
                <span>{op.name}</span>
              </div>
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

        {/* Live Speed Graph */}
        <div className="mb-5 rounded-xl border border-blue-500/20 bg-[#081316] p-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Live Speed Chart
              </div>
              <div className="text-[10px] text-gray-500">DATA/Mbps</div>
            </div>
            <div className="text-right">
              <div className={`text-xs font-semibold ${selling ? "text-green-400" : "text-gray-500"}`}>
                {selling ? "+ LIVE" : "WAITING"}
              </div>
              <div className="text-[10px] text-gray-500">1s candles</div>
            </div>
          </div>
          <div className="relative h-32 overflow-hidden rounded-lg border border-gray-800 bg-[#020617]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.10)_1px,transparent_1px)] bg-[size:40px_24px]" />
            <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-emerald-500/10 to-transparent" />
            <svg
              viewBox="0 0 320 84"
              preserveAspectRatio="none"
              className="absolute inset-x-0 bottom-6 h-[84px] w-full"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="speedFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.42" />
                  <stop offset="55%" stopColor="#14b8a6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="speedLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="32%" stopColor="#facc15" />
                  <stop offset="62%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#67e8f9" />
                </linearGradient>
                <filter id="speedGlow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path d={speedGraphAreaPath} fill="url(#speedFill)" />
              <path
                d={speedGraphPath}
                fill="none"
                stroke={selling ? "rgba(34, 197, 94, 0.28)" : "rgba(148, 163, 184, 0.28)"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={speedGraphPath}
                fill="none"
                stroke={selling ? "url(#speedLine)" : "rgba(148, 163, 184, 0.55)"}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={selling ? "url(#speedGlow)" : undefined}
              />
            </svg>
            <div className="absolute right-3 top-2 space-y-3 text-right text-[10px] text-gray-500">
              <div>120</div>
              <div>80</div>
              <div>40</div>
            </div>
            <div className="absolute bottom-2 left-3 text-[10px] text-gray-500">09:30</div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-gray-500">LIVE</div>
            <div className="absolute bottom-2 right-3 text-[10px] text-gray-500">NOW</div>
            {selling && (
              <div className="absolute right-10 top-1/2 flex -translate-y-1/2 items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_14px_rgba(74,222,128,0.95)]" />
                <div className="rounded-md border border-green-400/30 bg-green-500/15 px-2 py-1 text-[10px] font-bold text-green-300">
                  {netSpeed.toFixed(0)} Mbps
                </div>
              </div>
            )}
            {selling && (
              <div className="absolute left-3 top-2 rounded-md border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                +₹{earningsPerSecond.toFixed(2)}/sec
              </div>
            )}
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
                  STOP
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

        {/* Urgent Notification */}
        {selling && (
          <div className="mt-4 p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/20 p-2 rounded-lg">
                <Zap size={18} className="text-yellow-400 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-yellow-300">⚡ EARNING ACTIVE!</div>
                <div className="text-sm text-yellow-200/80">
                  Earning ₹{earningsPerSecond.toFixed(2)} per second!
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-800 p-3 backdrop-blur-lg">
        <div className="flex justify-between items-center">
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
            onClick={handleSettings}
            className="flex flex-col items-center p-2"
          >
            <Settings size={20} className="text-gray-400" />
            <span className="text-xs mt-1">Settings</span>
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

      {/* Add custom animations */}
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
        
        @keyframes slide-in-right {
          0% {
            opacity: 0;
            transform: translateX(20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slide-out-right {
          0% {
            opacity: 1;
            transform: translateX(0);
          }
          100% {
            opacity: 0;
            transform: translateX(20px);
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        
        .animate-slide-out-right {
          animation: slide-out-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
