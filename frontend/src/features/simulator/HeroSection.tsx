import { Crosshair } from 'lucide-react';

export default function HeroSection() {
  return (
    <div className="relative w-full max-w-6xl mx-auto px-6 pt-20 pb-16 flex flex-col items-center text-center overflow-hidden bg-transparent">

      <div className="animate-fade-in-up flex items-center space-x-2 text-[10px] font-bold tracking-[0.2em] uppercase text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-8 z-10 shadow-sm border border-blue-100">
        <Crosshair className="w-3 h-3 mr-2" />
        <span>SMART INDIA HACKATHON 2026 • PROBLEM STATEMENT 26051</span>
      </div>

      <h1 className="animate-fade-in-up-delay-1 text-5xl md:text-6xl font-bold text-slate-800 leading-[1.1] mb-8 z-10 tracking-tight">
        Software Based Model Development for <br />
        <span className="text-blue-600">Area Specific Shelter Design</span>
      </h1>

      <p className="animate-fade-in-up-delay-2 max-w-3xl text-lg text-slate-500 font-medium leading-relaxed mb-10 z-10">
        Developed for DRDO: Predicting inside temperature and thermal energy dynamics based on <span className="text-slate-800 font-semibold">Laddakh, Siachen, Leh</span>, and other extreme climate frontiers. This engine fuses live weather APIs with thermodynamic material science and ANSYS-backed structural analysis.
      </p>

    </div>
  );
}
