import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Backend function untuk pengurusan Express Drop-Key Check-Out
 * Dijalankan dengan kuasa Service Role (asServiceRole) supaya:
 * 1. Pelajar boleh menghantar permohonan CheckOut tanpa sekatan RLS
 * 2. Pengetua & Pentadbir Kolej dijamin dapat membaca semua permohonan serahan kunci tanpa ralat RLS
 * 3. Kemaskini status pelajar, bilik dan notifikasi berlaku secara automatik dan atomik
 */
export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'list';

    // ─── ACTION 1: SUBMIT (Hantar Permohonan Drop-Key oleh Pelajar) ───────────
    if (action === 'submit') {
      const data = body.data || {};
      const studentDbId = data.student_db_id || data.student_entity_id || '';
      const localId = data.id || `dk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // Format data CheckOut yang serasi dengan schema CheckOut.jsonc
      const checkOutPayload = {
        student_id: studentDbId || data.student_matric || data.student_id || 'student',
        student_name: data.student_name || user?.full_name || 'Pelajar Residen',
        room_id: data.room_id || 'room_dropkey',
        room_number: data.room_number || '',
        block_name: data.block_name || '',
        check_out_date: data.checkout_date || new Date().toISOString().split('T')[0],
        check_out_time: data.checkout_time || '08:00',
        room_condition: 'Good',
        damage_assessment: [
          '[EXPRESS DROP-KEY]',
          data.envelope_tag ? `Tag: ${data.envelope_tag}` : '',
          data.reason ? `Sebab: ${data.reason}` : '',
          localId ? `LocalID: ${localId}` : ''
        ].filter(Boolean).join(' | '),
        status: 'pending_verification',
        student_matric: data.student_matric || data.student_id || '',
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
          created_at: new Date().toISOString()
        })
      };

      // Simpan menggunakan service role (bebas dari sebarang sekatan RLS)
      const checkoutRecord = await base44.asServiceRole.entities.CheckOut.create(checkOutPayload);

      // Kemaskini status pelajar dalam pangkalan data
      if (studentDbId) {
        await base44.asServiceRole.entities.Student.update(studentDbId, {
          room_status: 'Pending Verification',
          notes: JSON.stringify({
            active_drop_key_id: checkoutRecord.id,
            local_id: localId,
            date: checkOutPayload.check_out_date
          })
        }).catch(() => {});
      } else if (data.student_matric || data.student_id) {
        const mat = data.student_matric || data.student_id;
        const matchingStudents = await base44.asServiceRole.entities.Student.filter({ student_id: mat }).catch(() => []);
        if (matchingStudents.length > 0) {
          await base44.asServiceRole.entities.Student.update(matchingStudents[0].id, {
            room_status: 'Pending Verification',
            notes: JSON.stringify({
              active_drop_key_id: checkoutRecord.id,
              local_id: localId,
              date: checkOutPayload.check_out_date
            })
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

    // ─── ACTION 2: LIST (Senarai Permohonan untuk Pentadbir & Pengetua) ───────
    if (action === 'list') {
      // Ambil SEMUA CheckOut rekod menggunakan service role
      const allCheckouts = await base44.asServiceRole.entities.CheckOut.list('-created_date').catch(() => []);
      
      // Tapis hanya rekod berkaitan Drop-Key
      const dropKeyCheckouts = (allCheckouts || []).filter(c =>
        c.status === 'pending_verification' ||
        String(c.room_condition || '').includes('Drop-Key') ||
        String(c.damage_assessment || '').includes('DROP-KEY') ||
        String(c.damage_assessment || '').includes('Express Drop-Key') ||
        String(c.damage_assessment || '').includes('[EXPRESS DROP-KEY]')
      );

      // Semak juga sekiranya ada pelajar berstatus 'Pending Verification'
      const pendingStudents = await base44.asServiceRole.entities.Student.filter({ room_status: 'Pending Verification' }).catch(() => []);

      return Response.json({
        success: true,
        checkouts: dropKeyCheckouts,
        pendingStudents
      });
    }

    // ─── ACTION 3: APPROVE (Kelulusan oleh Staf / Pengetua) ───────────────────
    if (action === 'approve') {
      const { requestId, checkoutRecordId, studentId, studentDbId, roomId, roomCondition, damageNotes } = body;

      // 1. Kemaskini atau cipta rekod CheckOut
      let updatedCheckout = null;
      if (checkoutRecordId) {
        updatedCheckout = await base44.asServiceRole.entities.CheckOut.update(checkoutRecordId, {
          status: 'approved',
          room_condition: roomCondition || 'Good',
          damage_assessment: damageNotes ? `[Disahkan Pentadbiran] ${damageNotes}` : '[Kaedah: Express Drop-Key Disahkan]',
          approved_by: user?.full_name || user?.email || 'Pentadbiran Kolej'
        }).catch(() => null);
      }

      // 2. Kemaskini status pelajar ke 'Checked Out'
      const targetStudentId = studentDbId || studentId;
      if (targetStudentId) {
        await base44.asServiceRole.entities.Student.update(targetStudentId, {
          room_status: 'Checked Out',
          room_id: null,
          room_number: null,
          block_name: null
        }).catch(() => {});
      }

      // 3. Kemaskini kapasiti bilik jika roomId ada
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

      // 4. Log Audit
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

    // ─── ACTION 4: REJECT (Penolakan oleh Staf / Pengetua) ────────────────────
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
