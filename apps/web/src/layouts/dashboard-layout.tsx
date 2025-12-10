import { Outlet } from '@tanstack/react-router';
import { Sidebar } from './components/sidebar';
import { Header } from './components/header';
import { UpgradeBanner } from '@/components/upgrade-banner';

export function DashboardLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <UpgradeBanner />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
