import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { FileBarChart, Download, Loader2 } from 'lucide-react';

const REPORT_TYPES = [
  { value: 'residents', label: 'Resident List', entity: 'Student' },
  { value: 'occupancy', label: 'Occupancy Report', entity: 'Room' },
  { value: 'maintenance', label: 'Maintenance Report', entity: 'MaintenanceRequest' },
  { value: 'attendance', label: 'Attendance Report', entity: 'Attendance' },
  { value: 'leave', label: 'Leave Report', entity: 'LeaveApplication' },
  { value: 'visitors', label: 'Visitor Report', entity: 'Visitor' },
  { value: 'parcels', label: 'Parcel Report', entity: 'Parcel' },
  { value: 'fees', label: 'Fee Report', entity: 'Fee' },
  { value: 'discipline', label: 'Discipline Report', entity: 'DisciplineRecord' },
];

export default function Reports() {
  const [reportType, setReportType] = useState('residents');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  async function generateReport() {
    setGenerating(true);
    const config = REPORT_TYPES.find(r => r.value === reportType);
    const allData = await base44.entities[config.entity].list('-created_date');

    let filtered = allData;
    if (dateFrom || dateTo) {
      filtered = allData.filter(item => {
        const d = item.created_date?.split('T')[0] || '';
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });
    }

    setData({ type: config.label, records: filtered, generated: new Date().toLocaleString() });
    setGenerating(false);
    toast({ title: `${config.label} generated with ${filtered.length} records` });
  }

  function exportCSV() {
    if (!data || data.records.length === 0) return;
    const headers = Object.keys(data.records[0]).filter(k => k !== 'id' && !k.startsWith('created_by'));
    const csv = [headers.join(','), ...data.records.map(r => headers.map(h => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.type.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader title="Reports" description="Generate and export system reports" />

      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <Label className="text-xs">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{REPORT_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Date From</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-sm mt-1" />
          </div>
          <div>
            <Label className="text-xs">Date To</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-sm mt-1" />
          </div>
          <Button onClick={generateReport} disabled={generating} size="sm" className="h-9">
            {generating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileBarChart className="w-4 h-4 mr-1.5" />}
            Generate
          </Button>
        </div>
      </div>

      {data && (
        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <h3 className="text-sm font-heading font-semibold">{data.type}</h3>
              <p className="text-[10px] text-muted-foreground">Generated: {data.generated} · {data.records.length} records</p>
            </div>
            <Button size="sm" variant="outline" onClick={exportCSV} disabled={data.records.length === 0}>
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
          </div>
          {data.records.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No records found for the selected criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {Object.keys(data.records[0]).filter(k => k !== 'id' && !k.startsWith('created_by')).slice(0, 6).map(k => (
                      <th key={k} className="text-left px-3 py-2 font-medium text-muted-foreground uppercase">{k.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.records.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      {Object.keys(r).filter(k => k !== 'id' && !k.startsWith('created_by')).slice(0, 6).map(k => (
                        <td key={k} className="px-3 py-2 text-muted-foreground max-w-[150px] truncate">{r[k]?.toString() || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.records.length > 50 && <p className="text-xs text-muted-foreground text-center py-2">Showing first 50 of {data.records.length} records</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}