import { Link } from '@tanstack/react-router';
import { Home, Store, UtensilsCrossed, Settings, QrCode, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Venues', href: '/venues', icon: Store },
  { name: 'Menus', href: '/menus', icon: UtensilsCrossed },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'QR Codes', href: '/qr-codes', icon: QrCode },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <UtensilsCrossed className="h-6 w-6 text-primary" />
          <span>MenuCraft</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              '[&.active]:bg-accent [&.active]:text-accent-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
