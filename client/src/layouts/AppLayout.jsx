import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { GlobalCursor } from '../components/GlobalCursor';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex relative">
      {/* Global Interactive Cursor & Halo Tracking */}
      <GlobalCursor />

      {/* Persistent Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <main className="flex-1">
          <Outlet context={{ setSidebarOpen }} />
        </main>
      </div>
    </div>
  );
};
