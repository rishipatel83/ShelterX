import { Outlet, Link } from 'react-router-dom';
import { Shield, Activity, User } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';

export default function RootLayout() {
  const { isConnected, toasts, removeToast, user, setUser } = useSimulationStore();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-blue-50/30 overflow-hidden text-slate-800 font-['Space_Grotesk'] relative">
      
      {/* Global Background Blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-cyan-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse pointer-events-none z-0" style={{ animationDelay: '1.5s' }}></div>

      {/* Global Toast Notifications (Stacked) */}
      <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end space-y-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={`pointer-events-auto flex items-center px-4 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in slide-in-from-bottom-5 duration-300 bg-white/90 backdrop-blur-xl ${
            toast.type === 'success' ? 'text-emerald-600' :
            toast.type === 'error' ? 'text-red-600' :
            toast.type === 'loading' ? 'text-blue-600' :
            'text-cyan-600'
          }`}>
            <Activity className={`w-5 h-5 mr-3 opacity-90 ${toast.type === 'loading' ? 'animate-spin' : ''}`} />
            <span className="text-sm font-bold tracking-wide">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-6 opacity-50 hover:opacity-100 text-lg">&times;</button>
          </div>
        ))}
      </div>

      {/* Top Header / Nav */}
      <header className="h-20 bg-white/80 backdrop-blur-xl shadow-[0_4px_30px_rgb(0,0,0,0.03)] flex items-center justify-between px-8 lg:px-16 shrink-0 z-10 relative border-b border-white/50">
        
        {/* Logo Section */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 transition-colors group-hover:bg-blue-100 border border-blue-100">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center">
              <h1 className="text-xl font-bold tracking-wider text-slate-800">SHELTER<span className="text-blue-600">X</span></h1>
              <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100">PS 26051</span>
            </div>
            <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest hidden sm:block">SIH 2026 • Thermal Comfort Maintenance</p>
          </div>
        </Link>
        
        {/* Right Status Section */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center text-xs font-semibold tracking-wide text-slate-500 bg-slate-50 px-4 py-2 rounded-xl">
            <span className="relative flex h-2 w-2 mr-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            {isConnected ? 'Engine Online' : 'Local Fallback'}
          </div>
          
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm font-bold text-slate-700 bg-slate-50 px-4 py-2 rounded-xl flex items-center">
                <User className="w-4 h-4 mr-2 text-blue-600" /> {user.username}
              </span>
              <button onClick={handleLogout} className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors">Logout</button>
            </div>
          ) : (
            <Link to="/auth" className="flex items-center px-5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors font-semibold text-sm shadow-[0_4px_14px_0_rgb(0,0,0,0.1)]">
              <User className="w-4 h-4 mr-2" /> Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#fafafa]">
        <Outlet />
      </main>
    </div>
  );
}