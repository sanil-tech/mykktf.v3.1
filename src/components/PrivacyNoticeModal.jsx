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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, ExternalLink } from 'lucide-react';
import { OFFICIAL_PRIVACY_NOTICE, recordPrivacyAcknowledgement } from '@/lib/privacyNotice';

export default function PrivacyNoticeModal({ open, onAcknowledge, user }) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [alumniConsent, setAlumniConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await recordPrivacyAcknowledgement(user, {
        marketing: marketingConsent,
        alumni: alumniConsent,
      });
      if (onAcknowledge) onAcknowledge();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Versi {OFFICIAL_PRIVACY_NOTICE.version}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold mt-1">
            {OFFICIAL_PRIVACY_NOTICE.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Sila semak notis privasi ini mengenai bagaimana data peribadi anda diuruskan bagi tujuan kediaman kolej di UMS.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-muted/20 text-xs leading-relaxed space-y-3 whitespace-pre-line my-2">
          {OFFICIAL_PRIVACY_NOTICE.content_ms}
        </div>

        {/* Optional consents separated from core acknowledgement */}
        <div className="space-y-2 border-t pt-3 text-xs">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            Pilihan Kebenaran Tambahan (Fakultatif):
          </p>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="alumni_consent"
              checked={alumniConsent}
              onCheckedChange={setAlumniConsent}
            />
            <Label htmlFor="alumni_consent" className="text-xs font-normal cursor-pointer">
              Saya bersetuju menerima jemputan rangkaian alumni Kolej Kediaman Tun Fuad selepas tamat pengajian.
            </Label>
          </div>
        </div>

        <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleConfirm}
            disabled={submitting || !hasScrolledToBottom}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-2"
          >
            {submitting ? 'Merekodkan...' : 'Saya Mengakui & Memahami Notis Privasi Ini'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
