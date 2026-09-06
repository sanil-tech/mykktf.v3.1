import { base44 } from '@/api/base44Client';

// Reconciles Room occupancy/status against the live Student records
// (source of truth) and patches any drift. Called after check-in/out flows.
export async function verifyAndSyncOccupancy(apiInstance = null) {
  const students = await base44.entities.Student.list();
  const rooms = await base44.entities.Room.list();

  const computeStatus = (occupancy, capacity) => {
    if (occupancy >= capacity) return 'Full';
    if (occupancy > 0) return 'Occupied';
    return 'Available';
  };

  const tasks = rooms
    .map((room) => {
      const actualOccupancy = students.filter((s) => {
        const isArchived = String(s.resident_status || '').toLowerCase() === 'archived';
        const isCheckedOut = String(s.room_status || '').toLowerCase() === 'checked out';
        if (isArchived || isCheckedOut) return false;
        return String(s.room_id) === String(room.id) ||
               (s.block_name === room.block_name && String(s.room_number) === String(room.room_number));
      }).length;
      const correctStatus = computeStatus(actualOccupancy, room.capacity || 4);

      if (
        Number(room.current_occupancy) !== actualOccupancy ||
        room.status !== correctStatus
      ) {
        return base44.entities.Room.update(room.id, {
          current_occupancy: actualOccupancy,
          status: correctStatus
        });
      }
      return null;
    })
    .filter(Boolean);

  await Promise.all(tasks);
}