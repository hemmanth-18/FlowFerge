import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { GlobalCursor } from '../components/GlobalCursor';
import DotField from '../components/DotField';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#080B12] text-[#F8FAFC] flex relative overflow-x-hidden ambient-glow-bg selection:bg-purple-600/30 selection:text-white">
      {/* Dynamic React Bits DotField Interactive Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <DotField
          dotRadius={1.5}
          dotSpacing={14}
          bulgeStrength={67}
          glowRadius={160}
          sparkle={false}
          waveAmplitude={0}
          gradientFrom="rgba(168, 85, 247, 0.35)"
          gradientTo="rgba(180, 151, 207, 0.25)"
          glowColor="#120F17"
        />
      </div>

      {/* Subtle Monochromatic Purple Ambient Lighting Orbs */}
      <div
        className="fixed top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none z-0"
        aria-hidden="true"
      />
      <div
        className="fixed bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-purple-900/10 blur-[140px] pointer-events-none z-0"
        aria-hidden="true"
      />

      {/* Global Interactive Cursor (respects reduced-motion & touch) */}
      <GlobalCursor />

      {/* Persistent Glass Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 relative z-10">
        <main className="flex-1 min-w-0">
          <Outlet context={{ setSidebarOpen }} />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
