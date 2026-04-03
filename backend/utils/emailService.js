const nodemailer = require('nodemailer');

// ── Transporter ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Shared HTML wrapper ───────────────────────────────────────────
const htmlWrap = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
    .wrapper { max-width: 560px; margin: 32px auto; background: #fff;
               border-radius: 12px; overflow: hidden;
               box-shadow: 0 4px 24px rgba(99,102,241,.10); }
    .header  { background: linear-gradient(135deg,#6366f1,#8b5cf6); padding: 28px 32px; }
    .header h1 { color:#fff; margin:0; font-size:1.3rem; font-weight:700; letter-spacing:-.3px; }
    .header p  { color:rgba(255,255,255,.75); margin:4px 0 0; font-size:.85rem; }
    .body    { padding: 28px 32px; color: #374151; font-size: .92rem; line-height: 1.6; }
    .badge   { display:inline-block; padding:4px 12px; border-radius:20px; font-size:.78rem; font-weight:600; }
    .badge--green  { background:#f0fdf4; color:#16a34a; }
    .badge--blue   { background:#eff6ff; color:#2563eb; }
    .badge--amber  { background:#fffbeb; color:#d97706; }
    .badge--purple { background:#f5f3ff; color:#7c3aed; }
    .badge--red    { background:#fef2f2; color:#dc2626; }
    .info-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f3f4f6; }
    .info-row:last-child { border-bottom:none; }
    .info-row .lbl { color:#6b7280; font-size:.85rem; }
    .info-row .val { font-weight:600; color:#111827; }
    .footer  { background:#f9fafb; padding:16px 32px; font-size:.78rem; color:#9ca3af; text-align:center; border-top:1px solid #f3f4f6; }
    .btn     { display:inline-block; margin-top:18px; padding:10px 24px; background:#6366f1; color:#fff; border-radius:8px; text-decoration:none; font-weight:600; font-size:.88rem; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🏨 Hotel Management</h1>
      <p>${title}</p>
    </div>
    <div class="body">${bodyHtml}</div>
    <div class="footer">This is an automated notification — please do not reply.</div>
  </div>
</body>
</html>`;

// ── Generic send helper ───────────────────────────────────────────
const sendMail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[emailService] SMTP credentials not set — skipping email.');
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: `"Hotel Management" <${process.env.SMTP_USER}>`,
      to:   Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    console.log(`[emailService] Sent "${subject}" → ${info.messageId}`);
  } catch (err) {
    console.error('[emailService] Failed to send email:', err.message);
  }
};

// ═══════════════════════════════════════════════════════════════════
// 1. ROLE ASSIGNED
// ═══════════════════════════════════════════════════════════════════
const sendRoleAssignedEmail = async ({ toEmail, toName, newRole, assignedBy }) => {
  const roleColors = {
    admin:        'badge--purple',
    receptionist: 'badge--blue',
    housekeeper:  'badge--green',
  };
  const body = `
    <p>Hi <strong>${toName}</strong>,</p>
    <p>Your account role has been updated by an administrator.</p>
    <div style="margin:20px 0; padding:16px; background:#f9fafb; border-radius:8px;">
      <div class="info-row">
        <span class="lbl">New Role</span>
        <span class="val"><span class="badge ${roleColors[newRole] || 'badge--blue'}">${newRole.toUpperCase()}</span></span>
      </div>
      <div class="info-row">
        <span class="lbl">Updated by</span>
        <span class="val">${assignedBy}</span>
      </div>
      <div class="info-row">
        <span class="lbl">Date</span>
        <span class="val">${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
      </div>
    </div>
    <p>If you believe this was a mistake, please contact your system administrator immediately.</p>`;

  await sendMail({
    to:      toEmail,
    subject: `Your role has been updated to "${newRole}"`,
    html:    htmlWrap('Role Update Notification', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 2. ROOM STATUS CHANGED — notify admins
// ═══════════════════════════════════════════════════════════════════
const sendRoomStatusEmail = async ({ adminEmails, roomNumber, roomType, oldStatus, newStatus, updatedBy }) => {
  if (!adminEmails || adminEmails.length === 0) return;

  const statusLabels = {
    available:   { label: 'Available',   cls: 'badge--green'  },
    cleaning:    { label: 'Cleaning',    cls: 'badge--blue'   },
    maintenance: { label: 'Maintenance', cls: 'badge--amber'  },
    occupied:    { label: 'Occupied',    cls: 'badge--purple' },
  };
  const from = statusLabels[oldStatus] || { label: oldStatus, cls: 'badge--blue' };
  const to   = statusLabels[newStatus] || { label: newStatus, cls: 'badge--green' };

  let subject = `Room #${roomNumber} status updated`;
  if (oldStatus === 'cleaning'    && newStatus === 'available') subject = `✅ Room #${roomNumber} cleaning complete — now available`;
  if (oldStatus === 'maintenance' && newStatus === 'available') subject = `🔧 Room #${roomNumber} maintenance fixed — now available`;

  const body = `
    <p>A room status change requires your attention.</p>
    <div style="margin:20px 0; padding:16px; background:#f9fafb; border-radius:8px;">
      <div class="info-row"><span class="lbl">Room</span><span class="val">#${roomNumber} — ${roomType}</span></div>
      <div class="info-row"><span class="lbl">Previous Status</span><span class="val"><span class="badge ${from.cls}">${from.label}</span></span></div>
      <div class="info-row"><span class="lbl">New Status</span><span class="val"><span class="badge ${to.cls}">${to.label}</span></span></div>
      <div class="info-row"><span class="lbl">Updated by</span><span class="val">${updatedBy}</span></div>
      <div class="info-row"><span class="lbl">Time</span><span class="val">${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
    </div>
    <p>Log in to the dashboard to view the current room list.</p>`;

  await sendMail({ to: adminEmails, subject, html: htmlWrap('Room Status Update', body) });
};

// ═══════════════════════════════════════════════════════════════════
// 3. WELCOME EMAIL — new staff account
// ═══════════════════════════════════════════════════════════════════
const sendWelcomeEmail = async ({ toEmail, toName, role, tempPassword }) => {
  const body = `
    <p>Hi <strong>${toName}</strong>,</p>
    <p>Your account has been created on the Hotel Management System. Here are your login details:</p>
    <div style="margin:20px 0; padding:16px; background:#f9fafb; border-radius:8px;">
      <div class="info-row"><span class="lbl">Email</span><span class="val">${toEmail}</span></div>
      <div class="info-row"><span class="lbl">Temporary Password</span><span class="val" style="font-family:monospace; letter-spacing:1px;">${tempPassword}</span></div>
      <div class="info-row"><span class="lbl">Role</span><span class="val"><span class="badge badge--blue">${role.toUpperCase()}</span></span></div>
    </div>
    <p style="color:#ef4444; font-size:.85rem;">⚠️ Please change your password immediately after your first login.</p>`;

  await sendMail({
    to:      toEmail,
    subject: 'Welcome to Hotel Management — Your Account Details',
    html:    htmlWrap('Welcome Aboard!', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 4. HOUSEKEEPER ASSIGNED TO ROOM
// ═══════════════════════════════════════════════════════════════════
const sendHousekeeperAssignedEmail = async ({ toEmail, toName, roomNumber, roomType, floor, assignedBy }) => {
  const body = `
    <p>Hi <strong>${toName}</strong>,</p>
    <p>You have been assigned to a room by an administrator. Please check the details below.</p>
    <div style="margin:20px 0; padding:16px; background:#f9fafb; border-radius:8px;">
      <div class="info-row"><span class="lbl">Room Number</span><span class="val">#${roomNumber}</span></div>
      <div class="info-row"><span class="lbl">Room Type</span><span class="val"><span class="badge badge--blue">${roomType.toUpperCase()}</span></span></div>
      <div class="info-row"><span class="lbl">Floor</span><span class="val">${floor}</span></div>
      <div class="info-row"><span class="lbl">Assigned by</span><span class="val">${assignedBy}</span></div>
      <div class="info-row"><span class="lbl">Date</span><span class="val">${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
    </div>
    <p>Please log in to the dashboard to view your assigned rooms and update statuses as needed.</p>`;

  await sendMail({
    to:      toEmail,
    subject: `🏨 You have been assigned to Room #${roomNumber}`,
    html:    htmlWrap('New Room Assignment', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 5. NEW RESERVATION — notify admins
// ═══════════════════════════════════════════════════════════════════
const sendNewReservationEmail = async ({
  adminEmails, guestName, email, phone,
  roomType, roomNumbers, checkInDate, checkOutDate,
  stayType, totalPrice, amenitiesBreakdown,
}) => {
  if (!adminEmails || adminEmails.length === 0) return;

  const nights = Math.ceil(
    (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)
  );

  let amenitiesHtml = '';
  if (amenitiesBreakdown && Object.keys(amenitiesBreakdown).length > 0) {
    const rows = Object.values(amenitiesBreakdown).map(item =>
      `<div class="info-row">
        <span class="lbl">${item.name} (${item.quantity} ${item.unit})</span>
        <span class="val">$${item.subtotal}</span>
      </div>`
    ).join('');
    amenitiesHtml = `
      <p style="margin:16px 0 6px; font-weight:600; color:#374151;">Amenities:</p>
      <div style="padding:0 0 0 8px;">${rows}</div>`;
  }

  const body = `
    <p>A new reservation has been submitted. Details below:</p>
    <div style="margin:20px 0; padding:16px; background:#f9fafb; border-radius:8px;">
      <div class="info-row"><span class="lbl">Guest Name</span><span class="val">${guestName}</span></div>
      <div class="info-row"><span class="lbl">Email</span><span class="val">${email}</span></div>
      <div class="info-row"><span class="lbl">Phone</span><span class="val">${phone}</span></div>
      <div class="info-row"><span class="lbl">Room Type</span><span class="val"><span class="badge badge--blue">${roomType?.toUpperCase()}</span></span></div>
      <div class="info-row"><span class="lbl">Room(s)</span><span class="val">${roomNumbers}</span></div>
      <div class="info-row"><span class="lbl">Check-in</span><span class="val">${checkInDate}</span></div>
      <div class="info-row"><span class="lbl">Check-out</span><span class="val">${checkOutDate}</span></div>
      <div class="info-row">
        <span class="lbl">Stay Type</span>
        <span class="val">${stayType === 'daytime' ? '☀️ Day-time' : `🌙 Overnight (${nights} night${nights !== 1 ? 's' : ''})`}</span>
      </div>
      ${amenitiesHtml}
      <div class="info-row" style="margin-top:12px; border-top:2px solid #e5e7eb; padding-top:12px;">
        <span class="lbl">Total Amount</span>
        <span class="val" style="font-size:1.05rem; color:#6366f1;">$${totalPrice}</span>
      </div>
    </div>
    <p>Log in to the dashboard to review and confirm this reservation.</p>`;

  await sendMail({
    to:      adminEmails,
    subject: `🆕 New Reservation — ${guestName} (${checkInDate})`,
    html:    htmlWrap('New Reservation', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 6. CHECK-IN — notify admins
// ═══════════════════════════════════════════════════════════════════
const sendCheckInEmail = async ({ adminEmails, guestName, roomNumbers, checkInDate, checkOutDate, checkedInBy }) => {
  if (!adminEmails || adminEmails.length === 0) return;

  const body = `
    <p>A guest has checked in.</p>
    <div style="margin:20px 0; padding:16px; background:#f9fafb; border-radius:8px;">
      <div class="info-row"><span class="lbl">Guest Name</span><span class="val">${guestName}</span></div>
      <div class="info-row"><span class="lbl">Room(s)</span><span class="val">${roomNumbers}</span></div>
      <div class="info-row"><span class="lbl">Check-in Date</span><span class="val">${checkInDate}</span></div>
      <div class="info-row"><span class="lbl">Check-out Date</span><span class="val">${checkOutDate}</span></div>
      <div class="info-row"><span class="lbl">Checked in by</span><span class="val">${checkedInBy}</span></div>
      <div class="info-row"><span class="lbl">Time</span><span class="val">${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
    </div>`;

  await sendMail({
    to:      adminEmails,
    subject: `✅ Guest Checked In — ${guestName}`,
    html:    htmlWrap('Guest Check-in', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 7. CHECK-OUT — notify admins
// ═══════════════════════════════════════════════════════════════════
const sendCheckOutEmail = async ({ adminEmails, guestName, roomNumbers, checkOutDate, checkedOutBy }) => {
  if (!adminEmails || adminEmails.length === 0) return;

  const body = `
    <p>A guest has checked out.</p>
    <div style="margin:20px 0; padding:16px; background:#f9fafb; border-radius:8px;">
      <div class="info-row"><span class="lbl">Guest Name</span><span class="val">${guestName}</span></div>
      <div class="info-row"><span class="lbl">Room(s)</span><span class="val">${roomNumbers}</span></div>
      <div class="info-row"><span class="lbl">Check-out Date</span><span class="val">${checkOutDate}</span></div>
      <div class="info-row"><span class="lbl">Checked out by</span><span class="val">${checkedOutBy}</span></div>
      <div class="info-row"><span class="lbl">Time</span><span class="val">${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
    </div>`;

  await sendMail({
    to:      adminEmails,
    subject: `🚪 Guest Checked Out — ${guestName}`,
    html:    htmlWrap('Guest Check-out', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 8. CANCELLATION — notify admins
// ═══════════════════════════════════════════════════════════════════
const sendCancellationEmail = async ({ adminEmails, guestName, roomNumbers, checkInDate, checkOutDate, cancelledBy, reason }) => {
  if (!adminEmails || adminEmails.length === 0) return;

  const body = `
    <p>A reservation has been cancelled.</p>
    <div style="margin:20px 0; padding:16px; background:#f9fafb; border-radius:8px;">
      <div class="info-row"><span class="lbl">Guest Name</span><span class="val">${guestName}</span></div>
      <div class="info-row"><span class="lbl">Room(s)</span><span class="val">${roomNumbers}</span></div>
      <div class="info-row"><span class="lbl">Check-in Date</span><span class="val">${checkInDate}</span></div>
      <div class="info-row"><span class="lbl">Check-out Date</span><span class="val">${checkOutDate}</span></div>
      <div class="info-row"><span class="lbl">Cancelled by</span><span class="val">${cancelledBy}</span></div>
      ${reason ? `<div class="info-row"><span class="lbl">Reason</span><span class="val">${reason}</span></div>` : ''}
      <div class="info-row"><span class="lbl">Time</span><span class="val">${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
    </div>`;

  await sendMail({
    to:      adminEmails,
    subject: `❌ Reservation Cancelled — ${guestName}`,
    html:    htmlWrap('Reservation Cancelled', body),
  });
};

module.exports = {
  sendRoleAssignedEmail,
  sendRoomStatusEmail,
  sendWelcomeEmail,
  sendHousekeeperAssignedEmail,
  sendNewReservationEmail,
  sendCheckInEmail,
  sendCheckOutEmail,
  sendCancellationEmail,
};