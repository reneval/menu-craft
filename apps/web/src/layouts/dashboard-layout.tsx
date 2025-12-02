import { Outlet } from '@tanstack/react-router';
import { Sidebar } from './components/sidebar';
import { Header } from './components/header';

export function DashboardLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
