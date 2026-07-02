import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogIn, LogOut, Search, User, Sparkles, Bed } from 'lucide-react';
import SurveyModal from '@/components/SurveyModal';

export default function CheckInOut() {
  const [checkIns, setCheckIns] = useState([]);
  const [checkOuts, setCheckOuts] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [submitting, setSubmitting] = useState(false);
  
  const [ciDialog, setCiDialog] = useState(false);
  const [coDialog, setCoDialog] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [showSurvey, setShowSurvey] = useState(false);
  
  const [studentSearch, setStudentSearch] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [selectedBlock, setSelectedBlock] = useState('');
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  
  const [ciForm, setCiForm] = useState({ room_id: '', check_in_date: '', check_in_time: '', notes: '' });
  const [coForm, setCoForm] = useState({ check_out_date: '', check_out_time: '', room_condition: 'Good', damage_assessment: '', refund_amount: 0 });
  
  const [currentUser, setCurrentUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
    load();
  }, []);

  async function load() {
    try {
      const [ci, co, s, r] = await Promise.all([
        base44.entities.CheckIn.list('-created_date'),
        base44.entities.CheckOut.list('-created_date'),
        base44.entities.Student.list(),
        base44.entities.Room.list(),
      ]);
      setCheckIns(ci);
      setCheckOuts(co);
      setStudents(s);
      setRooms(r);
    } catch (err) {
      toast({ title: 'Ralat memuatkan data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // ... (Fungsi logik carian, penapisan blok, dan UI render kekal sama seperti versi pertama)

  async function handleCheckIn() {
    if (submitting) return; 
    if (!selectedStudent || !ciForm.room_id || !ciForm.check_in_date) {
      toast({ title: 'Sila pilih pelajar, bilik, dan tarikh check-in', variant: 'destructive' });
      return;
    }

    setSubmitting(true); 
    try {
      const room = rooms.find(r => r.id === ciForm.room_id);

      await base44.entities.CheckIn.create({
        student_id: selectedStudent.id,
        student_name: selectedStudent.full_name || '',
        room_id: ciForm.room_id,
        room_number: room?.room_number || '',
        block_name: room?.block_name || '',
        check_in_date: ciForm.check_in_date,
        check_in_time: ciForm.check_in_time,
        approved_by: currentUser?.full_name || currentUser?.username || 'System Admin',
        notes: ciForm.notes
      });

      await base44.entities.Student.update(selectedStudent.id, {
        block_name: room.block_name || '',
        room_number: room.room_number || '',
        room_id: room.id,
        check_in_date: ciForm.check_in_date,
        room_status: 'Checked In',
        status: 'Student'
      });

      const currentCachedOccupancy = room.current_occupancy || 0;
      const newOccupancy = currentCachedOccupancy + 1;
      const capacity = room.capacity || 4;
      const nextStatus = newOccupancy >= capacity ? 'Full' : 'Occupied';

      // Kemaskini bilik yang asas tanpa memaksa parameter skema yang mungkin tiada
      await base44.entities.Room.update(room.id, {
        current_occupancy: newOccupancy,
        status: nextStatus,
        room_status: nextStatus
      });

      toast({ title: 'Berjaya', description: 'Check-in direkodkan.' });
      setCiDialog(false);
      await load(); 
    } catch (err) {
      toast({ title: 'Ralat rekod check-in', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false); 
    }
  }

  // JSX rendering dipendekkan untuk tujuan penyelesaian masalah asas
  return (
    <div>
      <PageHeader title="Check-In / Check-Out" />
      {/* ... Baki UI Dialog dan Jadual (seperti kod sebelum ini) ... */}
    </div>
  );
}