import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { FileBarChart, Download, Loader2, FileSpreadsheet, FileText, CheckCheck, Square } from 'lucide-react';
import { jsPDF } from 'jspdf';

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

const SKIP_KEYS = (k) => k !== 'id' && !k.startsWith('created_by');

export default function Reports() {
  const [reportType, setReportType] = useState('residents');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [selectedCols, setSelectedCols] = useState([]);
  const { toast } = useToast();

  const allColumns = useMemo(() => {
    if (!data || data.records.length === 0) return [];
    return Object.keys(data.records[0]).filter(SKIP_KEYS);
  }, [data]);

  useEffect(() => {
    if (allColumns.length > 0) setSelectedCols(allColumns);
  }, [allColumns]);

  function toggleCol(col) {
    setSelectedCols(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  }

  function selectAllCols() { setSelectedCols(allColumns); }
  function clearCols() { setSelectedCols([]); }

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

  const activeCols = allColumns.filter(c => selectedCols.includes(c));

  function exportCSV() {
    if (!data || data.records.length === 0 || activeCols.length === 0) return;
    const csv = [activeCols.join(','), ...data.records.map(r => activeCols.map(h => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.type.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    if (!data || data.records.length === 0 || activeCols.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 36;
    const usableW = pageW - margin * 2;
    const colW = usableW / activeCols.length;
    let y = 0;

    // Header band
    doc.setFillColor(11, 30, 54);
    doc.rect(0, 0, pageW, 64, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Kolej Kediaman Tun Fuad (KKTF)', margin, 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(data.type, margin, 48);
    doc.text('Generated: ' + data.generated, pageW - margin, 48, { align: 'right' });

    y = 84;
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(7.5);

    // Table header
    doc.setFillColor(19, 42, 74);
    doc.rect(margin, y - 11, usableW, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    activeCols.forEach((c, i) => {
      const label = c.replace(/_/g, ' ').toUpperCase();
      doc.text(label.length > 22 ? label.substring(0, 22) + '…' : label, margin + i * colW + 4, y);
    });
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);

    const maxChars = Math.max(6, Math.floor(colW / 4.5));
    data.records.forEach((r, idx) => {
      if (y > pageH - margin - 16) {
        doc.addPage();
        y = margin;
      }
      if (idx % 2 === 0) {
        doc.setFillColor(244, 247, 251);
        doc.rect(margin, y - 10, usableW, 14, 'F');
      }
      activeCols.forEach((c, i) => {
        const val = (r[c] ?? '').toString();
        doc.text(val.length > maxChars ? val.substring(0, maxChars) + '…' : val, margin + i * colW + 4, y);
      });
      y += 14;
    });

    // Footer page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setTextColor(130, 130, 130);
      doc.text(`KKTF Report — Page ${p} of ${pageCount}`, pageW - margin, pageH - 10, { align: 'right' });
    }

    doc.save(`${data.type.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  function exportExcel() {
    if (!data || data.records.length === 0 || activeCols.length === 0) return;
    const esc = (v) => (v ?? '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const headerCells = activeCols.map(c =>
      `<th style="background:#132A4A;color:#fff;font-weight:700;padding:6px 8px;border:1px solid #cbd5e1;text-align:left;">${esc(c.replace(/_/g, ' '))}</th>`
    ).join('');
    const bodyRows = data.records.map((r, i) => {
      const cells = activeCols.map(c =>
        `<td style="padding:5px 8px;border:1px solid #e2e8f0;background:${i % 2 ? '#f8fafc' : '#ffffff'}">${esc(r[c] ?? '')}</td>`
      ).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    const html = `<table border="1" style="border-collapse:collapse;font-family:Arial;font-size:11px;"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.type.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.xls`;
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
          {/* Header + export buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-border gap-3">
            <div>
              <h3 className="text-sm font-heading font-semibold">{data.type}</h3>
              <p className="text-[10px] text-muted-foreground">Generated: {data.generated} · {data.records.length} records</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={exportCSV} disabled={data.records.length === 0 || activeCols.length === 0}>
                <Download className="w-4 h-4 mr-1.5" /> CSV
              </Button>
              <Button size="sm" variant="outline" onClick={exportExcel} disabled={data.records.length === 0 || activeCols.length === 0}>
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" /> Excel
              </Button>
              <Button size="sm" onClick={exportPDF} disabled={data.records.length === 0 || activeCols.length === 0}>
                <FileText className="w-4 h-4 mr-1.5" /> PDF
              </Button>
            </div>
          </div>

          {/* Column selector */}
          {allColumns.length > 0 && (
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground">Pilih Lajur Eksport ({activeCols.length}/{allColumns.length})</p>
                <div className="flex items-center gap-2">
                  <button onClick={selectAllCols} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" /> Semua
                  </button>
                  <button onClick={clearCols} className="text-[11px] text-muted-foreground hover:underline flex items-center gap-1">
                    <Square className="w-3 h-3" /> Kosong
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allColumns.map(col => {
                  const active = selectedCols.includes(col);
                  return (
                    <button
                      key={col}
                      onClick={() => toggleCol(col)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/40'}`}
                    >
                      {col.replace(/_/g, ' ')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preview table */}
          {data.records.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No records found for the selected criteria.</div>
          ) : activeCols.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Sila pilih sekurang-kurangnya satu lajur untuk paparan & eksport.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {activeCols.map(k => (
                      <th key={k} className="text-left px-3 py-2 font-medium text-muted-foreground uppercase">{k.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.records.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      {activeCols.map(k => (
                        <td key={k} className="px-3 py-2 text-muted-foreground max-w-[160px] truncate">{r[k]?.toString() || '—'}</td>
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