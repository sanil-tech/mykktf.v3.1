import { base44 } from '@/api/base44Client';

// Central API wrapper used by CheckInOut page.
// Maps the `api.*` calls to the actual base44 SDK entity methods.
export const api = {
  getStudents: () => base44.entities.Student.list(),
  getRooms: () => base44.entities.Room.list(),
  getRoomById: (id) => base44.entities.Room.get(id),

  createCheckIn: (payload) =>
    base44.entities.CheckIn.create({
      student_id: payload.student_id,
      room_id: payload.room_id,
      check_in_date: payload.check_in_date,
      student_name: payload.student_name || '',
      room_number: payload.room_number || '',
      block_name: payload.block_name || ''
    }),

  updateStudent: (id, data) => base44.entities.Student.update(id, data),
  updateRoom: (id, data) => base44.entities.Room.update(id, data)
};