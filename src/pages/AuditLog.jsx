import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { ScrollText, ShieldAlert, Search, Filter, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/AuthContext';
import { canViewAuditLog } from '@/lib/permissions';

export default function AuditLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [resultFilter, setResultFilter] = useState('ALL');

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await base44.entities.AuditLog.list('-created_date', 150);
      setLogs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Capability check
  if (!canViewAuditLog(user?.role)) {
    return (
      <div className="p-8 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-lg font-bold">Akses Ditolak: Log Audit Keselamatan</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Hanya Pentadbir Sistem (IT) dan Pengetua Kolej yang diberi kuasa untuk melihat rekod jejak audit integriti sistem.
        </p>
      </div>
    );
  }

  const filteredLogs = logs.filter((l) => {
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      l.user_name?.toLowerCase().includes(term) ||
      l.action?.toLowerCase().includes(term) ||
      l.event_id?.toLowerCase().includes(term) ||
      l.details?.toLowerCase().includes(term);

    const matchModule = moduleFilter === 'ALL' || l.module === moduleFilter;
    const matchResult = resultFilter === 'ALL' || l.result === resultFilter;

    return matchSearch && matchModule && matchResult;
  });

  const uniqueModules = Array.from(new Set(logs.map((l) => l.module).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Log Audit Keselamatan & Aktiviti Data"
          description="Rekod aktiviti tidak boleh diubah (Tamper-Resistant Audit Trail) — Pentadbir & Pengetua sahaja"
        />
        <Button size="sm" variant="outline" onClick={loadLogs} className="text-xs gap-1.5 self-start sm:self-auto">
          <RefreshCw className="w-3.5 h-3.5" /> Segar Semula
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-card border border-border p-3 rounded-xl">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ID Peristiwa, nama, atau tindakan..."
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Semua Modul" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Modul</SelectItem>
              {uniqueModules.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status Keputusan</SelectItem>
              <SelectItem value="SUCCESS">SUCCESS</SelectItem>
              <SelectItem value="DENIED">DENIED / SEKATAN</SelectItem>
              <SelectItem value="FAILED">FAILED</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Tiada rekod log audit ditemui"
          description="Semua aktiviti keselamatan yang sepadan akan dipaparkan di sini."
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                  <th className="text-left px-3 py-2.5">ID Peristiwa</th>
                  <th className="text-left px-3 py-2.5">Pengguna / Peranan</th>
                  <th className="text-left px-3 py-2.5">Tindakan / Jenis</th>
                  <th className="text-left px-3 py-2.5">Modul</th>
                  <th className="text-left px-3 py-2.5">Status</th>
                  <th className="text-left px-3 py-2.5">Perincian / Konteks</th>
                  <th className="text-left px-3 py-2.5">Masa (Timestamp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((l) => (
                  <tr key={l.id || l.event_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground font-medium">
                      {l.event_id || `EVT-${l.id?.slice(0, 6)}`}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-foreground">{l.user_name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-mono">{l.actor_role || 'STUDENT'}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-foreground">{l.action}</span>
                      {l.action_type && (
                        <span className="block text-[10px] text-muted-foreground">{l.action_type}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {l.module}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {l.result === 'DENIED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          <XCircle className="w-3 h-3" /> DENIED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> SUCCESS
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-[11px] max-w-[240px] truncate" title={l.details}>
                      {l.details || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground font-mono text-[10px] whitespace-nowrap">
                      {l.timestamp ? new Date(l.timestamp).toLocaleString('ms-MY') : l.created_date}
                    </td>
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