import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Backend function untuk pengurusan Express Drop-Key Check-Out
 * Dijalankan dengan kuasa Service Role (asServiceRole) supaya:
 * 1. Pelajar boleh menghantar permohonan CheckOut tanpa sekatan RLS
 * 2. Pengetua & Pentadbir Kolej dijamin dapat membaca semua permohonan serahan kunci tanpa ralat RLS
 * 3. Mengelakkan rekod pendua (deduplikasi automatik)
 * 4. Memastikan status imbasan QR peti drop-box diselaraskan dengan tepat
 */
export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'list';

    // ─── ACTION 1: SUBMIT (Hantar / Kemaskini Permohonan Drop-Key oleh Pelajar) ─
    if (action === 'submit') {
      const data = body.data || {};
      const studentDbId = data.student_db_id || data.student_entity_id || '';
      const localId = data.id || `dk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const matricKey = (data.student_matric || data.student_id || '').trim();

      // Periksa sama ada sudah ada rekod pending untuk pelajar ini bagi mengelakkan duplikasi
      const allCheckouts = await base44.asServiceRole.entities.CheckOut.list('-created_date').catch(() => []);
      const existingPending = (allCheckouts || []).find(c =>
        c.status === 'pending_verification' && (
          (matricKey && String(c.student_matric || c.student_id || '').toLowerCase() === matricKey.toLowerCase()) ||
          (studentDbId && String(c.student_id) === String(studentDbId)) ||
          (c.block_name === data.block_name && String(c.room_number) === String(data.room_number))
        )
      );

      const scanTimestamp = data.scanned_at_dropbox || new Date().toISOString();

      const checkOutPayload = {
        student_id: studentDbId || matricKey || 'student',
        student_name: data.student_name || user?.full_name || 'Pelajar Residen',
        room_id: data.room_id || 'room_dropkey',
        room_number: data.room_number || '',
        block_name: data.block_name || '',
        check_out_date: data.checkout_date || new Date().toISOString().split('T')[0],
        check_out_time: data.checkout_time || '08:00',
        room_condition: 'Good',
        damage_assessment: [
          '[EXPRESS DROP-KEY]',
          `[QR Sah Diimbas pada ${new Date().toLocaleTimeString('ms-MY')}]`,
          data.envelope_tag ? `Tag: ${data.envelope_tag}` : '',
          data.reason ? `Sebab: ${data.reason}` : '',
          localId ? `LocalID: ${localId}` : ''
        ].filter(Boolean).join(' | '),
        status: 'pending_verification',
        student_matric: matricKey,
        semester: data.semester || 'Sem1_2526',
        notes: JSON.stringify({
          local_id: localId,
          user_id: user?.id || data.user_id || '',
          student_email: data.student_email || user?.email || '',
          student_phone: data.student_phone || '',
          envelope_tag: data.envelope_tag || '',
          reason: data.reason || 'Tamat Semester',
          declaration_agreed: true,
          photos: data.photos || {},
          scanned_at_dropbox: scanTimestamp,
          created_at: data.created_at || new Date().toISOString()
        })
      };

      let checkoutRecord = null;
      if (existingPending) {
        // Kemaskini rekod sedia ada (tiada entri pendua dicipta)
        checkoutRecord = await base44.asServiceRole.entities.CheckOut.update(existingPending.id, checkOutPayload);
      } else {
        checkoutRecord = await base44.asServiceRole.entities.CheckOut.create(checkOutPayload);
      }

      // Kemaskini status pelajar dalam pangkalan data
      const studentNotes = JSON.stringify({
        active_drop_key_id: checkoutRecord.id,
        local_id: localId,
        envelope_tag: data.envelope_tag || '',
        scanned_at_dropbox: scanTimestamp,
        date: checkOutPayload.check_out_date
      });

      if (studentDbId) {
        await base44.asServiceRole.entities.Student.update(studentDbId, {
          room_status: 'Pending Verification',
          notes: studentNotes
        }).catch(() => {});
      } else if (matricKey) {
        const matchingStudents = await base44.asServiceRole.entities.Student.filter({ student_id: matricKey }).catch(() => []);
        if (matchingStudents.length > 0) {
          await base44.asServiceRole.entities.Student.update(matchingStudents[0].id, {
            room_status: 'Pending Verification',
            notes: studentNotes
          }).catch(() => {});
        }
      }

      // Log Audit
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user?.id || 'student',
        user_name: data.student_name || user?.full_name || 'Pelajar Residen',
        action: 'DROP_KEY_SUBMISSION',
        module: 'Drop-Key Check-Out',
        details: `Permohonan serahan kunci bilik ${data.block_name} ${data.room_number} (ID: ${localId})`,
        timestamp: new Date().toISOString()
      }).catch(() => {});

      return Response.json({
        success: true,
        checkoutRecord,
        localId
      });
    }

    // ─── HELPER: PENGESAN DATA TEST STUDENT ──────────────────────────────────
    const isTestRecord = (c: any) => {
      if (!c) return false;
      const name = String(c.student_name || '').toLowerCase().trim();
      const matric = String(c.student_matric || c.student_id || '').toLowerCase().trim();
      const dbId = String(c.student_id || '').toLowerCase().trim();
      const notes = String(c.notes || '').toLowerCase();
      return (
        name === 'pelajar residen' ||
        name === 'test student' ||
        name === 'student test' ||
        matric === 'student' ||
        matric === 'test' ||
        matric === 'stud_active' ||
        matric === 'bi22110001' ||
        dbId === 'student' ||
        dbId === 'stud_active' ||
        notes.includes('"local_id":"dk_test')
      );
    };

    // ─── ACTION: PURGE TEST DATA (Hapuskan Semua Rekod Test Student) ───────────
    if (action === 'purge_test_data') {
      const allCheckouts = await base44.asServiceRole.entities.CheckOut.list('-created_date').catch(() => []);
      const testCheckouts = (allCheckouts || []).filter(isTestRecord);
      await Promise.all(testCheckouts.map(c => base44.asServiceRole.entities.CheckOut.delete(c.id).catch(() => {})));

      const allStudents = await base44.asServiceRole.entities.Student.list().catch(() => []);
      const testStudents = (allStudents || []).filter((s: any) => {
        const name = String(s.full_name || '').toLowerCase().trim();
        const matric = String(s.student_id || '').toLowerCase().trim();
        return name === 'pelajar residen' || name === 'test student' || matric === 'student' || matric === 'stud_active';
      });
      await Promise.all(testStudents.map((s: any) => base44.asServiceRole.entities.Student.delete(s.id).catch(() => {})));

      return Response.json({
        success: true,
        deletedCheckouts: testCheckouts.length,
        deletedStudents: testStudents.length
      });
    }

    // ─── ACTION 2: LIST & DEDUPLICATE (Senarai Bersih Tanpa Rekod Pendua) ─────
    if (action === 'list') {
      const allCheckouts = await base44.asServiceRole.entities.CheckOut.list('-created_date').catch(() => []);
      
      // Padam dan singkirkan sebarang rekod test student
      const testCheckoutsToDelete: string[] = [];
      const cleanAllCheckouts = (allCheckouts || []).filter(c => {
        if (isTestRecord(c)) {
          if (c.id) testCheckoutsToDelete.push(c.id);
          return false;
        }
        return true;
      });

      if (testCheckoutsToDelete.length > 0) {
        Promise.all(testCheckoutsToDelete.map(id => 
          base44.asServiceRole.entities.CheckOut.delete(id).catch(() => {})
        )).catch(() => {});
      }

      const dropKeyCheckouts = cleanAllCheckouts.filter(c =>
        c.status === 'pending_verification' ||
        String(c.room_condition || '').includes('Drop-Key') ||
        String(c.damage_assessment || '').includes('DROP-KEY') ||
        String(c.damage_assessment || '').includes('Express Drop-Key') ||
        String(c.damage_assessment || '').includes('[EXPRESS DROP-KEY]')
      );

      // Deduplikasi Pintar: Simpan hanya 1 rekod pending terkini untuk setiap pelajar/bilik
      const seenStudentKeys = new Set();
      const uniqueCheckouts: any[] = [];
      const duplicateIdsToDelete: string[] = [];

      for (const c of dropKeyCheckouts) {
        const studentKey = String(c.student_matric || c.student_id || c.student_name || '').toLowerCase().trim();
        const roomKey = `${c.block_name || ''}_${c.room_number || ''}`.toLowerCase().trim();
        const dedupeKey = c.status === 'pending_verification'
          ? `pending__${studentKey || roomKey}`
          : `resolved__${c.id}`;

        if (!seenStudentKeys.has(dedupeKey)) {
          seenStudentKeys.add(dedupeKey);
          uniqueCheckouts.push(c);
        } else {
          // Rekod ini adalah pendua berlebihan, tandakan untuk dipadam daripada DB
          if (c.id) {
            duplicateIdsToDelete.push(c.id);
          }
        }
      }

      // Padam entri pendua di latar belakang supaya pangkalan data kembali bersih
      if (duplicateIdsToDelete.length > 0) {
        Promise.all(duplicateIdsToDelete.map(id => 
          base44.asServiceRole.entities.CheckOut.delete(id).catch(() => {})
        )).catch(() => {});
      }

      const rawPendingStudents = await base44.asServiceRole.entities.Student.filter({ room_status: 'Pending Verification' }).catch(() => []);
      const pendingStudents = (rawPendingStudents || []).filter((s: any) => {
        const name = String(s.full_name || '').toLowerCase().trim();
        const matric = String(s.student_id || '').toLowerCase().trim();
        return name !== 'pelajar residen' && name !== 'test student' && matric !== 'student' && matric !== 'stud_active';
      });

      return Response.json({
        success: true,
        checkouts: uniqueCheckouts,
        pendingStudents,
        cleanedDuplicatesCount: duplicateIdsToDelete.length,
        cleanededTestCount: testCheckoutsToDelete.length
      });
    }

    // ─── ACTION 3: SCAN QR (Kemaskini Pengesahan QR Peti oleh Pelajar) ─────────
    if (action === 'scan_qr') {
      const { requestId, checkoutRecordId, studentMatric } = body;
      const scanTime = new Date().toISOString();

      const allCheckouts = await base44.asServiceRole.entities.CheckOut.list('-created_date').catch(() => []);
      const target = allCheckouts.find(c =>
        c.id === checkoutRecordId ||
        (c.notes && c.notes.includes(requestId)) ||
        (studentMatric && String(c.student_matric || '').toLowerCase() === String(studentMatric).toLowerCase())
      );

      if (target) {
        let meta = {};
        try { meta = JSON.parse(target.notes || '{}'); } catch (e) {}
        meta.scanned_at_dropbox = scanTime;

        await base44.asServiceRole.entities.CheckOut.update(target.id, {
          damage_assessment: `[EXPRESS DROP-KEY] [QR Sah Diimbas pada ${new Date().toLocaleTimeString('ms-MY')}] ${meta.envelope_tag || ''}`.trim(),
          notes: JSON.stringify(meta)
        }).catch(() => {});
      }

      return Response.json({ success: true, scanTime });
    }

    // ─── ACTION 4: APPROVE (Kelulusan oleh Staf / Pengetua) ───────────────────
    if (action === 'approve') {
      const { requestId, checkoutRecordId, studentId, studentDbId, roomId, roomCondition, damageNotes } = body;

      let updatedCheckout = null;
      if (checkoutRecordId) {
        updatedCheckout = await base44.asServiceRole.entities.CheckOut.update(checkoutRecordId, {
          status: 'approved',
          room_condition: roomCondition || 'Good',
          damage_assessment: damageNotes ? `[Disahkan Pentadbiran] ${damageNotes}` : '[Kaedah: Express Drop-Key Disahkan]',
          approved_by: user?.full_name || user?.email || 'Pentadbiran Kolej'
        }).catch(() => null);
      }

      const targetStudentId = studentDbId || studentId;
      if (targetStudentId) {
        await base44.asServiceRole.entities.Student.update(targetStudentId, {
          room_status: 'Checked Out',
          room_id: null,
          room_number: null,
          block_name: null
        }).catch(() => {});
      }

      if (roomId) {
        const room = await base44.asServiceRole.entities.Room.get(roomId).catch(() => null);
        if (room) {
          const newOccupancy = Math.max(0, (room.current_occupancy || 1) - 1);
          await base44.asServiceRole.entities.Room.update(roomId, {
            current_occupancy: newOccupancy,
            status: newOccupancy === 0 ? 'Available' : 'Occupied'
          }).catch(() => {});
        }
      }

      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user?.id || 'admin',
        user_name: user?.full_name || user?.email || 'Pentadbiran Kolej',
        action: 'DROP_KEY_APPROVED',
        module: 'Drop-Key Check-Out',
        details: `Kelulusan serahan kunci bilik bagi permohonan ${requestId || checkoutRecordId}`,
        timestamp: new Date().toISOString()
      }).catch(() => {});

      return Response.json({
        success: true,
        checkoutRecord: updatedCheckout
      });
    }

    // ─── ACTION 5: REJECT (Penolakan oleh Staf / Pengetua) ────────────────────
    if (action === 'reject') {
      const { requestId, checkoutRecordId, studentId, studentDbId, reason } = body;

      if (checkoutRecordId) {
        await base44.asServiceRole.entities.CheckOut.update(checkoutRecordId, {
          status: 'rejected',
          damage_assessment: `[Ditolak: ${reason || 'Isu inventori / kunci tiada'}]`,
          approved_by: user?.full_name || user?.email || 'Pentadbiran Kolej'
        }).catch(() => null);
      }

      const targetStudentId = studentDbId || studentId;
      if (targetStudentId) {
        await base44.asServiceRole.entities.Student.update(targetStudentId, {
          room_status: 'Checked In'
        }).catch(() => {});
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Tindakan tidak sah.' }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Ralat pelayan.' }, { status: 500 });
  }
}
