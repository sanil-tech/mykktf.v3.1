import React from 'react';

export default function StatCard({ label, value, icon: Icon, color = 'bg-primary', trend }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex items-start justify-between transition-shadow hover:shadow-md">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-heading font-bold text-foreground mt-1.5">{value}</p>
        {trend !== undefined && (
          <p className={`text-xs mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
          </p>
        )}
      </div>
      {Icon && (
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
}