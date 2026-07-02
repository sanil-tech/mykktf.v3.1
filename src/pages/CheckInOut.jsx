import React, { useState, useMemo, useEffect } from 'react';
import { verifyAndSyncOccupancy } from './hostelSyncService';

// Sila hubungkan ke laluan fail konfigurasi Base44/API asal anda
import { api } from '../services/api'; 

export default function CheckInCheckOutPage() {
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Requirement 5: Segarkan semua senarai entiti secara serentak
  const refreshAllData = async () => {
    try {
      setLoading(true);
      const [studentsData, roomsData] = await Promise.all([
        api.getStudents(), // Student.list()
        api.getRooms()     // Room.list()
      ]);
      setStudents(studentsData || []);
      setRooms(roomsData || []);
    } catch (error) {
      handleNotification('error', 'Gagal menyegarkan data sistem.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const handleNotification = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Requirement 4: Tapisan list berasaskan Source of Truth
  const checkInList = useMemo(() => students.filter(s => !s.room_id || s.room_id === 'none' || s.room_id === ''), [students]);
  const checkOutList = useMemo(() => students.filter(s => s.room_id && s.room_id !== 'none' && s.room_id !== ''), [students]);

  // Requirement 6: Paparan Occupant List mengikut pilihan bilik secara tepat
  const liveOccupants = useMemo(() => {
    if (!selectedRoomId) return [];
    return students.filter(s => s.room_id?.toString() === selectedRoomId.toString());
  }, [selectedRoomId, students]);

  // Fungsi pembantu untuk mengira status berdasarkan bilangan penghuni terkini
  const computeStatus = (occupancy, capacity) => {
    if (occupancy >= capacity) return 'Full';
    if (occupancy > 0) return 'Occupied';
    return 'Available';
  };

  // ============================================================================
  // ALIRAN KERJA PROSES CHECK-IN (Requirement 1, 3, 4, 5)
  // ============================================================================
  const executeCheckIn = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedRoomId) return handleNotification('error', 'Sila lengkapkan pilihan borang.');

    try {
      setLoading(true);

      // ⚠️ Requirement 3: Ambil rekod Room paling terkini dari DB untuk elak desync
      const latestRoomSnapshot = await api.getRoomById(selectedRoomId); 
      const targetStudent = students.find(s => s.id.toString() === selectedStudentId.toString());

      if (!latestRoomSnapshot || !targetStudent) throw new Error('Maklumat entiti tidak sahih.');
      if (latestRoomSnapshot.is_maintenance) throw new Error('Bilik sedang diselenggara.');

      // ⚠️ Requirement 4: Validasi Kapasiti Ketat sebelum proses diteruskan
      if (latestRoomSnapshot.current_occupancy >= latestRoomSnapshot.capacity) {
        throw new Error(`Pendaftaran Ditolak: Bilik ${latestRoomSnapshot.room_number} sudah penuh!`);
      }

      // Hitung nilai baru berdasarkan rekod terkini database snapshot
      const updatedOccupancy = latestRoomSnapshot.current_occupancy + 1;
      const updatedStatus = computeStatus(updatedOccupancy, latestRoomSnapshot.capacity);

      // 📦 Requirement 1: Kemas kini TIGA entiti secara berturutan / atomik
      await Promise.all([
        // A. Cipta Log Check-In
        api.createCheckIn({
          student_id: targetStudent.id,
          room_id: latestRoomSnapshot.id,
          check_in_date: new Date().toISOString()
        }),
        // B. Kemas kini data Student
        api.updateStudent(targetStudent.id, {
          room_id: latestRoomSnapshot.id,
          room_number: latestRoomSnapshot.room_number,
          block_name: latestRoomSnapshot.block_name
        }),
        // C. Kemas kini data Room
        api.updateRoom(latestRoomSnapshot.id, {
          current_occupancy: updatedOccupancy,
          status: updatedStatus
        })
      ]);

      handleNotification('success', `Check-In Berjaya bagi pelajar ${targetStudent.full_name}.`);
      setSelectedStudentId('');
      
      // 🔄 Requirement 5 & 7: Refresh Data + Jalankan Auto-Verification
      await refreshAllData();
      await verifyAndSyncOccupancy(api);

    } catch (err) {
      handleNotification('error', err.message || 'Ralat berlaku semasa transaksi data.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // ALIRAN KERJA PROSES CHECK-OUT (Requirement 2, 3, 5)
  // ============================================================================
  const executeCheckOut = async (student) => {
    if (!student.room_id) return;
    
    if (!window.confirm(`Sahkan tindakan Check-Out untuk ${student.full_name}?`)) return;

    try {
      setLoading(true);

      // ⚠️ Requirement 3: Ambil snapshot bilik yang paling baru dari DB
      const latestRoomSnapshot = await api.getRoomById(student.room_id);
      if (!latestRoomSnapshot) throw new Error('Bilik tidak dijumpai dalam pangkalan data.');

      const updatedOccupancy = Math.max(0, latestRoomSnapshot.current_occupancy - 1);
      const updatedStatus = computeStatus(updatedOccupancy, latestRoomSnapshot.capacity);

      // 📦 Requirement 2: Kosongkan Student & Tolak Kuantiti Room
      await Promise.all([
        // A. Kosongkan nilai bilik pada Student
        api.updateStudent(student.id, {
          room_id: "",
          room_number: "",
          block_name: ""
        }),
        // B. Kemas kini data Room
        api.updateRoom(latestRoomSnapshot.id, {
          current_occupancy: updatedOccupancy,
          status: updatedStatus
        })
      ]);

      handleNotification('success', `Pelajar ${student.full_name} berjaya didaftar keluar.`);
      
      // 🔄 Requirement 5 & 7: Refresh & Verifikasi
      await refreshAllData();
      await verifyAndSyncOccupancy(api);

    } catch (err) {
      handleNotification('error', err.message || 'Gagal memproses data Check-Out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Urusan Check-In / Check-Out</h1>
        <p className="text-xs text-gray-500">Penyelarasan Data Berpusat Kategori Segera</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-md font-bold ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BORANG DAFTAR MASUK */}
        <div className="bg-white p-5 rounded-lg shadow border">
          <h2 className="text-lg font-bold text-green-700 mb-4">📥 Pendaftaran Masuk (Check-In)</h2>
          <form onSubmit={executeCheckIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Pelajar ({checkInList.length})</label>
              <select className="w-full p-2 border rounded" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} disabled={loading}>
                <option value="">-- Sila Pilih Pelajar --</option>
                {checkInList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Bilik Sasaran</label>
              <select className="w-full p-2 border rounded" value={selectedRoomId} onChange={e => setSelectedRoomId(e.target.value)} disabled={loading}>
                <option value="">-- Sila Pilih Bilik --</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id} disabled={r.is_maintenance || r.current_occupancy >= r.capacity}>
                    Bilik {r.room_number} ({r.status}) — [{r.current_occupancy}/{r.capacity}]
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white p-2.5 rounded font-bold transition" disabled={loading}>
              {loading ? 'Memproses...' : 'Sahkan Tugasan Bilik'}
            </button>
          </form>
        </div>

        {/* REKOD SENARAI PENGHUNI BERSANDARKAN PILIHAN (Requirement 6) */}
        <div className="bg-white p-5 rounded-lg shadow border">
          <h2 className="text-lg font-bold text-blue-700 mb-4">👁️ Senarai Penghuni Bilik Terpilih ({liveOccupants.length})</h2>
          {selectedRoomId ? (
            liveOccupants.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Bilik ini tiada penghuni aktif (Kosong).</p>
            ) : (
              <ul className="divide-y border rounded bg-gray-50 max-h-56 overflow-y-auto">
                {liveOccupants.map(student => (
                  <li key={student.id} className="p-3 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-bold text-gray-800">{student.full_name}</p>
                      <p className="text-xs text-gray-500">ID: {student.student_id}</p>
                    </div>
                    <span className="text-xs font-mono bg-white border px-2 py-1 rounded text-gray-600">{student.phone_number || 'Tiada No. Tel'}</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="text-sm text-gray-400 italic">Sila klik atau pilih salah satu bilik sasaran untuk melihat ahli penghuni.</p>
          )}
        </div>
      </div>

      {/* BAHAGIAN SENARAI DAFTAR KELUAR */}
      <div className="bg-white p-5 rounded-lg shadow border">
        <h2 className="text-lg font-bold text-red-700 mb-4">📤 Senarai Pendaftaran Keluar ({checkOutList.length} Pelajar Aktif)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-3">Nama Penuh</th>
                <th className="p-3">Nombor Bilik</th>
                <th className="p-3">Blok</th>
                <th className="p-3 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {checkOutList.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-400 italic">Tiada data penghuni di hostel ketika ini.</td>
                </tr>
              ) : (
                checkOutList.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-800">{student.full_name}</td>
                    <td className="p-3 text-blue-600 font-semibold">Bilik {student.room_number || 'N/A'}</td>
                    <td className="p-3 text-gray-600">{student.block_name || 'N/A'}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => executeCheckOut(student)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded font-bold text-xs transition" disabled={loading}>
                        Check Out
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}