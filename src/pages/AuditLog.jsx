import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { ScrollText } from 'lucide-react';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AuditLog.list('-created_date', 100).then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Audit Log" description="System activity trail — Super Admin only" />

      {logs.length === 0 ? <EmptyState icon={ScrollText} title="No audit logs" description="System actions will be recorded here." /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Action</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Module</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Details</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Timestamp</th>
              </tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{l.user_name}</td>
                    <td className="px-4 py-3">{l.action}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{l.module}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell max-w-[200px] truncate">{l.details}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{l.timestamp || l.created_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}