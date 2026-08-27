import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Sends email notifications for new DMs, announcements, and events.
// DMs notify the single recipient; announcements/events notify all active
// students. Runs as service role to read recipient emails across RLS and
// batches sends in parallel to stay within the runtime budget.
const APP_LINK = 'https://kktfresidentmanagement.base44.app';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let payload;
    try { payload = await req.json(); } catch { payload = {}; }
    const { type, title, message, recipientUserId } = payload;
    const sender = user.full_name || user.email || 'KKTF';

    if (type === 'dm' && recipientUserId) {
      let users = [];
      try { users = await base44.asServiceRole.entities.User.filter({ id: recipientUserId }); }
      catch { users = []; }
      const to = users[0]?.email;
      if (!to) return Response.json({ error: 'Recipient email not found' }, { status: 404 });
      await base44.asServiceRole.integrations.Core.SendEmail({
        to,
        subject: `Mesej peribadi baharu dari ${sender} — KKTF`,
        body: `Anda menerima mesej peribadi baharu daripada ${sender}:\n\n"${message || ''}"\n\nSila log masuk ke portal KKTF untuk membalas:\n${APP_LINK}/chat`
      });
      return Response.json({ sent: 1 });
    }

    if (type === 'announcement' || type === 'event') {
      const students = await base44.asServiceRole.entities.Student.filter({ status: 'Active' });
      const emails = [...new Set(students.map(s => s.email).filter(Boolean))];
      const subject = type === 'announcement' ? `Pengumuman baharu: ${title || ''}` : `Event baharu: ${title || ''}`;
      const link = type === 'announcement' ? `${APP_LINK}/announcements` : `${APP_LINK}/events`;
      const emailBody = `${message || ''}\n\nSila log masuk ke portal KKTF untuk butiran lanjut:\n${link}`;
      let sent = 0;
      const chunk = 25;
      for (let i = 0; i < emails.length; i += chunk) {
        const batch = emails.slice(i, i + chunk);
        await Promise.all(batch.map(to =>
          base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body: emailBody })
            .then(() => { sent++; })
            .catch(() => {})
        ));
      }
      return Response.json({ sent, total: emails.length });
    }

    return Response.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}