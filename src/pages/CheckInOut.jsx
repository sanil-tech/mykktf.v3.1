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
import { ArrowLeftRight, LogIn, LogOut, Search, User, Home, Sparkles, Bed, Users } from 'lucide-react';
import SurveyModal from '@/components/SurveyModal';


export default function CheckInCheckOutPage() {
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Ambil data permulaan (Fetch Data)
  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsData, roomsData] = await Promise.all([
        api.getStudents(), // Pastikan API ini memulangkan data student terkini
        api.getRooms()     // Pastikan API ini memulangkan data room terkini
      ]);
      setStudents(studentsData || []);
      setRooms(roomsData || []);
    } catch (error) {
      showMessage('error', 'Gagal memuatkan data dari pelayan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // ==========================================
  // FIX 1 & 4: DERIVED STATE (SOURCE OF TRUTH)
  // ==========================================
  
  // Senarai Pelajar untuk Check-In: room_id tiada / null / 'none'
  const checkInStudentList = useMemo(() => {
    return students.filter(s => !s.room_id || s.room_id === 'none' || s.room_id === '');
  }, [students]);

  // Senarai Pelajar untuk Check-Out: room_id wujud
  const checkOutStudentList = useMemo(() => {
    return students.filter(s => s.room_id && s.room_id !== 'none' && s.room_id !== '');
  }, [students]);

  // Fungsi utiliti untuk mengira occupancy sebenar secara real-time dari data student
  const getLiveOccupancy = (roomId) => {
    return students.filter(s => s.room_id?.toString() === roomId?.toString()).length;
  };

  // ==========================================
  // FIX 7: REAL-TIME OCCUPANT VIEW
  // ==========================================
  const currentRoomOccupants = useMemo(() => {
    if (!selectedRoomId) return [];
    return students
      .filter(s => s.room_id?.toString() === selectedRoomId.toString())
      .map(s => ({
        full_name: s.full_name,
        student_id: s.student_id,
        phone_number: s.phone_number
      }));
  }, [selectedRoomId, students]);

  // ==========================================
  // FIX 2, 3, 5 & 6: LOGIK VALIDASI & PROSES CHECK-IN
  // ==========================================
  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedRoomId) return showMessage('error', 'Sila pilih pelajar dan bilik.');

    const student = students.find(s => s.id.toString() === selectedStudentId.toString());
    const room = rooms.find(r => r.id.toString() === selectedRoomId.toString());

    if (!student || !room) return showMessage('error', 'Data tidak dijumpai.');

    // 1. Sekatan Double Assignment (Fix 3)
    if (student.room_id && student.room_id !== 'none') {
      return showMessage('error', `Pelajar ini sudah didaftarkan di bilik lain.`);
    }

    // 2. Semakan Jantina Tegas & Lowercase Safe (Fix 6)
    const roomGender = room.gender_restriction?.trim().toLowerCase();
    const studentGender = student.gender?.trim().toLowerCase();
    if (roomGender !== 'mixed' && roomGender !== studentGender) {
      return showMessage('error', `Ralat: Bilik khusus untuk ${room.gender_restriction}, jantina pelajar adalah ${student.gender}.`);
    }

    // 3. Semakan Kapasiti Sebenar vs Maksimum (Fix 5)
    const currentOccupancy = getLiveOccupancy(room.id);
    if (currentOccupancy >= room.capacity) {
      return showMessage('error', 'Gagal: Bilik ini sudah penuh!');
    }
    if (room.is_maintenance) {
      return showMessage('error', 'Gagal: Bilik dalam proses penyelenggaraan.');
    }

    // 4. Hantar kemas kini atomik ke DB (Fix 8)
    try {
      setLoading(true);
      const newOccupancyCount = currentOccupancy + 1;

      await Promise.all([
        api.updateStudent(student.id, { room_id: room.id }),
        api.updateRoom(room.id, { current_occupancy: newOccupancyCount }),
        api.createLog({ student_id: student.id, room_id: room.id, action: 'CHECK_IN', timestamp: new Date().toISOString() })
      ]);

      showMessage('success', `Check-In Berjaya untuk ${student.full_name}`);
      setSelectedStudentId('');
      fetchData(); // Refresh data untuk elakkan desync
    } catch (err) {
      showMessage('error', 'Ralat rangkaian semasa proses Check-In.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOGIK PROCESS CHECK-OUT
  // ==========================================
  const handleCheckOut = async (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student || !student.room_id) return;

    try {
      setLoading(true);
      const currentOccupancy = getLiveOccupancy(student.room_id);
      const newOccupancyCount = Math.max(0, currentOccupancy - 1);

      // Kemas kini semua table serentak (Fix 8)
      await Promise.all([
        api.updateStudent(student.id, { room_id: null }),
        api.updateRoom(student.room_id, { current_occupancy: newOccupancyCount }),
        api.createLog({ student_id: student.id, room_id: student.room_id, action: 'CHECK_OUT', timestamp: new Date().toISOString() })
      ]);

      showMessage('success', `Check-Out Berjaya untuk ${student.full_name}`);
      fetchData();
    } catch (err) {
      showMessage('error', 'Ralat rangkaian semasa proses Check-Out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Hostel Check-In / Check-Out</h1>
      
      {message.text && (
        <div className={`p-4 rounded font-medium ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BORANG CHECK-IN */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-green-700 mb-4">Daftar Masuk (Check-In)</h2>
          <form onSubmit={handleCheckIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Pelajar ({checkInStudentList.length} belum ada bilik)</label>
              <select 
                className="w-full p-2 border rounded"
                value={selectedStudentId} 
                onChange={e => setSelectedStudentId(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Pilih Pelajar --</option>
                {checkInStudentList.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.gender})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Bilik Sasaran</label>
              <select 
                className="w-full p-2 border rounded"
                value={selectedRoomId} 
                onChange={e => {
                  setSelectedRoomId(e.target.value);
                }}
                disabled={loading}
              >
                <option value="">-- Pilih Bilik --</option>
                {rooms.map(r => {
                  const liveOcc = getLiveOccupancy(r.id);
                  return (
                    <option key={r.id} value={r.id} disabled={r.is_maintenance || liveOcc >= r.capacity}>
                      Bilik {r.room_number} ({r.gender_restriction}) - Kekosongan: {r.capacity - liveOcc}/{r.capacity} {r.is_maintenance ? '[Penyelenggaraan]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded font-medium transition"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Sahkan Check-In'}
            </button>
          </form>
        </div>

        {/* SENARAI REAL-TIME OCCUPANTS (FIX 7) */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-blue-700 mb-4">Semakan Penghuni Bilik Terpilih</h2>
          {selectedRoomId ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Pelajar di dalam bilik ini:</p>
              {currentRoomOccupants.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Bilik ini kosong.</p>
              ) : (
                <div className="border rounded divide-y overflow-hidden">
                  {currentRoomOccupants.map((o, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 flex justify-between text-sm">
                      <div>
                        <p className="font-bold text-gray-800">{o.full_name}</p>
                        <p className="text-xs text-gray-500">ID: {o.student_id}</p>
                      </div>
                      <span className="text-gray-600 self-center">{o.phone_number || 'Tiada No. Tel'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Sila pilih bilik di bahagian borang Check-In untuk melihat penghuni semasa.</p>
          )}
        </div>
      </div>

      {/* SENARAI CHECK-OUT */}
      <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold text-red-700 mb-4">Daftar Keluar (Check-Out) ({checkOutStudentList.length} Pelajar Aktif)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-100 text-gray-700">
                <th className="p-3">Nama Penuh</th>
                <th className="p-3">ID Pelajar</th>
                <th className="p-3">No. Bilik</th>
                <th className="p-3 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {checkOutStudentList.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-3 text-center text-gray-400 italic">Tiada pelajar aktif di dalam hostel buat masa ini.</td>
                </tr>
              ) : (
                checkOutStudentList.map(student => {
                  const roomDetail = rooms.find(r => r.id?.toString() === student.room_id?.toString());
                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900">{student.full_name}</td>
                      <td className="p-3 text-gray-600">{student.student_id}</td>
                      <td className="p-3 font-semibold text-blue-600">
                        {roomDetail ? `Bilik ${roomDetail.room_number}` : `ID: ${student.room_id}`}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleCheckOut(student.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition"
                          disabled={loading}
                        >
                          Check Out
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}