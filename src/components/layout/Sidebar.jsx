import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getNavItems } from '@/lib/roles';
import {
  LayoutDashboard, GraduationCap, DoorOpen, ArrowLeftRight, CalendarOff,
  Wrench, UserCheck, Package, ShieldAlert, Building2, ClipboardCheck,
  Megaphone, CreditCard, FileBarChart, ScrollText, X, ChevronLeft,
  MessageSquare, MessagesSquare, CalendarCheck, Star, UserCog
} from 'lucide-react';

const iconMap = {
  LayoutDashboard, GraduationCap, DoorOpen, ArrowLeftRight, CalendarOff,
  Wrench, UserCheck, Package, ShieldAlert, Building2, ClipboardCheck,
  Megaphone, CreditCard, FileBarChart, ScrollText,
  MessageSquare, MessagesSquare, CalendarCheck, Star, UserCog
};

export default function Sidebar({ userRole, open, onClose, collapsed, onToggleCollapse }) {
  const location = useLocation();
  const navItems = getNavItems(userRole);

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 left-0 z-50 h-full bg-primary text-primary-foreground flex flex-col transition-all duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
        ${collapsed ? 'w-[72px]' : 'w-64'}
      `}>
        <div className={`flex items-center h-16 px-4 border-b border-white/10 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <Building2 className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="font-heading font-bold text-sm tracking-tight">KKMS</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Building2 className="w-4 h-4 text-accent-foreground" />
            </div>
          )}
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5" />
          </button>
          <button onClick={onToggleCollapse} className="hidden lg:flex p-1 hover:bg-white/10 rounded">
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(item => {
            const Icon = iconMap[item.icon];
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${active ? 'bg-accent text-accent-foreground' : 'text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground'}
                  ${collapsed ? 'justify-center px-2' : ''}
                `}
              >
                {Icon && <Icon className="w-[18px] h-[18px] flex-shrink-0" />}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}