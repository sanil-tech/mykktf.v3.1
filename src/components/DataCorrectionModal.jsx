import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { logAudit } from '@/lib/audit';

export default function DataCorrectionModal({ open, onOpenChange, user, student }) {
  const [fieldToCorrect, setFieldToCorrect] = useState('full_name');
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const getCurrentValue = () => {
    if (!student) return '';
    return student[fieldToCorrect] || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requestedValue.trim() || !reason.trim()) return;

    setSubmitting(true);
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    try {
      const record = {
        request_id: requestId,
        student_id: user?.id || student?.id || 'UNKNOWN',
        student_name: student?.full_name || user?.full_name || 'Pelajar',
        matric_number: student?.matric_number || user?.matric_number || '',
        field_to_correct: fieldToCorrect,
        current_value: String(getCurrentValue()),
        requested_value: requestedValue.trim(),
        reason: reason.trim(),
        status: 'PENDING',
        created_at: new Date().toISOString(),
      };

      if (base44?.entities?.CorrectionRequest) {
        await base44.entities.CorrectionRequest.create(record);
      }

      await logAudit({
        user,
        action: 'DATA_CORRECTION_REQUESTED',
        action_type: 'CREATE',
        module: 'PrivacyGovernance',
        resource_type: 'CorrectionRequest',
        resource_id: requestId,
        result: 'SUCCESS',
        details: { field: fieldToCorrect, requestedValue },
      });

      setSuccess(true);
    } catch (err) {
      console.error('Failed to submit correction request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setRequestedValue('');
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Permohonan Pembetulan Data Peribadi</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Bagi memastikan integriti rekod autoritatif UMS, pindaan maklumat rasmi memerlukan pengesahan pentadbiran kolej.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <p className="text-sm font-semibold">Permohonan Berjaya Dihantar!</p>
            <p className="text-xs text-muted-foreground">
              Pegawai pentadbiran KKTF akan menyemak permohonan pembetulan data anda. Anda akan dimaklumkan setelah status dikemas kini.
            </p>
            <Button onClick={handleClose} className="mt-4 text-xs">
              Tutup
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="field_select" className="text-xs">Medan Maklumat Yang Ingin Dibetulkan</Label>
              <Select value={fieldToCorrect} onValueChange={setFieldToCorrect}>
                <SelectTrigger id="field_select" className="text-xs">
                  <SelectValue placeholder="Pilih medan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_name">Nama Penuh (Seperti Dalam Kad Pengenalan)</SelectItem>
                  <SelectItem value="ic_passport">Nombor Kad Pengenalan / Pasport</SelectItem>
                  <SelectItem value="matric_number">Nombor Matrik</SelectItem>
                  <SelectItem value="phone_number">Nombor Telefon Peribadi</SelectItem>
                  <SelectItem value="emergency_contact_phone">Nombor Telefon Kecemasan</SelectItem>
                  <SelectItem value="parent_phone">Nombor Telefon Waris</SelectItem>
                  <SelectItem value="address">Alamat Tetap Rumah</SelectItem>
                  <SelectItem value="faculty">Fakulti / Program Pengajian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nilai Semasa Sistem</Label>
              <Input
                value={getCurrentValue() || '(Tiada Maklumat)'}
                disabled
                className="bg-muted text-xs text-muted-foreground"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="requested_val" className="text-xs">Nilai Baharu / Yang Betul</Label>
              <Input
                id="requested_val"
                value={requestedValue}
                onChange={(e) => setRequestedValue(e.target.value)}
                placeholder="Masukkan maklumat yang tepat"
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="reason_input" className="text-xs">Sebab Pembetulan</Label>
              <Textarea
                id="reason_input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Contoh: Kesilapan ejaan nama pada kad pengenalan semasa pendaftaran awal."
                rows={2}
                required
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="text-xs bg-primary">
                {submitting ? 'Menghantar...' : 'Hantar Permohonan'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
