import React, { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, ChevronRight, Receipt } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const MobileWallet = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [topupAmount, setTopupAmount] = useState('');
  const quickAmounts = [100, 250, 500, 1000];

  useEffect(() => {
    let isActive = true;

    const loadWalletData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [walletRes, txRes] = await Promise.all([
          api.get('/wallet'),
          api.get('/wallet/transactions')
        ]);

        if (isActive) {
          setBalance(walletRes.data?.balance || 0);
          setTransactions(txRes.data?.transactions || []);
        }
      } catch (err) {
        if (isActive) {
          setError(err.response?.data?.message || 'Could not load wallet data.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadWalletData();

    return () => {
      isActive = false;
    };
  }, []);

  const handleQuickTopup = (amount) => {
    setTopupAmount(amount.toString());
  };

  const handleAddMoney = () => {
    navigate('/wallet/topup', { state: { initialAmount: topupAmount } });
  };

  return (
    <div className="w-full min-h-full bg-[#F8FAFC]">
      {/* 1. BALANCE HERO */}
      <div className="px-4 pt-6 pb-4 bg-white border-b border-slate-100">
        <div className="w-full rounded-3xl bg-gradient-to-br from-[#0047AB] to-[#1E40AF] p-6 text-white shadow-[0_8px_24px_rgba(0,71,171,0.25)] relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white opacity-5 rounded-full blur-xl"></div>
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white opacity-[0.03] rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex justify-between items-start mb-6">
            <div>
              <p className="text-[13px] text-white/80 font-medium tracking-wide uppercase">My Wallet</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-[24px] font-bold">₹</span>
                <span className="text-[40px] font-bold tracking-tight leading-none">
                  {balance.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Wallet size={24} className="text-white" />
            </div>
          </div>

          <div className="relative z-10 flex gap-3">
            <button 
              onClick={handleAddMoney}
              className="flex-1 bg-white text-[#0047AB] font-bold text-[14px] h-11 rounded-xl shadow-sm active:scale-95 transition-transform"
            >
              Add Money
            </button>
            <button 
              onClick={() => {
                document.getElementById('transactions-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex-1 bg-transparent border border-white/40 text-white font-bold text-[14px] h-11 rounded-xl active:bg-white/10 transition-colors"
            >
              Transactions
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        {/* 2. QUICK TOP-UP CHIPS */}
        <div className="space-y-4">
          <h2 className="text-[15px] font-bold text-[#0F172A] px-1">Quick Top-up</h2>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {quickAmounts.map(amount => (
              <button
                key={amount}
                onClick={() => handleQuickTopup(amount)}
                className={`snap-start shrink-0 px-6 h-[40px] rounded-full border text-[14px] font-bold transition-colors active:scale-95 ${
                  Number(topupAmount) === amount 
                    ? 'bg-[#0047AB] border-[#0047AB] text-white shadow-md shadow-blue-500/20' 
                    : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50 shadow-sm'
                }`}
              >
                ₹{amount}
              </button>
            ))}
          </div>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
                display: none;
            }
          `}</style>
        </div>

        {/* 3. RECENT TRANSACTIONS */}
        <div id="transactions-section" className="scroll-mt-20">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-[15px] font-bold text-[#0F172A]">Recent Transactions</h2>
          </div>

          <div className="space-y-3 pb-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3 bg-white rounded-2xl shadow-sm border border-slate-50">
                <div className="w-8 h-8 border-4 border-[#E2E8F0] border-t-[#0047AB] rounded-full animate-spin"></div>
                <p className="text-[#64748B] text-[13px] font-medium">Loading transactions...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-600 rounded-2xl p-4 text-[13px] font-medium text-center border border-red-100">
                {error}
              </div>
            ) : transactions && transactions.length > 0 ? (
              transactions.map((tx) => {
                const isDebit = ['order_debit', 'split_debit'].includes(tx.type) || tx.amount < 0;
                return (
                  <div key={tx._id || tx.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-50 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDebit ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {isDebit ? <ArrowUpRight size={20} strokeWidth={2.5} /> : <ArrowDownLeft size={20} strokeWidth={2.5} />}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[#0F172A] line-clamp-1">{tx.description || tx.type.replace('_', ' ')}</p>
                        <p className="text-[12px] text-[#64748B] mt-0.5 font-medium">
                          {new Date(tx.timestamp || tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className={`text-[15px] font-bold shrink-0 pl-2 ${isDebit ? 'text-[#0F172A]' : 'text-green-600'}`}>
                      {isDebit ? '-' : '+'}₹{Math.abs(tx.amount).toFixed(2)}
                    </div>
                  </div>
                );
              })
            ) : (
              /* EMPTY STATE */
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-50 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Receipt size={32} className="text-slate-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-[15px] font-bold text-[#0F172A] mb-1">No transactions yet</h3>
                <p className="text-[#64748B] text-[13px] mb-6 max-w-[200px]">
                  Add money to your wallet to place print orders seamlessly.
                </p>
                <button 
                  onClick={() => {
                    setTopupAmount('500');
                    navigate('/wallet/topup', { state: { initialAmount: '500' } });
                  }}
                  className="w-full h-11 bg-slate-900 text-white rounded-xl font-bold text-[14px] active:scale-95 transition-transform shadow-md"
                >
                  Add ₹500
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileWallet;
