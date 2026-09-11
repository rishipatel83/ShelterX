import HeroSection from '@/features/simulator/HeroSection';
import StudioControls from '@/features/simulator/StudioControls';
import ShelterSchematic from '@/features/simulator/ShelterSchematic';
import ResultsPanel from '@/features/simulator/ResultsPanel';

export default function SimulationDashboard() {
  return (
    <div className="flex-1 w-full bg-transparent overflow-y-auto flex flex-col pb-12">
      
      {/* Hero / Landing Section */}
      <HeroSection />

      {/* Main Studio Area */}
      <div className="w-full max-w-5xl mx-auto px-6 mt-4 flex flex-col gap-16 mb-24">
          
        {/* Top: Controls */}
        <div className="w-full flex flex-col z-10">
            <StudioControls />
        </div>

        {/* Middle: 3D Engine */}
        <div className="w-full flex flex-col z-10">
            <ShelterSchematic />
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-slate-800 my-12"></div>

        {/* Results Panel */}
        <ResultsPanel />

      </div>

      {/* Footer */}
      <footer className="mt-24 w-full max-w-7xl mx-auto px-6 pt-8 border-t border-[#1e293b]/50 text-center flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
        <p>DRDO Extreme Climate Habitat Defense</p>
        <p className="mt-4 md:mt-0">Smart India Hackathon • Problem 51</p>
      </footer>
    </div>
  );
}