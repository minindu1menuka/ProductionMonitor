import React, { useState } from 'react';
import axios from 'axios';
import { Factory, Lock, User, LogIn, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        username,
        password
      });

      if (response.data.success) {
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server connection failed!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
      >
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl shadow-lg flex items-center justify-center mb-4 relative z-10">
            <Factory className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight relative z-10">SYSTEM ACCESS</h2>
          <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mt-1 relative z-10">Authorized Personnel Only</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="Enter admin username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-sm shadow-md transition disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-pulse">Verifying...</span>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Secure Login</span>
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Machine Production Monitor © 2026</p>
        </div>
      </motion.div>
    </div>
  );
}