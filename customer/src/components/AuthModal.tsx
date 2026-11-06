import React, { useState } from 'react';
import { X, User, Mail, Lock, Phone, ArrowRight, Check } from 'lucide-react';
import { SAMPLE_USERS, setCurrentUser } from '../services/storage';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handleFastDemoLogin = (targetIndex: number) => {
    setCurrentUser(SAMPLE_USERS[targetIndex]);
    onSuccess();
    onClose();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser = {
      id: `user-${Date.now()}`,
      name: name || (role === 'customer' ? 'Campus Student' : 'Shop Owner'),
      email: email || 'student@campus.edu',
      phone: phone || '+91 98765 43210',
      role,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      created_at: new Date().toISOString(),
    };
    setCurrentUser(newUser);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1115]/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#C4C9CF] space-y-6 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EEF0F2]">
          <div>
            <h2 className="font-serif font-normal text-2xl text-[#0F1115]">
              {mode === 'login' ? 'Student Sign In' : 'Create Account'}
            </h2>
            <p className="font-sans text-xs text-[#7A7F88] mt-0.5">
              Access laser dispatch and order tracking
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#8B9098] hover:text-[#0F1115] hover:bg-[#EEF0F2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Fast Demo Login */}
        <div className="p-4 rounded-2xl bg-[#EEF0F2] border border-[#C4C9CF] space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#FF5A1F] font-bold block">
            ⚡ Quick Demo Accounts:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleFastDemoLogin(0)}
              className="p-2.5 rounded-xl border border-[#C4C9CF] bg-white text-left hover:border-[#FF5A1F] transition-all"
            >
              <div className="font-sans font-medium text-xs text-[#0F1115]">Priya Sharma</div>
              <div className="font-mono text-[10px] text-[#7A7F88]">Student account</div>
            </button>
            <button
              type="button"
              onClick={() => handleFastDemoLogin(1)}
              className="p-2.5 rounded-xl border border-[#C4C9CF] bg-white text-left hover:border-[#FF5A1F] transition-all"
            >
              <div className="font-sans font-medium text-xs text-[#0F1115]">Amit Patel</div>
              <div className="font-mono text-[10px] text-[#7A7F88]">Shop owner</div>
            </button>
          </div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Priya Sharma"
                className="w-full h-10 px-3.5 rounded-full border border-[#C4C9CF] text-xs font-sans text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
              />
            </div>
          )}

          <div>
            <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@campus.edu"
              className="w-full h-10 px-3.5 rounded-full border border-[#C4C9CF] text-xs font-sans text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
            />
          </div>

          <div>
            <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full h-10 px-3.5 rounded-full border border-[#C4C9CF] text-xs font-sans text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
            />
          </div>

          <button
            type="submit"
            className="w-full h-10 px-4 rounded-full bg-[#FF5A1F] hover:bg-[#E84E16] text-white font-sans font-medium text-xs shadow-sm transition-colors flex items-center justify-center gap-2 mt-4"
          >
            <span>{mode === 'login' ? 'Continue' : 'Create Account'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-2 text-center border-t border-[#EEF0F2]">
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="font-mono text-xs text-[#7A7F88] hover:text-[#0F1115]"
          >
            {mode === 'login' ? "Don't have an account? Register" : "Already registered? Sign in"}
          </button>
        </div>

      </div>
    </div>
  );
};
