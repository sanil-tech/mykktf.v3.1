import React, { useState, useEffect } from 'react';
import { Menu, Bell, LogOut, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { ROLE_LABELS } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export default function TopBar({ onMenuClick, user }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      base44.entities.Notification.filter({ user_id: user.id, is_read: false })
        .then(notifs => setUnreadCount(notifs.length))
        .catch(() => {});
    }
  }, [user?.id]);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 hover:bg-muted rounded-lg">
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="hidden sm:block">
          <h2 className="text-sm font-heading font-semibold text-foreground">Kolej Kediaman Management</h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" asChild>
          <a href="/announcements">
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </a>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium leading-none">{user?.full_name || 'User'}</p>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{ROLE_LABELS[user?.role] || user?.role}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => base44.auth.logout('/')} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}