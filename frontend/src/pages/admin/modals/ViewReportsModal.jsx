// frontend/src/pages/admin/modals/ViewReportsModal.jsx
//
// All data comes from parent props — no extra API calls.
// Data was fetched via:
//   GET /api/rooms        → rooms[]
//   GET /api/reservations → reservations[]
//   GET /api/users        → users[]

import React, { useMemo } from 'react';
import {
  X, BarChart3, BedDouble, CheckCircle, TrendingUp,
  DollarSign, Users, Calendar, Clock,
} from 'lucide-react';
import './Modal.css';

const TYPE_COLORS = ['#6366f1','#8b5cf6','#0ea5e9','#10b981','#f59e0b'];

const ViewReportsModal = ({ onClose, rooms = [], reservations = [], users = [], stats = {} }) => {

  const analytics = useMemo(() => {
    // ── Room analytics ──
    const prices = rooms.map(r => r.pricePerNight ?? 0).filter(Boolean);
    const avgPrice    = prices.length ? Math.round(prices.reduce((a,b) => a+b,0)/prices.length) : 0;
    const maxPrice    = prices.length ? Math.max(...prices) : 0;
    const minPrice    = prices.length ? Math.min(...prices) : 0;
    const totalCapacity = rooms.reduce((s, r) => s + (r.capacity ?? 0), 0);

    // Room type breakdown
    const typeCounts = rooms.reduce((acc, r) => {
      const t = r.roomType || 'unknown';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    const typeBreakdown = Object.entries(typeCounts)
      .sort((a,b) => b[1]-a[1])
      .map(([type, count]) => ({
        type, count,
        pct: rooms.length ? Math.round((count/rooms.length)*100) : 0,
      }));

    // ── Reservation analytics ──
    const totalRevenue = reservations
      .filter(r => ['confirmed','checked-in'].includes(r.status))
      .reduce((s, r) => s + (r.totalPrice || 0), 0);

    const avgStay = reservations.length
      ? reservations.reduce((s, r) => {
          const d1 = new Date(r.checkInDate), d2 = new Date(r.checkOutDate);
          return s + Math.max(0, (d2-d1)/(1000*60*60*24));
        }, 0) / reservations.length
      : 0;

    // Guest name frequency
    const guestFreq = reservations.reduce((acc, r) => {
      acc[r.guestName] = (acc[r.guestName] || 0) + 1;
      return acc;
    }, {});
    const topGuest = Object.entries(guestFreq).sort((a,b)=>b[1]-a[1])[0];

    // ── User analytics ──
    const roleCounts = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});

    return {
      avgPrice, maxPrice, minPrice, totalCapacity, typeBreakdown,
      totalRevenue, avgStay: avgStay.toFixed(1), topGuest,
      roleCounts,
    };
  }, [rooms, reservations, users]);

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-title-row">
            <span className="modal-icon" style={{ background: '#f0f9ff', color: '#0ea5e9' }}>
              <BarChart3 size={20} />
            </span>
            <div>
              <h2>Reports & Analytics</h2>
              <p className="modal-subtitle">Live data from GET /api/rooms · /api/reservations · /api/users</p>
            </div>
          </div>
          <button className="modal-close" onClick={() => onClose(false)}><X size={20} /></button>
        </div>

        <div className="modal-form">

          {/* ── Top KPIs ── */}
          <div className="report-kpis">
            {[
              { label: 'Total Rooms',      value: stats.totalRooms ?? 0,
                Icon: BedDouble,   color: '#6366f1' },
              { label: 'Reservations',     value: reservations.length,
                Icon: Calendar,    color: '#f59e0b' },
              { label: 'Confirmed Revenue',value: analytics.totalRevenue >= 1000
                ? `$${(analytics.totalRevenue/1000).toFixed(1)}K`
                : `$${analytics.totalRevenue}`,
                Icon: DollarSign,  color: '#10b981' },
              { label: 'Staff Accounts',   value: users.length,
                Icon: Users,       color: '#ec4899' },
            ].map(({ label, value, Icon, color }) => (
              <div className="report-kpi" key={label} style={{ borderTop: `3px solid ${color}` }}>
                <Icon size={15} style={{ color }} />
                <p className="kpi-value">{value}</p>
                <p className="kpi-label">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Reservations breakdown ── */}
          <div className="report-section-title"><Calendar size={13} /> Reservation Status</div>
          <div className="report-status-row">
            {[
              { label: 'Pending',    value: stats.pendingRes   ?? 0, color: '#f59e0b', bg: '#fffbeb' },
              { label: 'Confirmed',  value: stats.confirmedRes ?? 0, color: '#6366f1', bg: '#eef2ff' },
              { label: 'Checked In', value: stats.checkedInRes ?? 0, color: '#10b981', bg: '#f0fdf4' },
              { label: 'Cancelled',  value: stats.cancelledRes ?? 0, color: '#ef4444', bg: '#fef2f2' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="report-status-box" style={{ background: bg }}>
                <p className="rsb-value" style={{ color }}>{value}</p>
                <p className="rsb-label">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Room type breakdown ── */}
          {analytics.typeBreakdown.length > 0 && (
            <>
              <div className="report-section-title"><BedDouble size={13} /> Room Types</div>
              <div className="type-breakdown">
                {analytics.typeBreakdown.map(({ type, count, pct }, i) => (
                  <div key={type} className="type-row">
                    <span className="type-dot" style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                    <span className="type-name capitalize">{type}</span>
                    <div className="type-bar-wrap">
                      <div className="type-bar" style={{ width: `${pct}%`, background: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                    </div>
                    <span className="type-count">{count} room{count !== 1 ? 's' : ''}</span>
                    <span className="type-pct">{pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Pricing summary ── */}
          <div className="report-section-title"><DollarSign size={13} /> Pricing Overview</div>
          <div className="report-price-row">
            {[
              { label: 'Avg. Price/Night',  value: `$${analytics.avgPrice}`   },
              { label: 'Highest Room',      value: `$${analytics.maxPrice}`   },
              { label: 'Lowest Room',       value: `$${analytics.minPrice}`   },
              { label: 'Total Capacity',    value: `${analytics.totalCapacity} guests` },
              { label: 'Avg. Stay',         value: `${analytics.avgStay} nights`      },
              { label: 'Top Guest',         value: analytics.topGuest ? analytics.topGuest[0] : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="price-box">
                <p className="price-box-value">{value}</p>
                <p className="price-box-label">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Staff by role ── */}
          {Object.keys(analytics.roleCounts).length > 0 && (
            <>
              <div className="report-section-title"><Users size={13} /> Staff by Role</div>
              <div className="avail-chips" style={{ marginBottom: 4 }}>
                {Object.entries(analytics.roleCounts).map(([role, count]) => (
                  <span key={role} className="avail-chip capitalize">
                    {role}: {count}
                  </span>
                ))}
              </div>
            </>
          )}

        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={() => onClose(false)}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewReportsModal;