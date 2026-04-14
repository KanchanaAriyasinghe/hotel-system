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

// ── Shared HTML wrapper (admin / internal) ────────────────────────
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
    .change-row { display:flex; justify-content:space-between; align-items:flex-start; padding:10px 16px; border-bottom:1px solid #f3f4f6; }
    .change-row:last-child { border-bottom:none; }
    .change-row .lbl { color:#6b7280; font-size:.85rem; padding-top:2px; }
    .change-row .changes { display:flex; flex-direction:column; gap:2px; align-items:flex-end; }
    .val-old { font-size:.78rem; color:#9ca3af; text-decoration:line-through; }
    .val-new { font-weight:700; color:#111827; font-size:.88rem; }
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

// ── Guest-facing HTML wrapper ─────────────────────────────────────
const guestHtmlWrap = (title, subtitle, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; margin: 0; padding: 0; }
    .wrapper { max-width: 580px; margin: 32px auto; background: #fff;
               border-radius: 16px; overflow: hidden;
               box-shadow: 0 8px 32px rgba(99,102,241,.13); }
    .header  { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 36px 36px 28px; text-align: center; }
    .header-icon { font-size: 2.5rem; margin-bottom: 10px; display:block; }
    .header h1 { color:#fff; margin:0 0 6px; font-size:1.5rem; font-weight:800; letter-spacing:-.4px; }
    .header p  { color:rgba(255,255,255,.8); margin:0; font-size:.9rem; }
    .body    { padding: 32px 36px; color: #374151; font-size: .92rem; line-height: 1.7; }
    .greeting { font-size: 1.05rem; font-weight: 600; color: #111827; margin-bottom: 8px; }
    .conf-box {
      background: linear-gradient(135deg, #eef2ff, #f5f3ff);
      border: 1.5px solid #c7d2fe;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 20px 0;
      text-align: center;
    }
    .conf-box .conf-label { font-size: .75rem; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: .07em; }
    .conf-box .conf-number { font-size: 1.5rem; font-weight: 800; color: #4f46e5; letter-spacing: .04em; font-family: monospace; }
    .detail-card {
      background: #f9fafb;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
      margin: 20px 0;
    }
    .detail-card-title {
      background: #f3f4f6;
      padding: 10px 18px;
      font-size: .75rem;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: .06em;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row { display:flex; justify-content:space-between; align-items:center; padding: 11px 18px; border-bottom:1px solid #f3f4f6; }
    .info-row:last-child { border-bottom:none; }
    .info-row .lbl { color:#6b7280; font-size:.85rem; }
    .info-row .val { font-weight:600; color:#111827; text-align:right; max-width: 65%; }
    .change-row { display:flex; justify-content:space-between; align-items:flex-start; padding: 11px 18px; border-bottom:1px solid #f3f4f6; }
    .change-row:last-child { border-bottom:none; }
    .change-row .lbl { color:#6b7280; font-size:.85rem; padding-top:3px; }
    .change-row .changes { display:flex; flex-direction:column; gap:3px; align-items:flex-end; }
    .val-old { font-size:.78rem; color:#9ca3af; text-decoration:line-through; }
    .val-new { font-weight:700; color:#111827; font-size:.88rem; }
    .badge   { display:inline-block; padding:4px 12px; border-radius:20px; font-size:.78rem; font-weight:600; }
    .badge--green  { background:#f0fdf4; color:#16a34a; }
    .badge--blue   { background:#eff6ff; color:#2563eb; }
    .badge--amber  { background:#fffbeb; color:#d97706; }
    .badge--purple { background:#f5f3ff; color:#7c3aed; }
    .badge--red    { background:#fef2f2; color:#dc2626; }
    .highlight-row {
      display:flex; justify-content:space-between; align-items:center;
      padding: 13px 18px;
      background: #eef2ff;
      border-top: 2px solid #c7d2fe;
    }
    .highlight-row .lbl { font-weight:700; color:#4f46e5; font-size:.9rem; }
    .highlight-row .val { font-size:1.15rem; font-weight:800; color:#4f46e5; }

    /* ── Amenity tag pills ── */
    .amenity-list { padding: 10px 18px 14px; }
    .amenity-tag {
      display:inline-block; margin: 3px 4px 3px 0;
      padding:4px 11px; border-radius:20px; font-size:.78rem; font-weight:600;
    }
    .amenity-tag--free   { background:#f0fdf4; color:#16a34a; }
    .amenity-tag--paid   { background:#eff6ff; color:#2563eb; }
    .amenity-tag--addon  { background:#f5f3ff; color:#7c3aed; }

    /* ── Amenity breakdown rows ── */
    .amenity-breakdown-row {
      display:flex; justify-content:space-between; align-items:center;
      padding: 9px 18px; border-bottom:1px solid #f3f4f6;
      font-size:.85rem;
    }
    .amenity-breakdown-row:last-child { border-bottom:none; }
    .amenity-breakdown-row .ab-name  { color:#374151; font-weight:500; }
    .amenity-breakdown-row .ab-qty   { color:#6b7280; font-size:.78rem; margin-top:1px; }
    .amenity-breakdown-row .ab-price { font-weight:700; color:#111827; }
    .amenity-breakdown-row .ab-price--free { color:#16a34a; font-weight:700; }

    .amenity-subtotal-row {
      display:flex; justify-content:space-between; align-items:center;
      padding: 10px 18px;
      background: #f0fdf4;
      border-top: 1px solid #bbf7d0;
      font-size:.85rem;
    }
    .amenity-subtotal-row .lbl { font-weight:600; color:#15803d; }
    .amenity-subtotal-row .val { font-weight:700; color:#15803d; }

    /* ── Bill breakdown ── */
    .bill-row {
      display:flex; justify-content:space-between; align-items:center;
      padding: 9px 18px; border-bottom:1px solid #f3f4f6; font-size:.85rem;
    }
    .bill-row:last-child { border-bottom:none; }
    .bill-row .lbl { color:#6b7280; }
    .bill-row .val { font-weight:600; color:#111827; }
    .bill-row--free .lbl { color:#6b7280; font-style:italic; }
    .bill-row--free .val { color:#16a34a; font-weight:600; }
    .bill-row--included-paid .lbl { color:#6b7280; font-style:italic; }
    .bill-row--included-paid .val { color:#2563eb; font-weight:600; font-size:.8rem; }
    .bill-total-row {
      display:flex; justify-content:space-between; align-items:center;
      padding: 14px 18px;
      background: linear-gradient(135deg, #eef2ff, #f5f3ff);
      border-top: 2px solid #c7d2fe;
    }
    .bill-total-row .lbl { font-size:1rem; font-weight:700; color:#4f46e5; }
    .bill-total-row .val { font-size:1.2rem; font-weight:800; color:#4f46e5; }

    /* ── Notice boxes ── */
    .notice-box {
      border-radius: 10px;
      padding: 14px 18px;
      font-size: .85rem;
      margin: 18px 0;
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }
    .notice-box.info    { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
    .notice-box.warn    { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
    .notice-box.error   { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .notice-box.success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #14532d; }

    .footer  { background: #f9fafb; padding: 20px 36px; font-size:.78rem; color:#9ca3af; text-align:center; border-top:1px solid #f3f4f6; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="header-icon">🏨</span>
      <h1>Luxury Hotel</h1>
      <p>${subtitle}</p>
    </div>
    <div class="body">${bodyHtml}</div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Luxury Hotel &mdash; All rights reserved.<br/>
      Questions? Contact us at <a href="mailto:${process.env.SMTP_USER}">${process.env.SMTP_USER}</a>
    </div>
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

// ── Date formatter helpers ────────────────────────────────────────
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const fmtDateTime = () =>
  new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

// ═══════════════════════════════════════════════════════════════════
// CORE AMENITY + BILL HTML BUILDER
// ═══════════════════════════════════════════════════════════════════
/**
 * Builds the full amenities + bill section for every guest-facing email.
 *
 * @param {Object[]} freeRoomAmenities    - Complimentary amenities on the room (price=0)
 *                                          Each: { label, icon? }
 * @param {Object[]} paidRoomAmenities    - Paid amenities already on the room (price>0)
 *                                          Each: { label, price, icon? }
 *                                          These are INCLUDED in the room rate (roomsTotal)
 * @param {Object}   optionalBreakdown    - Guest-selected optional add-ons
 *                                          { [id]: { name, price, quantity, unit, subtotal } }
 * @param {number}   roomsTotal           - Room subtotal (covers room rate + paid room amenities)
 * @param {number}   totalPrice           - Grand total
 * @param {number}   nights               - Number of nights
 * @param {string}   roomNumbers          - e.g. "#110"
 * @param {string}   roomType             - e.g. "deluxe"
 * @param {number}   pricePerNight        - Per-night room rate (before room amenities)
 */
const buildAmenitiesAndBillHtml = ({
  freeRoomAmenities  = [],
  paidRoomAmenities  = [],
  optionalBreakdown  = {},
  roomsTotal         = 0,
  totalPrice         = 0,
  nights             = 0,
  roomNumbers        = '',
  roomType           = '',
  pricePerNight      = null,
}) => {
  const optionalEntries = Object.values(optionalBreakdown || {});
  const paidOptionals   = optionalEntries.filter(i => i.subtotal > 0);
  const freeOptionals   = optionalEntries.filter(i => i.subtotal === 0);
  const optionalTotal   = paidOptionals.reduce((s, i) => s + i.subtotal, 0);

  let html = '';

  // ── Section 1: Complimentary room amenities (price = 0) ─────────────────
  if (freeRoomAmenities.length > 0) {
    const tags = freeRoomAmenities.map(a =>
      `<span class="amenity-tag amenity-tag--free">✓ ${a.label}</span>`
    ).join('');
    html += `
      <div class="detail-card">
        <div class="detail-card-title">🎁 Complimentary Room Amenities (Included — Free)</div>
        <div class="amenity-list">${tags}</div>
      </div>`;
  }

  // ── Section 2: Paid room amenities (included in room rate) ──────────────
  if (paidRoomAmenities.length > 0) {
    const rows = paidRoomAmenities.map(a => `
      <div class="amenity-breakdown-row">
        <div>
          <div class="ab-name">${a.icon ? a.icon + ' ' : ''}${a.label}</div>
          <div class="ab-qty">Included in room rate</div>
        </div>
        <div style="text-align:right;">
          <div class="ab-price" style="color:#2563eb;">$${a.price}/night</div>
        </div>
      </div>`
    ).join('');
    html += `
      <div class="detail-card">
        <div class="detail-card-title">⭐ Paid Room Amenities (Included in Room Rate)</div>
        ${rows}
      </div>`;
  }

  // ── Section 3: Optional add-on amenities selected by guest ──────────────
  if (paidOptionals.length > 0 || freeOptionals.length > 0) {
    const rows = [
      ...freeOptionals.map(item => `
        <div class="amenity-breakdown-row">
          <div>
            <div class="ab-name">${item.name}</div>
            <div class="ab-qty">${item.unit === 'flat' ? 'Flat rate' : `${item.quantity} ${item.unit}`}</div>
          </div>
          <div class="ab-price--free">FREE</div>
        </div>`),
      ...paidOptionals.map(item => `
        <div class="amenity-breakdown-row">
          <div>
            <div class="ab-name">${item.name}</div>
            <div class="ab-qty">
              ${item.unit === 'flat'
                ? 'Flat rate'
                : `${item.quantity} ${item.unit} × $${item.price}/${item.unit === 'hours' ? 'hr' : 'day'}`}
            </div>
          </div>
          <div class="ab-price">$${item.subtotal}</div>
        </div>`),
    ].join('');

    html += `
      <div class="detail-card">
        <div class="detail-card-title">✨ Optional Add-on Amenities (Guest Selected)</div>
        ${rows}
        ${paidOptionals.length > 0 ? `
        <div class="amenity-subtotal-row">
          <span class="lbl">Add-ons Subtotal</span>
          <span class="val">$${optionalTotal}</span>
        </div>` : ''}
      </div>`;
  }

  // ── Section 4: Full bill breakdown ──────────────────────────────────────
  const perNight = pricePerNight !== null
    ? pricePerNight
    : (nights > 0 ? Math.round(roomsTotal / nights) : roomsTotal);

  const nightsLabel    = nights > 0 ? ` × ${nights} night${nights !== 1 ? 's' : ''}` : '';
  const perNightLabel  = perNight > 0 && nights > 0
    ? ` × <strong>$${perNight}/night</strong>`
    : '';

  const roomBillLabel = `Room${roomNumbers ? ` (${roomNumbers})` : ''}${nightsLabel}${perNightLabel}`;

  html += `
    <div class="detail-card">
      <div class="detail-card-title">🧾 Total Bill Breakdown</div>

      <div class="bill-row">
        <span class="lbl">${roomBillLabel}</span>
        <span class="val">$${roomsTotal}</span>
      </div>

      ${freeRoomAmenities.map(a => `
      <div class="bill-row bill-row--free">
        <span class="lbl">${a.label} (complimentary)</span>
        <span class="val">FREE</span>
      </div>`).join('')}

      ${paidRoomAmenities.map(a => `
      <div class="bill-row bill-row--included-paid">
        <span class="lbl">${a.label} (included in room rate)</span>
        <span class="val">incl.</span>
      </div>`).join('')}

      ${freeOptionals.map(item => `
      <div class="bill-row bill-row--free">
        <span class="lbl">${item.name} (add-on)</span>
        <span class="val">FREE</span>
      </div>`).join('')}

      ${paidOptionals.map(item => `
      <div class="bill-row">
        <span class="lbl">${item.name} (add-on)</span>
        <span class="val">$${item.subtotal}</span>
      </div>`).join('')}

      <div class="bill-total-row">
        <span class="lbl">Grand Total</span>
        <span class="val">$${totalPrice}</span>
      </div>
    </div>`;

  return html;
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
      <div class="info-row"><span class="lbl">Updated by</span><span class="val">${assignedBy}</span></div>
      <div class="info-row"><span class="lbl">Date</span><span class="val">${fmtDateTime()}</span></div>
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
      <div class="info-row"><span class="lbl">Time</span><span class="val">${fmtDateTime()}</span></div>
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
      <div class="info-row"><span class="lbl">Date</span><span class="val">${fmtDateTime()}</span></div>
    </div>
    <p>Please log in to the dashboard to view your assigned rooms and update statuses as needed.</p>`;

  await sendMail({
    to:      toEmail,
    subject: `🏨 You have been assigned to Room #${roomNumber}`,
    html:    htmlWrap('New Room Assignment', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 5a. NEW RESERVATION — notify admins (internal)
// ═══════════════════════════════════════════════════════════════════
const sendNewReservationEmail = async ({
  adminEmails, guestName, email, phone,
  roomType, roomNumbers, checkInDate, checkOutDate,
  checkInTime, stayType, totalPrice, amenitiesBreakdown,
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
// 5b. NEW RESERVATION — confirmation email to GUEST
// ═══════════════════════════════════════════════════════════════════
const sendReservationConfirmationToGuest = async ({
  guestName, guestEmail, confirmationNumber,
  roomType, roomNumbers, checkInDate, checkOutDate,
  checkInTime,
  numberOfGuests, numberOfRooms, stayType,
  totalPrice, roomsTotal,
  // Room-included amenities (split)
  freeRoomAmenities  = [],
  paidRoomAmenities  = [],
  allRoomAmenityNames = [],
  // Guest-selected optional add-ons
  optionalBreakdown  = {},
  specialRequests,
}) => {
  const nights = Math.ceil(
    (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)
  );

  const checkInTimeHtml = checkInTime
    ? `<div class="info-row"><span class="lbl">Preferred Arrival</span><span class="val">${checkInTime}</span></div>`
    : '';

  const specialReqHtml = specialRequests
    ? `<div class="notice-box info">
        <span>💬</span>
        <div><strong>Special Requests:</strong><br/>${specialRequests}</div>
      </div>`
    : '';

  const perNight = nights > 0 ? Math.round(roomsTotal / nights) : roomsTotal;

  const amenitiesAndBillHtml = buildAmenitiesAndBillHtml({
    freeRoomAmenities,
    paidRoomAmenities,
    optionalBreakdown,
    roomsTotal:   roomsTotal  || 0,
    totalPrice:   totalPrice  || 0,
    nights,
    roomNumbers,
    roomType,
    pricePerNight: perNight,
  });

  const body = `
    <p class="greeting">Dear ${guestName},</p>
    <p>Thank you for choosing <strong>Luxury Hotel</strong>! Your reservation has been received and is currently <strong>pending confirmation</strong>. You'll receive another email once it's confirmed by our team.</p>

    <div class="conf-box">
      <div class="conf-label">Confirmation Number</div>
      <div class="conf-number">${confirmationNumber}</div>
    </div>

    <div class="detail-card">
      <div class="detail-card-title">🛏️ Stay Details</div>
      <div class="info-row"><span class="lbl">Room Type</span><span class="val">${roomType?.charAt(0).toUpperCase() + roomType?.slice(1)}</span></div>
      <div class="info-row"><span class="lbl">Room(s)</span><span class="val">${roomNumbers}</span></div>
      <div class="info-row"><span class="lbl">Number of Rooms</span><span class="val">${numberOfRooms}</span></div>
      <div class="info-row"><span class="lbl">Guests</span><span class="val">${numberOfGuests} guest${numberOfGuests !== 1 ? 's' : ''}</span></div>
      <div class="info-row"><span class="lbl">Stay Type</span><span class="val">${stayType === 'daytime' ? '☀️ Day-time Stay' : `🌙 Overnight (${nights} night${nights !== 1 ? 's' : ''})`}</span></div>
      <div class="info-row"><span class="lbl">Check-in</span><span class="val">${fmtDate(checkInDate)}</span></div>
      ${checkInTimeHtml}
      <div class="info-row"><span class="lbl">Check-out</span><span class="val">${fmtDate(checkOutDate)}</span></div>
    </div>

    ${amenitiesAndBillHtml}

    ${specialReqHtml}

    <div class="notice-box warn">
      <span>⏳</span>
      <div>Your reservation is <strong>pending review</strong>. Our team will confirm it shortly. Please keep your confirmation number safe for reference.</div>
    </div>

    <p style="color:#6b7280; font-size:.85rem; margin-top:24px;">
      If you need to make changes or have any questions, please contact our front desk with your confirmation number.
    </p>`;

  await sendMail({
    to:      guestEmail,
    subject: `🏨 Booking Received — Confirmation #${confirmationNumber}`,
    html:    guestHtmlWrap('Booking Confirmation', 'Your reservation has been received', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 5c. BOOKING CONFIRMED — notify GUEST when status → confirmed
// ═══════════════════════════════════════════════════════════════════
const sendBookingConfirmedToGuest = async ({
  guestName, guestEmail, confirmationNumber,
  roomType, roomNumbers, checkInDate, checkOutDate,
  checkInTime,
  numberOfGuests, numberOfRooms, stayType, totalPrice, roomsTotal,
  freeRoomAmenities  = [],
  paidRoomAmenities  = [],
  allRoomAmenityNames = [],
  optionalBreakdown  = {},
}) => {
  const nights = Math.ceil(
    (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)
  );

  const checkInTimeHtml = checkInTime
    ? `<div class="info-row"><span class="lbl">Preferred Arrival</span><span class="val">${checkInTime}</span></div>`
    : '';

  const perNight = nights > 0 ? Math.round(roomsTotal / nights) : roomsTotal;

  const amenitiesAndBillHtml = buildAmenitiesAndBillHtml({
    freeRoomAmenities,
    paidRoomAmenities,
    optionalBreakdown,
    roomsTotal:    roomsTotal   || 0,
    totalPrice:    totalPrice   || 0,
    nights,
    roomNumbers,
    roomType,
    pricePerNight: perNight,
  });

  const body = `
    <p class="greeting">Great news, ${guestName}! 🎉</p>
    <p>Your reservation at <strong>Luxury Hotel</strong> has been <strong>confirmed</strong> by our team. We look forward to welcoming you!</p>

    <div class="conf-box">
      <div class="conf-label">Confirmation Number</div>
      <div class="conf-number">${confirmationNumber}</div>
    </div>

    <div class="detail-card">
      <div class="detail-card-title">✅ Confirmed Booking Details</div>
      <div class="info-row"><span class="lbl">Room Type</span><span class="val">${roomType?.charAt(0).toUpperCase() + roomType?.slice(1)}</span></div>
      <div class="info-row"><span class="lbl">Room(s)</span><span class="val">${roomNumbers}</span></div>
      <div class="info-row"><span class="lbl">Number of Rooms</span><span class="val">${numberOfRooms}</span></div>
      <div class="info-row"><span class="lbl">Guests</span><span class="val">${numberOfGuests} guest${numberOfGuests !== 1 ? 's' : ''}</span></div>
      <div class="info-row"><span class="lbl">Stay Type</span><span class="val">${stayType === 'daytime' ? '☀️ Day-time Stay' : `🌙 Overnight (${nights} night${nights !== 1 ? 's' : ''})`}</span></div>
      <div class="info-row"><span class="lbl">Check-in</span><span class="val">${fmtDate(checkInDate)}</span></div>
      ${checkInTimeHtml}
      <div class="info-row"><span class="lbl">Check-out</span><span class="val">${fmtDate(checkOutDate)}</span></div>
    </div>

    ${amenitiesAndBillHtml}

    <div class="notice-box success">
      <span>✅</span>
      <div>Your booking is <strong>confirmed</strong>. Please present your confirmation number at the front desk upon arrival.</div>
    </div>

    <p style="color:#6b7280; font-size:.85rem; margin-top:24px;">
      Need to make changes or have any questions? Contact our front desk and quote your confirmation number — we're happy to help.
    </p>`;

  await sendMail({
    to:      guestEmail,
    subject: `✅ Booking Confirmed — #${confirmationNumber} | Luxury Hotel`,
    html:    guestHtmlWrap('Booking Confirmed!', 'Your reservation is officially confirmed', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 5d. BOOKING UPDATED — notify admins (internal)
// ═══════════════════════════════════════════════════════════════════
const sendBookingUpdatedEmail = async ({
  adminEmails, guestName, confirmationNumber,
  roomNumbers, checkInDate, checkOutDate,
  changes, updatedBy,
}) => {
  if (!adminEmails || adminEmails.length === 0) return;

  const changeRowsHtml = changes.map(({ label, oldVal, newVal }) => `
    <div class="change-row">
      <span class="lbl">${label}</span>
      <div class="changes">
        <span class="val-old">${oldVal}</span>
        <span class="val-new">${newVal}</span>
      </div>
    </div>`
  ).join('');

  const body = `
    <p>A reservation has been edited. The following details were changed:</p>
    <div style="margin:20px 0; padding:16px; background:#f9fafb; border-radius:8px;">
      <div class="info-row"><span class="lbl">Guest</span><span class="val">${guestName}</span></div>
      <div class="info-row"><span class="lbl">Confirmation #</span><span class="val" style="font-family:monospace;">${confirmationNumber}</span></div>
      <div class="info-row"><span class="lbl">Room(s)</span><span class="val">${roomNumbers}</span></div>
      <div class="info-row"><span class="lbl">Check-in</span><span class="val">${fmtDate(checkInDate)}</span></div>
      <div class="info-row"><span class="lbl">Check-out</span><span class="val">${fmtDate(checkOutDate)}</span></div>
      <div class="info-row"><span class="lbl">Updated by</span><span class="val">${updatedBy}</span></div>
      <div class="info-row"><span class="lbl">Time</span><span class="val">${fmtDateTime()}</span></div>
    </div>
    <p style="font-weight:600; color:#374151; margin-bottom:6px;">Changed Fields:</p>
    <div style="background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb; overflow:hidden;">
      ${changeRowsHtml}
    </div>
    <p style="margin-top:18px;">Log in to the dashboard to review the updated reservation.</p>`;

  await sendMail({
    to:      adminEmails,
    subject: `✏️ Booking Updated — ${guestName} (#${confirmationNumber})`,
    html:    htmlWrap('Reservation Updated', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 5e. BOOKING UPDATED — notify GUEST
// ═══════════════════════════════════════════════════════════════════
const sendBookingUpdateToGuest = async ({
  guestName, guestEmail, confirmationNumber,
  roomNumbers, checkInDate, checkOutDate,
  numberOfGuests, totalPrice, changes, roomsTotal,
  freeRoomAmenities  = [],
  paidRoomAmenities  = [],
  allRoomAmenityNames = [],
  optionalBreakdown  = {},
}) => {
  const nights = Math.ceil(
    (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)
  );

  const changeRowsHtml = changes.map(({ label, oldVal, newVal }) => `
    <div class="change-row">
      <span class="lbl">${label}</span>
      <div class="changes">
        <span class="val-old">${oldVal}</span>
        <span class="val-new">${newVal}</span>
      </div>
    </div>`
  ).join('');

  const perNight = nights > 0 ? Math.round(roomsTotal / nights) : roomsTotal;

  const amenitiesAndBillHtml = buildAmenitiesAndBillHtml({
    freeRoomAmenities,
    paidRoomAmenities,
    optionalBreakdown,
    roomsTotal:    roomsTotal   || 0,
    totalPrice:    totalPrice   || 0,
    nights,
    roomNumbers,
    pricePerNight: perNight,
  });

  const body = `
    <p class="greeting">Dear ${guestName},</p>
    <p>Your reservation at <strong>Luxury Hotel</strong> has been updated. Please review the changes below.</p>

    <div class="conf-box">
      <div class="conf-label">Confirmation Number</div>
      <div class="conf-number">${confirmationNumber}</div>
    </div>

    <div class="detail-card">
      <div class="detail-card-title">✏️ What Changed</div>
      ${changeRowsHtml}
    </div>

    <div class="detail-card">
      <div class="detail-card-title">📋 Current Booking Summary</div>
      <div class="info-row"><span class="lbl">Room(s)</span><span class="val">${roomNumbers}</span></div>
      <div class="info-row"><span class="lbl">Check-in</span><span class="val">${fmtDate(checkInDate)}</span></div>
      <div class="info-row"><span class="lbl">Check-out</span><span class="val">${fmtDate(checkOutDate)}</span></div>
      <div class="info-row"><span class="lbl">Guests</span><span class="val">${numberOfGuests} guest${numberOfGuests !== 1 ? 's' : ''}</span></div>
    </div>

    ${amenitiesAndBillHtml}

    <div class="notice-box warn">
      <span>⚠️</span>
      <div>If you did not request these changes or believe this is an error, please contact our front desk immediately with your confirmation number.</div>
    </div>

    <p style="color:#6b7280; font-size:.85rem; margin-top:24px;">
      Questions? Reach us at the front desk and quote your confirmation number.
    </p>`;

  await sendMail({
    to:      guestEmail,
    subject: `✏️ Booking Updated — #${confirmationNumber}`,
    html:    guestHtmlWrap('Booking Updated', 'Your reservation details have changed', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 6a. CHECK-IN — notify admins (internal)
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
      <div class="info-row"><span class="lbl">Time</span><span class="val">${fmtDateTime()}</span></div>
    </div>`;

  await sendMail({
    to:      adminEmails,
    subject: `✅ Guest Checked In — ${guestName}`,
    html:    htmlWrap('Guest Check-in', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 6b. CHECK-IN — confirmation email to GUEST
// ═══════════════════════════════════════════════════════════════════
const sendCheckInConfirmationToGuest = async ({
  guestName, guestEmail, confirmationNumber,
  roomNumbers, roomType, checkInDate, checkOutDate,
  numberOfGuests, totalPrice, roomsTotal,
  freeRoomAmenities  = [],
  paidRoomAmenities  = [],
  allRoomAmenityNames = [],
  optionalBreakdown  = {},
}) => {
  const nights = Math.ceil(
    (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)
  );

  const perNight = nights > 0 ? Math.round(roomsTotal / nights) : roomsTotal;

  const amenitiesAndBillHtml = buildAmenitiesAndBillHtml({
    freeRoomAmenities,
    paidRoomAmenities,
    optionalBreakdown,
    roomsTotal:    roomsTotal   || 0,
    totalPrice:    totalPrice   || 0,
    nights,
    roomNumbers,
    roomType,
    pricePerNight: perNight,
  });

  const body = `
    <p class="greeting">Welcome, ${guestName}! 🎉</p>
    <p>You have successfully checked in to <strong>Luxury Hotel</strong>. We hope you enjoy your stay!</p>

    <div class="conf-box">
      <div class="conf-label">Confirmation Number</div>
      <div class="conf-number">${confirmationNumber}</div>
    </div>

    <div class="detail-card">
      <div class="detail-card-title">🔑 Check-in Details</div>
      <div class="info-row"><span class="lbl">Room(s)</span><span class="val">${roomNumbers}</span></div>
      <div class="info-row"><span class="lbl">Room Type</span><span class="val">${roomType?.charAt(0).toUpperCase() + roomType?.slice(1)}</span></div>
      <div class="info-row"><span class="lbl">Guests</span><span class="val">${numberOfGuests} guest${numberOfGuests !== 1 ? 's' : ''}</span></div>
      <div class="info-row"><span class="lbl">Check-in</span><span class="val">${fmtDate(checkInDate)}</span></div>
      <div class="info-row"><span class="lbl">Check-out</span><span class="val">${fmtDate(checkOutDate)}</span></div>
      <div class="info-row"><span class="lbl">Duration</span><span class="val">${nights} night${nights !== 1 ? 's' : ''}</span></div>
    </div>

    ${amenitiesAndBillHtml}

    <div class="notice-box success">
      <span>✅</span>
      <div>You are now officially checked in. Please keep this email for your records and present your confirmation number at the front desk if needed.</div>
    </div>

    <p style="color:#6b7280; font-size:.85rem; margin-top:24px;">
      Need assistance during your stay? Don't hesitate to contact our front desk anytime.
    </p>`;

  await sendMail({
    to:      guestEmail,
    subject: `✅ Checked In — Welcome to Luxury Hotel!`,
    html:    guestHtmlWrap('You\'re Checked In!', 'Welcome — enjoy your stay', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 7a. CHECK-OUT — notify admins (internal)
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
      <div class="info-row"><span class="lbl">Time</span><span class="val">${fmtDateTime()}</span></div>
    </div>`;

  await sendMail({
    to:      adminEmails,
    subject: `🚪 Guest Checked Out — ${guestName}`,
    html:    htmlWrap('Guest Check-out', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 7b. CHECK-OUT — farewell email to GUEST
// ═══════════════════════════════════════════════════════════════════
const sendCheckOutFarewellToGuest = async ({
  guestName, guestEmail, confirmationNumber,
  roomNumbers, roomType, checkInDate, checkOutDate, totalPrice, roomsTotal,
  freeRoomAmenities  = [],
  paidRoomAmenities  = [],
  allRoomAmenityNames = [],
  optionalBreakdown  = {},
}) => {
  const nights = Math.ceil(
    (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)
  );

  const perNight = nights > 0 ? Math.round(roomsTotal / nights) : roomsTotal;

  const amenitiesAndBillHtml = buildAmenitiesAndBillHtml({
    freeRoomAmenities,
    paidRoomAmenities,
    optionalBreakdown,
    roomsTotal:    roomsTotal   || 0,
    totalPrice:    totalPrice   || 0,
    nights,
    roomNumbers,
    roomType,
    pricePerNight: perNight,
  });

  const body = `
    <p class="greeting">Thank you, ${guestName}! 👋</p>
    <p>We hope you had a wonderful stay at <strong>Luxury Hotel</strong>. It was a pleasure hosting you!</p>

    <div class="conf-box">
      <div class="conf-label">Confirmation Number</div>
      <div class="conf-number">${confirmationNumber}</div>
    </div>

    <div class="detail-card">
      <div class="detail-card-title">🧾 Stay Summary</div>
      <div class="info-row"><span class="lbl">Room(s)</span><span class="val">${roomNumbers}</span></div>
      <div class="info-row"><span class="lbl">Check-in</span><span class="val">${fmtDate(checkInDate)}</span></div>
      <div class="info-row"><span class="lbl">Check-out</span><span class="val">${fmtDate(checkOutDate)}</span></div>
      <div class="info-row"><span class="lbl">Duration</span><span class="val">${nights} night${nights !== 1 ? 's' : ''}</span></div>
    </div>

    ${amenitiesAndBillHtml}

    <div class="notice-box info">
      <span>💙</span>
      <div>We'd love to welcome you back! Visit us again soon for an equally memorable experience.</div>
    </div>

    <p style="color:#6b7280; font-size:.85rem; margin-top:24px;">
      Please retain this email as your check-out receipt. If you have any billing questions, contact us with your confirmation number.
    </p>`;

  await sendMail({
    to:      guestEmail,
    subject: `👋 Thank You for Staying — Luxury Hotel`,
    html:    guestHtmlWrap('Safe Travels!', 'Thank you for your visit', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 8a. CANCELLATION — notify admins (internal)
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
      <div class="info-row"><span class="lbl">Time</span><span class="val">${fmtDateTime()}</span></div>
    </div>`;

  await sendMail({
    to:      adminEmails,
    subject: `❌ Reservation Cancelled — ${guestName}`,
    html:    htmlWrap('Reservation Cancelled', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 8b. CANCELLATION — notification email to GUEST
// ═══════════════════════════════════════════════════════════════════
const sendCancellationNotificationToGuest = async ({
  guestName, guestEmail, confirmationNumber,
  roomNumbers, checkInDate, checkOutDate, reason,
  totalPrice, roomsTotal,
  freeRoomAmenities  = [],
  paidRoomAmenities  = [],
  allRoomAmenityNames = [],
  optionalBreakdown  = {},
}) => {
  const nights = Math.ceil(
    (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)
  );

  const reasonHtml = reason
    ? `<div class="notice-box warn">
        <span>💬</span>
        <div><strong>Reason:</strong> ${reason}</div>
      </div>`
    : '';

  const perNight = nights > 0 ? Math.round((roomsTotal || 0) / nights) : (roomsTotal || 0);

  const amenitiesAndBillHtml = (totalPrice > 0)
    ? buildAmenitiesAndBillHtml({
        freeRoomAmenities,
        paidRoomAmenities,
        optionalBreakdown,
        roomsTotal:    roomsTotal   || 0,
        totalPrice:    totalPrice   || 0,
        nights,
        roomNumbers,
        pricePerNight: perNight,
      })
    : '';

  const body = `
    <p class="greeting">Dear ${guestName},</p>
    <p>We're writing to confirm that your reservation at <strong>Luxury Hotel</strong> has been <strong>cancelled</strong>.</p>

    <div class="conf-box">
      <div class="conf-label">Cancelled Reservation</div>
      <div class="conf-number">${confirmationNumber}</div>
    </div>

    <div class="detail-card">
      <div class="detail-card-title">❌ Cancelled Booking Details</div>
      <div class="info-row"><span class="lbl">Room(s)</span><span class="val">${roomNumbers}</span></div>
      <div class="info-row"><span class="lbl">Check-in</span><span class="val">${fmtDate(checkInDate)}</span></div>
      <div class="info-row"><span class="lbl">Check-out</span><span class="val">${fmtDate(checkOutDate)}</span></div>
      <div class="info-row"><span class="lbl">Cancelled on</span><span class="val">${fmtDateTime()}</span></div>
    </div>

    ${amenitiesAndBillHtml}

    ${reasonHtml}

    <div class="notice-box error">
      <span>ℹ️</span>
      <div>If you did not request this cancellation or believe this is an error, please contact our front desk immediately with your confirmation number.</div>
    </div>

    <p style="color:#6b7280; font-size:.85rem; margin-top:24px;">
      We hope to welcome you back in the future. Feel free to make a new reservation at any time.
    </p>`;

  await sendMail({
    to:      guestEmail,
    subject: `❌ Reservation Cancelled — #${confirmationNumber}`,
    html:    guestHtmlWrap('Reservation Cancelled', 'Your booking has been cancelled', body),
  });
};

// ═══════════════════════════════════════════════════════════════════
// 9. PASSWORD RESET EMAIL
// ═══════════════════════════════════════════════════════════════════
const sendPasswordResetEmail = async ({ toEmail, toName, resetURL, expiresIn }) => {
  const body = `
    <p>Hi <strong>${toName}</strong>,</p>
    <p>We received a request to reset the password for your Hotel Management account. Click the button below to set a new password.</p>
    <div style="margin:24px 0; padding:16px; background:#f9fafb; border-radius:8px;">
      <div class="info-row"><span class="lbl">Account</span><span class="val">${toEmail}</span></div>
      <div class="info-row"><span class="lbl">Link expires in</span><span class="val" style="color:#d97706; font-weight:700;">${expiresIn}</span></div>
      <div class="info-row"><span class="lbl">Requested at</span><span class="val">${fmtDateTime()}</span></div>
    </div>
    <div style="text-align:center; margin:28px 0;">
      <a href="${resetURL}" class="btn" style="font-size:.95rem; padding:12px 32px;">
        🔑 Reset My Password
      </a>
    </div>
    <p style="color:#6b7280; font-size:.85rem; background:#f9fafb; border-radius:8px; padding:12px 16px; border-left:3px solid #d1d5db;">
      If the button above doesn't work, copy and paste this link into your browser:<br/>
      <a href="${resetURL}" style="color:#6366f1; word-break:break-all;">${resetURL}</a>
    </p>
    <p style="color:#ef4444; font-size:.82rem; margin-top:20px;">
      ⚠️ If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged. Do not share this link with anyone.
    </p>`;

  await sendMail({
    to:      toEmail,
    subject: '🔑 Password Reset Request — Hotel Management',
    html:    htmlWrap('Password Reset', body),
  });
};

module.exports = {
  sendRoleAssignedEmail,
  sendRoomStatusEmail,
  sendWelcomeEmail,
  sendHousekeeperAssignedEmail,
  // Admin notifications
  sendNewReservationEmail,
  sendBookingUpdatedEmail,
  sendCheckInEmail,
  sendCheckOutEmail,
  sendCancellationEmail,
  // Guest notifications
  sendReservationConfirmationToGuest,
  sendBookingConfirmedToGuest,
  sendBookingUpdateToGuest,
  sendCheckInConfirmationToGuest,
  sendCheckOutFarewellToGuest,
  sendCancellationNotificationToGuest,
  // Auth
  sendPasswordResetEmail,
};