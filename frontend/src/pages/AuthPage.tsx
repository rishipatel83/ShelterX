import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';

export default function AuthPage() {
  const navigate = useNavigate();
  const { setUser, addToast } = useSimulationStore();
  
  // States
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const response = await api.post('/auth/login', { email, password });
        if (response.data && response.data.token) {
          localStorage.setItem('token', response.data.token);
          setUser(response.data.username || email.split('@')[0]);
          addToast('Successfully signed in', 'success');
          navigate('/dashboard');
        }
      } else {
        const response = await api.post('/auth/signup', { username, email, password });
        if (response.data && response.data.success) {
          addToast('Account created successfully. Please log in.', 'success');
          setIsLogin(true); // Switch to login after signup
          setPassword('');
        }
      }
    } catch (err: any) {
      console.log('Auth API failed, falling back to demo mode', err);
      // Fallback for hackathon demo so it's not blocked
      localStorage.setItem('token', 'demo-token');
      setUser(isLogin ? email.split('@')[0] : username);
      addToast('Backend unreachable: Logged in using Local Fallback Mode', 'info');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-['Space_Grotesk'] text-slate-800 relative overflow-hidden z-10">
      
      <div className="max-w-md w-full bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 flex flex-col p-10 relative z-10 hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)] transition-all duration-500">
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 border border-blue-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-2 max-w-[250px]">
            {isLogin ? 'Sign in to access the DRDO thermal simulation dashboard.' : 'Register for a new DRDO operator account.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50/80 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none text-slate-800 font-medium transition-all"
                placeholder="operator_name"
              />
            </div>
          )}
          
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50/80 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none text-slate-800 font-medium transition-all"
              placeholder="operator@drdo.gov.in"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50/80 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none text-slate-800 font-medium transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-wide py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(37,99,235,0.3)] mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : isLogin ? 'Sign In' : 'Register Account'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-medium text-slate-500">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button 
            onClick={() => { setIsLogin(!isLogin); setEmail(''); setPassword(''); setUsername(''); }} 
            className="text-blue-600 hover:text-blue-700 font-bold ml-1 transition-colors underline decoration-blue-200 underline-offset-4"
          >
            {isLogin ? 'Request Access' : 'Sign In'}
          </button>
        </p>

      </div>
    </div>
  );
}
