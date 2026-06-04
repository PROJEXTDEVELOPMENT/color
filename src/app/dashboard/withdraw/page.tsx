// app/dashboard/withdraw/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, CreditCard, Wallet, AlertCircle, Shield, CheckCircle, Banknote, Phone, User, Clock, IndianRupee, ChevronRight, Home, X, Fingerprint, FileText, Lock } from 'lucide-react';

type StoredUser = {
  id?: string;
  mobile?: string;
  full_name?: string;
};

type UserProfile = {
  id: string;
  full_name?: string;
  mobile: string;
  balance: number;
  kyc_verified?: boolean;
  kyc_status?: 'pending' | 'verified' | 'rejected' | 'not_submitted';
};

export default function WithdrawPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Bank' | 'Paytm' | 'Google Pay'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [paytmNumber, setPaytmNumber] = useState('');
  const [googlePayNumber, setGooglePayNumber] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [showKycPopup, setShowKycPopup] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  const [kycRedirecting, setKycRedirecting] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);

  // Initialize and load user data
  useEffect(() => {
    const initializeWithdrawal = async () => {
      try {
        // Check localStorage for custom login
        const raw = localStorage.getItem("user");
        if (raw) {
          const parsed: StoredUser = JSON.parse(raw);
          setStoredUser(parsed);
          await loadUserProfile(parsed);
          return;
        }

        // If not in localStorage, check Supabase auth
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
        console.error("Withdrawal page init error:", err);
        router.replace("/login");
      }
    };

    initializeWithdrawal();
  }, [router]);

  // Load user profile from database using mobile number (from your table structure)
  async function loadUserProfile(user: StoredUser) {
    if (!user) return;
    
    try {
      let query = supabase.from("users").select("*");
      
      // Use mobile as primary identifier (as per your table structure)
      if (user.mobile) {
        query = query.eq("mobile", user.mobile);
      } else if (user.id) {
        query = query.eq("id", user.id);
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
          kyc_verified: data.kyc_verified || false,
          kyc_status: data.kyc_status || 'not_submitted'
        };
        
        setProfile(userProfile);
        // Load withdrawal history
        await loadWithdrawalHistory(data.id);
      }
    } catch (err) {
      console.error("loadUserProfile error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Load withdrawal history
  async function loadWithdrawalHistory(userId: string) {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setWithdrawalHistory(data);
      }
    } catch (error) {
      console.error('Error loading withdrawal history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }

  // Handle withdrawal
  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    
    // Validation
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!profile) {
      alert('User profile not found');
      return;
    }

    if (withdrawAmount > profile.balance) {
      alert('Insufficient balance');
      return;
    }

    // Check minimum withdrawal
    if (withdrawAmount < 50) {
      alert('Minimum withdrawal amount is ₹50');
      return;
    }

    // Check KYC status - Show KYC popup if not verified
    if (!profile.kyc_verified && profile.kyc_status !== 'verified') {
      setShowKycPopup(true);
      return;
    }

    // Validate payment details based on method
    if (paymentMethod === 'UPI' && !upiId.trim()) {
      alert('Please enter your UPI ID');
      return;
    }

    if (paymentMethod === 'Bank') {
      if (!bankName.trim() || !accountNumber.trim() || !ifscCode.trim() || !accountHolder.trim()) {
        alert('Please fill all bank details');
        return;
      }
      if (accountNumber.length < 9 || accountNumber.length > 18) {
        alert('Please enter a valid account number (9-18 digits)');
        return;
      }
      if (ifscCode.length !== 11) {
        alert('IFSC code must be 11 characters');
        return;
      }
    }

    if (paymentMethod === 'Paytm' && !paytmNumber.trim()) {
      alert('Please enter your Paytm number');
      return;
    }

    if (paymentMethod === 'Google Pay' && !googlePayNumber.trim()) {
      alert('Please enter your Google Pay number');
      return;
    }

    setWithdrawing(true);

    try {
      const newBalance = profile.balance - withdrawAmount;
      const transactionId = `TX${Date.now().toString().slice(-10)}`;

      // Update balance in database (using mobile as identifier)
      const { error: updateError } = await supabase
        .from("users")
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq("mobile", profile.mobile);

      if (updateError) throw updateError;

      // Create withdrawal transaction record
      const withdrawalData = {
        user_id: profile.id,
        user_mobile: profile.mobile,
        amount: withdrawAmount,
        payment_method: paymentMethod,
        status: 'pending',
        transaction_id: transactionId,
        upi_id: paymentMethod === 'UPI' ? upiId : null,
        bank_name: paymentMethod === 'Bank' ? bankName : null,
        account_number: paymentMethod === 'Bank' ? accountNumber : null,
        ifsc_code: paymentMethod === 'Bank' ? ifscCode : null,
        account_holder: paymentMethod === 'Bank' ? accountHolder : null,
        paytm_number: paymentMethod === 'Paytm' ? paytmNumber : null,
        google_pay_number: paymentMethod === 'Google Pay' ? googlePayNumber : null,
        created_at: new Date().toISOString()
      };

      const { error: transactionError } = await supabase
        .from("withdrawals")
        .insert(withdrawalData);

      if (transactionError) throw transactionError;

      // Update local state
      setProfile(prev => prev ? { ...prev, balance: newBalance } : null);
      
      // Set transaction details for success popup
      setTransactionDetails({
        amount: withdrawAmount,
        transactionId: transactionId,
        paymentMethod: paymentMethod,
        newBalance: newBalance,
        timestamp: new Date().toISOString()
      });
      
      // Show success popup
      setShowSuccessPopup(true);
      setWithdrawalSuccess(true);
      
      // Reset form
      setAmount('');
      setUpiId('');
      setBankName('');
      setAccountNumber('');
      setIfscCode('');
      setAccountHolder('');
      setPaytmNumber('');
      setGooglePayNumber('');

      // Reload withdrawal history after 2 seconds
      setTimeout(() => {
        if (profile.id) {
          loadWithdrawalHistory(profile.id);
        }
      }, 2000);

    } catch (error) {
      console.error('Withdrawal error:', error);
      alert('❌ Error processing withdrawal. Please try again or contact support.');
    } finally {
      setWithdrawing(false);
    }
  };

  // Handle KYC verification redirection
  const handleKYCVerification = () => {
    setKycRedirecting(true);
    // Store withdrawal attempt data in localStorage
    const withdrawalAttempt = {
      amount: amount,
      paymentMethod: paymentMethod,
      upiId: upiId,
      bankName: bankName,
      accountNumber: accountNumber,
      ifscCode: ifscCode,
      accountHolder: accountHolder,
      paytmNumber: paytmNumber,
      googlePayNumber: googlePayNumber,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('pendingWithdrawal', JSON.stringify(withdrawalAttempt));
    
    setTimeout(() => {
      router.push('/dashboard/kyc');
    }, 500);
  };

  // Quick amount selection
  const quickAmounts = [50, 100, 200, 500, 1000, 2000, 5000];

  // Calculate available amount (90% of balance for demo)
  const availableAmount = (profile?.balance || 0) * 0.9;

  // Close success popup
  const closeSuccessPopup = () => {
    setShowSuccessPopup(false);
    setTransactionDetails(null);
    setWithdrawalSuccess(false);
  };

  // Continue to dashboard from success popup
  const continueToDashboard = () => {
    setShowSuccessPopup(false);
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading withdrawal page...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">User Not Found</h2>
          <p className="text-gray-300 mb-6">Unable to load your profile. Please login again.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 rounded-lg font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-gray-300 hover:text-white active:scale-95"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Back</span>
        </button>
        
        <div className="text-lg font-bold">Withdraw Money</div>
        
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 text-gray-400 hover:text-white active:scale-95"
        >
          <Home size={20} />
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-[#14a0f0] to-[#29d2ff] p-5 rounded-xl text-black mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Wallet Balance</div>
            <div className="text-4xl font-bold mt-1 flex items-center">
              <IndianRupee size={32} className="mr-1" />
              {profile.balance.toFixed(2)}
            </div>
            <div className="text-xs opacity-80 mt-2">
              {profile.mobile} • Min: ₹50
            </div>
          </div>
          <Wallet size={36} className="opacity-80" />
        </div>
      </div>

      {/* KYC Status Banner */}
      {profile.kyc_status !== 'verified' && (
        <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 p-4 rounded-xl mb-6 border border-red-500/30">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/20 p-2 rounded-lg">
              <AlertCircle size={20} className="text-red-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium">KYC Verification Required</div>
              <div className="text-sm text-gray-300 mt-1">
                Complete KYC to withdraw money
              </div>
            </div>
            <button
              onClick={handleKYCVerification}
              className="px-4 py-2 bg-red-600 rounded-lg text-sm font-medium active:scale-95"
            >
              Verify Now
            </button>
          </div>
        </div>
      )}

      {/* Withdrawal Form */}
      <div className="bg-[#0b1b23] p-5 rounded-xl mb-6">
        <h2 className="text-xl font-bold mb-2">Withdrawal Request</h2>
        <p className="text-sm text-gray-400 mb-6">Enter amount and select payment method</p>

        {/* Amount Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-300">
              Enter Amount (₹)
            </label>
            <button
              onClick={() => setAmount(availableAmount.toFixed(2))}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Use 90%: ₹{availableAmount.toFixed(2)}
            </button>
          </div>
          
          <input
            type="number"
            placeholder="Enter withdrawal amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-4 rounded-lg bg-[#081316] text-white text-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
            min="50"
            step="1"
          />
          
          {/* Quick Amount Buttons */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(amt.toString())}
                className={`py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95 ${amount === amt.toString() 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'bg-gray-900 text-gray-300 hover:bg-gray-800'}`}
                disabled={amt > profile.balance}
              >
                ₹{amt}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Select Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('UPI')}
              className={`p-4 rounded-lg flex flex-col items-center justify-center gap-2 border-2 transition-all ${paymentMethod === 'UPI' 
                ? 'border-blue-500 bg-blue-900/30' 
                : 'border-gray-700 bg-gray-900 hover:border-gray-600'}`}
            >
              <CreditCard size={24} />
              <span className="text-sm font-medium">UPI</span>
              <span className="text-xs text-gray-400">Instant</span>
            </button>
            
            <button
              type="button"
              onClick={() => setPaymentMethod('Bank')}
              className={`p-4 rounded-lg flex flex-col items-center justify-center gap-2 border-2 transition-all ${paymentMethod === 'Bank' 
                ? 'border-blue-500 bg-blue-900/30' 
                : 'border-gray-700 bg-gray-900 hover:border-gray-600'}`}
            >
              <Banknote size={24} />
              <span className="text-sm font-medium">Bank</span>
              <span className="text-xs text-gray-400">1-24 Hours</span>
            </button>
            
            <button
              type="button"
              onClick={() => setPaymentMethod('Paytm')}
              className={`p-4 rounded-lg flex flex-col items-center justify-center gap-2 border-2 transition-all ${paymentMethod === 'Paytm' 
                ? 'border-blue-500 bg-blue-900/30' 
                : 'border-gray-700 bg-gray-900 hover:border-gray-600'}`}
            >
              <div className="text-yellow-400 font-bold text-lg">P</div>
              <span className="text-sm font-medium">Paytm</span>
              <span className="text-xs text-gray-400">Instant</span>
            </button>
            
            <button
              type="button"
              onClick={() => setPaymentMethod('Google Pay')}
              className={`p-4 rounded-lg flex flex-col items-center justify-center gap-2 border-2 transition-all ${paymentMethod === 'Google Pay' 
                ? 'border-blue-500 bg-blue-900/30' 
                : 'border-gray-700 bg-gray-900 hover:border-gray-600'}`}
            >
              <div className="text-blue-400 font-bold text-lg">G</div>
              <span className="text-sm font-medium">Google Pay</span>
              <span className="text-xs text-gray-400">Instant</span>
            </button>
          </div>
        </div>

        {/* Payment Details */}
        <div className="mb-6">
          {paymentMethod === 'UPI' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                UPI ID
              </label>
              <input
                type="text"
                placeholder="username@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full p-3 rounded-lg bg-[#081316] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
              />
              <p className="text-xs text-gray-400 mt-2">
                Examples: 9876543210@ybl, username@okaxis, email@okicici
              </p>
            </div>
          )}

          {paymentMethod === 'Bank' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  placeholder="As per bank records"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full p-3 rounded-lg bg-[#081316] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  placeholder="State Bank of India, HDFC, ICICI, etc."
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-3 rounded-lg bg-[#081316] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    placeholder="123456789012"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full p-3 rounded-lg bg-[#081316] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    placeholder="SBIN0001234"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    className="w-full p-3 rounded-lg bg-[#081316] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
                  />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'Paytm' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Paytm Registered Number
              </label>
              <input
                type="tel"
                placeholder="9876543210"
                value={paytmNumber}
                onChange={(e) => setPaytmNumber(e.target.value)}
                className="w-full p-3 rounded-lg bg-[#081316] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
              />
              <p className="text-xs text-gray-400 mt-2">
                Enter your registered Paytm mobile number
              </p>
            </div>
          )}

          {paymentMethod === 'Google Pay' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Google Pay Number
              </label>
              <input
                type="tel"
                placeholder="9876543210"
                value={googlePayNumber}
                onChange={(e) => setGooglePayNumber(e.target.value)}
                className="w-full p-3 rounded-lg bg-[#081316] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
              />
              <p className="text-xs text-gray-400 mt-2">
                Enter your registered Google Pay mobile number
              </p>
            </div>
          )}
        </div>

        {/* Withdrawal Information */}
        <div className="bg-gray-900/50 p-4 rounded-lg mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-blue-400" />
            <span className="font-medium">Important Information</span>
          </div>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5"></div>
              <span>Minimum withdrawal: <strong>₹50</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5"></div>
              <span>Processing time: <strong>{paymentMethod === 'Bank' ? '1-24 hours' : 'Instant'}</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5"></div>
              <span>KYC verification required for withdrawals</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5"></div>
              <span>Withdrawal fee: <strong>₹0</strong> (No charges)</span>
            </li>
          </ul>
        </div>

        {/* Withdraw Button */}
        <button
          onClick={handleWithdraw}
          disabled={withdrawing || !amount || parseFloat(amount) < 50 || parseFloat(amount) > profile.balance}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-95 ${withdrawing || !amount || parseFloat(amount) < 50 || parseFloat(amount) > profile.balance
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg hover:shadow-green-500/20'}`}
        >
          {withdrawing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processing Withdrawal...
            </span>
          ) : (
            `Withdraw ₹${amount || '0'} Now`
          )}
        </button>
      </div>

      {/* User Profile Info */}
      <div className="bg-[#0b1b23] p-4 rounded-xl mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Account Details</div>
          <div className={`text-xs px-2 py-1 rounded ${profile.kyc_status === 'verified' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {profile.kyc_status === 'verified' ? 'KYC Verified ✓' : 'KYC Pending'}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-400" />
              <span className="text-sm text-gray-400">Name</span>
            </div>
            <span className="font-medium">{profile.full_name || 'Not Set'}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-gray-400" />
              <span className="text-sm text-gray-400">Mobile</span>
            </div>
            <span className="font-medium">{profile.mobile}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">User ID</div>
            <span className="text-xs font-mono text-gray-300">{profile.id?.substring(0, 8)}...</span>
          </div>
        </div>
      </div>

      {/* Withdrawal History */}
      <div className="bg-[#0b1b23] p-4 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Recent Withdrawals</div>
          <button 
            onClick={() => router.push('/dashboard/withdraw/history')}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            View All
          </button>
        </div>
        
        {loadingHistory ? (
          <div className="text-center py-6">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400 text-sm mt-2">Loading history...</p>
          </div>
        ) : withdrawalHistory.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            No withdrawal history yet
          </div>
        ) : (
          <div className="space-y-3">
            {withdrawalHistory.map((withdrawal) => (
              <div key={withdrawal.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                <div>
                  <div className="font-medium">₹{withdrawal.amount?.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">{withdrawal.payment_method}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs px-2 py-1 rounded ${withdrawal.status === 'completed' ? 'bg-green-900/30 text-green-400' : withdrawal.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-red-900/30 text-red-400'}`}>
                    {withdrawal.status}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(withdrawal.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KYC Required Popup - Shows when user tries to withdraw without KYC */}
      {showKycPopup && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-6 max-w-md w-full border border-red-500/30 shadow-2xl shadow-red-500/10">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-red-600 to-orange-600 p-3 rounded-xl">
                  <Lock size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">KYC Verification Required</h3>
                  <p className="text-sm text-gray-400">Complete KYC to withdraw money</p>
                </div>
              </div>
              <button
                onClick={() => setShowKycPopup(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Message */}
            <div className="mb-6">
              <div className="bg-gray-900/50 p-4 rounded-xl mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={18} className="text-red-400" />
                  <span className="font-medium">Withdrawal Request Saved</span>
                </div>
                <p className="text-gray-300 text-sm">
                  We've saved your withdrawal request for <strong>₹{amount}</strong> via {paymentMethod}. 
                  Complete KYC verification to process this withdrawal.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Why KYC is Required:</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-900/50 p-3 rounded-lg">
                    <Fingerprint size={20} className="text-blue-400 mb-2" />
                    <div className="text-sm font-medium">Identity Verification</div>
                    <div className="text-xs text-gray-400">Verify your identity for security</div>
                  </div>
                  <div className="bg-gray-900/50 p-3 rounded-lg">
                    <Shield size={20} className="text-green-400 mb-2" />
                    <div className="text-sm font-medium">Secure Transactions</div>
                    <div className="text-xs text-gray-400">Protect against fraud</div>
                  </div>
                </div>
              </div>
            </div>

            {/* KYC Process Steps */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">KYC Process (2-5 minutes):</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div className="flex-1">
                    <div className="font-medium">Basic Details</div>
                    <div className="text-xs text-gray-400">Name, Address, PAN</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div className="flex-1">
                    <div className="font-medium">Payment</div>
                    <div className="text-xs text-gray-400">Submit UTR and screenshot</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <div className="flex-1">
                    <div className="font-medium">Instant Verification</div>
                    <div className="text-xs text-gray-400">Get verified in minutes</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowKycPopup(false)}
                className="flex-1 py-3.5 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleKYCVerification}
                disabled={kycRedirecting}
                className="flex-1 py-3.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-xl font-medium transition-all active:scale-95"
              >
                {kycRedirecting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Redirecting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <FileText size={18} />
                    Complete KYC Now
                  </span>
                )}
              </button>
            </div>

            {/* Auto-redirect Timer */}
            <div className="mt-4 text-center">
              <div className="text-xs text-gray-400">
                Auto-redirecting to KYC page in <span className="font-bold text-red-400">5</span> seconds...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Success Popup */}
      {showSuccessPopup && transactionDetails && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-6 max-w-md w-full border border-green-500/30 shadow-2xl shadow-green-500/10">
            {/* Success Icon */}
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-full">
                <CheckCircle size={48} className="text-white" />
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">Withdrawal Request Submitted!</h3>
              <p className="text-gray-400">Your withdrawal is being processed</p>
            </div>

            {/* Transaction Details */}
            <div className="bg-gray-900/50 rounded-xl p-4 mb-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-xl font-bold text-green-400">₹{transactionDetails.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Payment Method:</span>
                  <span className="font-medium">{transactionDetails.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Transaction ID:</span>
                  <span className="font-mono text-sm">{transactionDetails.transactionId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Status:</span>
                  <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs font-medium">Processing</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">New Balance:</span>
                  <span className="font-medium">₹{transactionDetails.newBalance.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Processing Info */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-blue-400" />
                <div>
                  <div className="font-medium">Processing Time</div>
                  <div className="text-sm text-gray-300">
                    Your money will be sent within {transactionDetails.paymentMethod === 'Bank' ? '1-24 hours' : '30 minutes'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={continueToDashboard}
                className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-medium transition-all active:scale-95"
              >
                Go to Dashboard
              </button>
              <button
                onClick={closeSuccessPopup}
                className="w-full py-3.5 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-all active:scale-95"
              >
                Make Another Withdrawal
              </button>
            </div>

            {/* Support Info */}
            <div className="mt-4 text-center text-xs text-gray-400">
              Need help? Contact support at support@example.com
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
