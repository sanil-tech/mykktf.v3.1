import React, { useState, useEffect } from 'react';
import { Menu, Bell, LogOut, User, UserCog, ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ROLE_LABELS } from '@/lib/roles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

import { requestNotificationPermission } from '@/lib/pushNotifications';
import RolePersonaSwitcher from '@/components/shared/RolePersonaSwitcher';

export default function TopBar({ onMenuClick, user }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      base44.entities.Notification.filter({ user_id: user.id, is_read: false }).
      then((notifs) => {
        setUnreadCount(notifs.length);
      }).
      catch(() => {});

      // Auto-prompt permission on supported browsers if not yet requested
      if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => {
          requestNotificationPermission().catch(() => {});
        }, 3000);
      }
    }
  }, [user?.id]);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 hover:bg-muted rounded-lg">
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="hidden sm:block">
          <h2 className="text-sm font-heading font-semibold text-foreground">MyKKTF — Kolej Kediaman Tun Fuad</h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* ROLE PERSPECTIVE SWITCHER (SUPER ADMIN vs FELO BLOK) */}
        <RolePersonaSwitcher user={user} />
        {user?.role && user.role !== 'student' && user.role !== 'user' && (
          <Button 
            variant="outline" 
            size="sm" 
            asChild 
            className="h-8 text-xs font-bold gap-1.5 border-lime-500/40 text-lime-600 dark:text-lime-400 bg-lime-500/10 hover:bg-lime-500/20 rounded-xl"
          >
            <Link to="/scan-resident">
              <ScanLine className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imbas Pas QR</span>
            </Link>
          </Button>
        )}

        <Button variant="ghost" size="icon" className="relative" asChild>
          <a href="/announcements">
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 &&
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            }
          </a>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center overflow-hidden">
                {user?.profile_photo ? (
                  <img src={user.profile_photo} alt={user.full_name || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-primary-foreground" />
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium leading-none flex items-center gap-1">
                  {user?.full_name || 'User'}
                  {user?.jakmasAppointment && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-[9px] px-1 py-0 leading-none">JAKMAS</Badge>
                  )}
                  {(user?.email?.toLowerCase() === 'nurfadilahdarmansah@gmail.com' || user?.effectiveRole === 'principal' || user?.role === 'principal') && (
                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400 text-[9px] px-1.5 py-0.5 leading-none font-bold">
                      {user?.isGuestDemo ? '👑 TETAMU MAPEK' : '👑 PENGETUA'}
                    </Badge>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  {user?.isGuestDemo
                    ? 'Pengetua Jemputan MAPEK'
                    : (user?.email?.toLowerCase() === 'nurfadilahdarmansah@gmail.com' || user?.effectiveRole === 'principal' || user?.role === 'principal'
                        ? 'Pengetua Kolej'
                        : (ROLE_LABELS[user?.effectiveRole] || ROLE_LABELS[user?.role] || user?.role))}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {user?.isGuestDemo && (
              <div className="px-2 py-1.5 mb-1 bg-amber-500/10 border border-amber-400/40 rounded-md text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <span>👑 Mod Demonstrasi Eksekutif</span>
              </div>
            )}
            <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/my-profile" className="flex items-center">
                <UserCog className="w-4 h-4 mr-2" /> My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => base44.auth.logout('/')} className="text-destructive font-medium cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" /> {user?.isGuestDemo ? 'Keluar Mod Tetamu' : 'Logout'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>);

}