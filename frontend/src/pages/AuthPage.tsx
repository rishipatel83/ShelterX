import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { ShieldAlert, ArrowRight, Zap, Sparkles } from 'lucide-react';
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
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const response = await api.post('/auth/demo');
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user?.username || 'DRDO Commander');
        addToast('Welcome Commander! Logged in via 1-Click Demo Access.', 'success');
        navigate('/dashboard');
        return;
      }
    } catch (err: any) {
      console.log('Backend demo login API unavailable, applying client demo credentials', err);
    } finally {
      setDemoLoading(false);
    }

    // Instant zero-wait fallback for cold starts or network latency
    localStorage.setItem('token', 'demo-token');
    setUser('DRDO Commander');
    addToast('Logged in via Instant Demo Access (Officer Mode)', 'success');
    navigate('/dashboard');
  };

  const handleFillDemoCredentials = () => {
    setEmail('officer@drdo.gov.in');
    setPassword('DRDO#Officer2026');
    if (!isLogin) {
      setUsername('drdo_commander');
    }
    addToast('Demo operator credentials pre-filled!', 'info');
  };

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
      console.log('Auth API error:', err);
      const serverMessage = err.response?.data?.message;

      if (err.response?.status === 401) {
        addToast(serverMessage || 'Invalid email or password. Please check your credentials or switch to Sign Up.', 'error');
      } else if (err.response?.status === 409) {
        addToast(serverMessage || 'An account with those details already exists. Please log in.', 'error');
        setIsLogin(true);
      } else if (err.response?.status === 400) {
        addToast(serverMessage || 'Please verify that all fields meet the requirements.', 'error');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        // Fallback for demo when backend server process is not active
        localStorage.setItem('token', 'demo-token');
        setUser(isLogin ? email.split('@')[0] : username);
        addToast('Backend unreachable: Logged in using Local Fallback Mode', 'info');
        navigate('/dashboard');
      } else {
        addToast(serverMessage || 'Authentication service error. Please try again.', 'error');
      }
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
            className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-wide py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(37,99,235,0.3)] mt-6 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Authenticating...' : isLogin ? 'Sign In' : 'Register Account'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </form>

        {/* 1-Click Demo Access Section */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Fast-Track Testing
            </span>
            <button
              type="button"
              onClick={handleFillDemoCredentials}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              Pre-fill Details
            </button>
          </div>
          
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={demoLoading || loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:to-slate-700 text-amber-300 font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg border border-slate-700/80 transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer group"
          >
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
            <span>{demoLoading ? 'Authenticating Officer...' : '1-Click Demo Access (DRDO Officer)'}</span>
          </button>
          <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
            Instantly launches simulation studio with pre-authorized cadre clearance.
          </p>
        </div>

        <p className="mt-6 text-center text-xs font-medium text-slate-500">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button 
            onClick={() => { setIsLogin(!isLogin); setEmail(''); setPassword(''); setUsername(''); }} 
            className="text-blue-600 hover:text-blue-700 font-bold ml-1 transition-colors underline decoration-blue-200 underline-offset-4 cursor-pointer"
          >
            {isLogin ? 'Request Access' : 'Sign In'}
          </button>
        </p>

      </div>
    </div>
  );
}
