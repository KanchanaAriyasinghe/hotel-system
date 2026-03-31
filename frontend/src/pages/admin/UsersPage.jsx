// frontend/src/pages/admin/UsersPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Users, Search, RefreshCw, X, Eye,
  User, Mail, Phone, Shield, Building2,
  Briefcase, DollarSign, Calendar, Clock,
  MapPin, Globe, CreditCard, BookOpen,
  CheckCircle, XCircle, AlertCircle,
  ChevronDown, ChevronUp, Star, Tag,
  UserCheck, UserX, Activity, UserPlus,
  Pencil, Trash2,
} from 'lucide-react';
import AddUserModal        from './modals/AddUserModal';
import AddStaffModal       from './modals/AddStaffModal';   // ← same modal as dashboard
import EditUserModal       from './modals/EditUserModal';
import DeleteConfirmModal  from './modals/DeleteConfirmModal';
import './UsersPage.css';

const API = process.env.REACT_APP_API_URL;
const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// ── Helpers ───────────────────────────────────────────────────────
const fmt       = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtSalary = s => s ? `$${Number(s).toLocaleString()}` : '—';

const ROLE_META = {
  admin:        { label: 'Admin',        cls: 'role--purple', Icon: Shield    },
  receptionist: { label: 'Receptionist', cls: 'role--blue',   Icon: UserCheck },
  housekeeper:  { label: 'Housekeeper',  cls: 'role--teal',   Icon: Activity  },
};

const DEPT_COLORS = {
  'front desk': '#6366f1', housekeeping: '#10b981', management: '#f59e0b',
  kitchen: '#ef4444', security: '#0ea5e9', maintenance: '#8b5cf6',
};

const avatar = (name) => {
  const parts = (name || '?').split(' ');
  return parts.length >= 2
    ? parts[0][0].toUpperCase() + parts[1][0].toUpperCase()
    : (name || '?')[0].toUpperCase();
};

const avatarColor = (name) => {
  const colors = ['#6366f1','#10b981','#f59e0b','#0ea5e9','#ef4444','#8b5cf6','#ec4899','#14b8a6'];
  let h = 0;
  for (let c of (name || '')) h = c.charCodeAt(0) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
};

// ── Staff Detail Drawer ───────────────────────────────────────────
const StaffDrawer = ({ staff, user, onClose }) => {
  const rm       = ROLE_META[user?.role] || ROLE_META.receptionist;
  const initials = avatar(staff?.name || user?.fullName);
  const bgColor  = avatarColor(staff?.name || user?.fullName);

  return (
    <div className="up-overlay" onClick={onClose}>
      <aside className="up-drawer" onClick={e => e.stopPropagation()}>
        <div className="up-drawer-header">
          <button className="up-drawer-close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="up-drawer-hero">
          <div className="up-avatar-lg" style={{ background: bgColor }}>{initials}</div>
          <h2 className="up-drawer-hero-name">{staff?.name || user?.fullName || '—'}</h2>
          <p className="up-drawer-hero-sub">{staff?.position || '—'}</p>
          <div className="up-drawer-hero-badges">
            <span className={`up-role-pill ${rm.cls}`}><rm.Icon size={11}/>{rm.label}</span>
            {staff?.isActive !== undefined && (
              <span className={staff.isActive ? 'up-active-pill' : 'up-inactive-pill'}>
                {staff.isActive ? <><CheckCircle size={11}/>Active</> : <><XCircle size={11}/>Inactive</>}
              </span>
            )}
          </div>
        </div>
        <div className="up-drawer-body">
          <section className="up-drawer-section">
            <h4 className="up-section-title">Contact</h4>
            <div className="up-info-list">
              <InfoRow Icon={Mail}  label="Email" value={staff?.email  || user?.email       || '—'} />
              <InfoRow Icon={Phone} label="Phone" value={staff?.phone  || user?.phoneNumber || '—'} />
            </div>
          </section>
          <section className="up-drawer-section">
            <h4 className="up-section-title">Work Details</h4>
            <div className="up-info-list">
              <InfoRow Icon={Building2}  label="Department" value={staff?.department || '—'} capitalize />
              <InfoRow Icon={Briefcase}  label="Position"   value={staff?.position   || '—'} capitalize />
              <InfoRow Icon={DollarSign} label="Salary"     value={fmtSalary(staff?.salary)} />
              <InfoRow Icon={Clock}      label="Shift"      value={staff?.shiftTiming || '—'} />
              <InfoRow Icon={Calendar}   label="Join Date"  value={fmt(staff?.joinDate)} />
            </div>
          </section>
          <section className="up-drawer-section">
            <h4 className="up-section-title">Account</h4>
            <div className="up-info-list">
              <InfoRow Icon={Shield}   label="Role"       value={user?.role || '—'} capitalize />
              <InfoRow Icon={Calendar} label="Last Login" value={fmt(user?.lastLogin)} />
              <InfoRow Icon={Calendar} label="Created"    value={fmt(user?.createdAt || staff?.createdAt)} />
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};

// ── Guest Detail Drawer ───────────────────────────────────────────
const GuestDrawer = ({ guest, onClose }) => {
  const initials = avatar(guest.name);
  const bgColor  = avatarColor(guest.name);

  return (
    <div className="up-overlay" onClick={onClose}>
      <aside className="up-drawer" onClick={e => e.stopPropagation()}>
        <div className="up-drawer-header">
          <button className="up-drawer-close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="up-drawer-hero up-drawer-hero--guest">
          <div className="up-avatar-lg" style={{ background: bgColor }}>{initials}</div>
          <h2 className="up-drawer-hero-name">{guest.name || '—'}</h2>
          <p className="up-drawer-hero-sub">
            {guest.city && guest.country ? `${guest.city}, ${guest.country}` : guest.country || guest.city || 'Guest'}
          </p>
          <div className="up-drawer-hero-badges">
            <span className="up-guest-badge"><Star size={11}/>Guest</span>
            <span className="up-bookings-badge">
              <BookOpen size={11}/>{guest.bookingHistory?.length || 0} booking{guest.bookingHistory?.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="up-drawer-body">
          <section className="up-drawer-section">
            <h4 className="up-section-title">Contact</h4>
            <div className="up-info-list">
              <InfoRow Icon={Mail}  label="Email" value={guest.email || '—'} />
              <InfoRow Icon={Phone} label="Phone" value={guest.phone || '—'} />
            </div>
          </section>
          <section className="up-drawer-section">
            <h4 className="up-section-title">Location</h4>
            <div className="up-info-list">
              <InfoRow Icon={MapPin} label="Address" value={guest.address || '—'} />
              <InfoRow Icon={MapPin} label="City"    value={guest.city    || '—'} />
              <InfoRow Icon={Globe}  label="Country" value={guest.country || '—'} />
            </div>
          </section>
          {guest.idProof && (
            <section className="up-drawer-section">
              <h4 className="up-section-title">Identity</h4>
              <div className="up-info-list">
                <InfoRow Icon={CreditCard} label="ID Proof" value={guest.idProof} />
              </div>
            </section>
          )}
          {guest.preferences?.length > 0 && (
            <section className="up-drawer-section">
              <h4 className="up-section-title">Preferences</h4>
              <div className="up-tags">
                {guest.preferences.map(p => (
                  <span key={p} className="up-tag"><Tag size={10}/>{p}</span>
                ))}
              </div>
            </section>
          )}
          <section className="up-drawer-section">
            <h4 className="up-section-title">Activity</h4>
            <div className="up-info-list">
              <InfoRow Icon={BookOpen} label="Bookings" value={`${guest.bookingHistory?.length || 0} total`} />
              <InfoRow Icon={Calendar} label="Joined"   value={fmt(guest.createdAt)} />
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};

// ── Shared InfoRow ────────────────────────────────────────────────
const InfoRow = ({ Icon, label, value, capitalize }) => (
  <div className="up-info-row">
    <span className="up-info-icon"><Icon size={13}/></span>
    <span className="up-info-label">{label}</span>
    <span className={`up-info-value ${capitalize ? 'capitalize' : ''}`}>{value}</span>
  </div>
);

// ── Staff Card ────────────────────────────────────────────────────
const StaffCard = ({ staff, user, onClick, onEdit, onDelete }) => {
  const rm       = ROLE_META[user?.role] || ROLE_META.receptionist;
  const initials = avatar(staff?.name || user?.fullName);
  const bgColor  = avatarColor(staff?.name || user?.fullName);
  const dept     = staff?.department || '—';
  const dColor   = DEPT_COLORS[dept.toLowerCase()] || '#6366f1';

  return (
    <div className="up-card" onClick={onClick}>
      <div className="up-card-top">
        <div className="up-avatar" style={{ background: bgColor }}>{initials}</div>
        <div className="up-card-meta">
          <span className={`up-role-pill ${rm.cls}`}><rm.Icon size={10}/>{rm.label}</span>
          <span className={staff?.isActive !== false ? 'up-dot up-dot--on' : 'up-dot up-dot--off'} />
        </div>
      </div>
      <h3 className="up-card-name">{staff?.name || user?.fullName || '—'}</h3>
      <p className="up-card-pos">{staff?.position || 'Staff Member'}</p>
      <div className="up-card-dept" style={{ '--dc': dColor }}>
        <Building2 size={11}/>{dept}
      </div>
      <div className="up-card-footer">
        <span><Mail size={11}/>{staff?.email || user?.email || '—'}</span>
        {staff?.shiftTiming && <span><Clock size={11}/>{staff.shiftTiming}</span>}
      </div>
      <div className="up-card-actions" onClick={e => e.stopPropagation()}>
        <button className="up-card-view-btn"   onClick={onClick}  ><Eye    size={13}/> View</button>
        <button className="up-card-edit-btn"   onClick={onEdit}   ><Pencil size={13}/> Edit</button>
        <button className="up-card-delete-btn" onClick={onDelete} ><Trash2 size={13}/></button>
      </div>
    </div>
  );
};

// ── Guest Card ────────────────────────────────────────────────────
const GuestCard = ({ guest, onClick, onDelete }) => {
  const initials = avatar(guest.name);
  const bgColor  = avatarColor(guest.name);

  return (
    <div className="up-card up-card--guest" onClick={onClick}>
      <div className="up-card-top">
        <div className="up-avatar up-avatar--guest" style={{ background: bgColor }}>{initials}</div>
        <span className="up-guest-badge"><Star size={10}/>Guest</span>
      </div>
      <h3 className="up-card-name">{guest.name || '—'}</h3>
      <p className="up-card-pos">
        {guest.city && guest.country ? `${guest.city}, ${guest.country}` : guest.email || '—'}
      </p>
      <div className="up-card-footer">
        <span><Mail size={11}/>{guest.email || '—'}</span>
        <span><BookOpen size={11}/>{guest.bookingHistory?.length || 0} booking{guest.bookingHistory?.length !== 1 ? 's' : ''}</span>
      </div>
      {guest.preferences?.length > 0 && (
        <div className="up-mini-tags">
          {guest.preferences.slice(0, 3).map(p => <span key={p} className="up-mini-tag">{p}</span>)}
          {guest.preferences.length > 3 && <span className="up-mini-tag">+{guest.preferences.length - 3}</span>}
        </div>
      )}
      <div className="up-card-actions" onClick={e => e.stopPropagation()}>
        <button className="up-card-view-btn"   onClick={onClick}  ><Eye    size={13}/> View</button>
        <button className="up-card-delete-btn" onClick={onDelete} ><Trash2 size={13}/></button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────
const UsersPage = () => {
  const [activeTab,    setActiveTab]    = useState('staff');
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  // ── Modal visibility ────────────────────────────────────────
  const [showAddStaff, setShowAddStaff] = useState(false); // ← Add Staff Member
  const [showAddUser,  setShowAddUser]  = useState(false); // ← Add User Account

  const [users,  setUsers]  = useState([]);
  const [staff,  setStaff]  = useState([]);
  const [guests, setGuests] = useState([]);

  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState('all');
  const [deptFilter,   setDeptFilter]   = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortDir,      setSortDir]      = useState('asc');

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [editTarget,    setEditTarget]    = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);

  // ── Fetch ───────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    const [usersRes, staffRes, guestsRes] = await Promise.allSettled([
      axios.get(`${API}/users`,  getAuthHeaders()),
      axios.get(`${API}/staff`,  getAuthHeaders()),
      axios.get(`${API}/guests`, getAuthHeaders()),
    ]);
    setUsers( usersRes.status  === 'fulfilled' ? (usersRes.value.data?.data  ?? usersRes.value.data  ?? []) : []);
    setStaff( staffRes.status  === 'fulfilled' ? (staffRes.value.data?.data  ?? staffRes.value.data  ?? []) : []);
    setGuests(guestsRes.status === 'fulfilled' ? (guestsRes.value.data?.data ?? guestsRes.value.data ?? []) : []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRefresh = () => { setRefreshing(true); fetchAll(); };

  // ── Modal close handlers ────────────────────────────────────
  const handleAddStaffClose = (ok) => { setShowAddStaff(false); if (ok) fetchAll(); };
  const handleAddUserClose  = (ok) => { setShowAddUser(false);  if (ok) fetchAll(); };
  const handleEditClose     = (ok) => { setEditTarget(null);    if (ok) fetchAll(); };
  const handleDeleteClose   = (ok) => { setDeleteTarget(null);  if (ok) fetchAll(); };

  // ── Merge staff + users ─────────────────────────────────────
  const mergedStaff = staff.map(s => {
    const user = users.find(u =>
      u.email === s.email ||
      (s.userId && u._id === s.userId?.toString())
    );
    return { staff: s, user: user || null };
  });

  const unmatchedUsers = users
    .filter(u => !staff.some(s =>
      s.email === u.email || s.userId?.toString() === u._id?.toString()
    ))
    .map(u => ({ staff: null, user: u }));

  const allStaffRows = [...mergedStaff, ...unmatchedUsers];

  // ── Stats ───────────────────────────────────────────────────
  const stats = {
    totalStaff:   users.length,
    activeStaff:  staff.filter(s => s.isActive !== false).length,
    admins:       users.filter(u => u.role === 'admin').length,
    totalGuests:  guests.length,
    withBookings: guests.filter(g => g.bookingHistory?.length > 0).length,
  };

  const departments = [...new Set(staff.map(s => s.department).filter(Boolean))];

  // ── Filter & sort ───────────────────────────────────────────
  const filteredStaff = allStaffRows
    .filter(({ staff: s, user: u }) => {
      const name  = s?.name  || u?.fullName || '';
      const email = s?.email || u?.email    || '';
      const q     = search.toLowerCase();
      const matchSearch = !q
        || name.toLowerCase().includes(q)
        || email.toLowerCase().includes(q)
        || s?.department?.toLowerCase().includes(q)
        || s?.position?.toLowerCase().includes(q);
      const matchRole   = roleFilter   === 'all' || u?.role === roleFilter;
      const matchDept   = deptFilter   === 'all' || s?.department?.toLowerCase() === deptFilter.toLowerCase();
      const matchActive = activeFilter === 'all'
        || (activeFilter === 'active'   && s?.isActive !== false)
        || (activeFilter === 'inactive' && s?.isActive === false);
      return matchSearch && matchRole && matchDept && matchActive;
    })
    .sort((a, b) => {
      const av = (a.staff?.name || a.user?.fullName || '').toLowerCase();
      const bv = (b.staff?.name || b.user?.fullName || '').toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const filteredGuests = guests
    .filter(g => {
      const q = search.toLowerCase();
      return !q
        || g.name?.toLowerCase().includes(q)
        || g.email?.toLowerCase().includes(q)
        || g.city?.toLowerCase().includes(q)
        || g.country?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const av = (a.name || '').toLowerCase();
      const bv = (b.name || '').toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  if (loading) {
    return (
      <div className="up-loading">
        <div className="up-spinner"/>
        <p>Loading users…</p>
      </div>
    );
  }

  return (
    <div className="up-page">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="up-header">
        <div>
          <h1 className="up-title">Users</h1>
          <p className="up-subtitle">Staff accounts & hotel guests</p>
        </div>

        <div className="up-header-actions">
          {/* ── Add Staff Member — identical to Dashboard quick action ── */}
          <button className="up-add-staff-btn" onClick={() => setShowAddStaff(true)}>
            <Users size={15}/> Add Staff Member
          </button>

          {/* ── Add User Account ── */}
          <button className="up-add-user-btn" onClick={() => setShowAddUser(true)}>
            <UserPlus size={15}/> Add User
          </button>

          <button
            className={`up-refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
          >
            <RefreshCw size={16}/>
          </button>
        </div>
      </header>

      {/* ── Summary ────────────────────────────────────────────── */}
      <section className="up-summary">
        {[
          { label: 'Total Staff',   value: stats.totalStaff,   color: '#6366f1', bg: '#eef2ff', Icon: Users    },
          { label: 'Active Staff',  value: stats.activeStaff,  color: '#10b981', bg: '#f0fdf4', Icon: UserCheck },
          { label: 'Admins',        value: stats.admins,       color: '#f59e0b', bg: '#fffbeb', Icon: Shield   },
          { label: 'Total Guests',  value: stats.totalGuests,  color: '#0ea5e9', bg: '#f0f9ff', Icon: User     },
          { label: 'With Bookings', value: stats.withBookings, color: '#8b5cf6', bg: '#f5f3ff', Icon: BookOpen },
        ].map(({ label, value, color, bg, Icon }) => (
          <div key={label} className="up-summary-card" style={{ '--c': color, '--bg': bg }}>
            <div className="up-summary-icon" style={{ background: bg, color }}><Icon size={18}/></div>
            <div>
              <span className="up-summary-val">{value}</span>
              <span className="up-summary-label">{label}</span>
            </div>
          </div>
        ))}
      </section>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="up-tabs">
        <button
          className={`up-tab ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => { setActiveTab('staff'); setSearch(''); }}
        >
          <Users size={15}/> Staff & Accounts
          <span className="up-tab-count">{allStaffRows.length}</span>
        </button>
        <button
          className={`up-tab ${activeTab === 'guests' ? 'active' : ''}`}
          onClick={() => { setActiveTab('guests'); setSearch(''); }}
        >
          <User size={15}/> Guests
          <span className="up-tab-count">{guests.length}</span>
        </button>
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="up-filters">
        <div className="up-search-wrap">
          <Search size={14} className="up-search-icon"/>
          <input
            className="up-search"
            placeholder={activeTab === 'staff' ? 'Search name, email, dept…' : 'Search name, email, city…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="up-search-clear" onClick={() => setSearch('')}>
              <X size={13}/>
            </button>
          )}
        </div>

        {activeTab === 'staff' && (
          <>
            <select className="up-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              {Object.entries(ROLE_META).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>

            {departments.length > 0 && (
              <select className="up-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="all">All Depts</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}

            <select className="up-select" value={activeFilter} onChange={e => setActiveFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </>
        )}

        <button
          className="up-sort-btn"
          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
        >
          {sortDir === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} Name
        </button>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      {activeTab === 'staff' ? (
        filteredStaff.length === 0
          ? <EmptyState label="No staff found" />
          : (
            <div className="up-grid">
              {filteredStaff.map(({ staff: s, user: u }, i) => (
                <StaffCard
                  key={s?._id || u?._id || i}
                  staff={s} user={u}
                  onClick={()  => setSelectedStaff({ staff: s, user: u })}
                  onEdit={e    => { e.stopPropagation(); setEditTarget({ staff: s, user: u }); }}
                  onDelete={e  => { e.stopPropagation(); setDeleteTarget({ staff: s, user: u }); }}
                />
              ))}
            </div>
          )
      ) : (
        filteredGuests.length === 0
          ? <EmptyState label="No guests found" />
          : (
            <div className="up-grid">
              {filteredGuests.map((g, i) => (
                <GuestCard
                  key={g._id || i}
                  guest={g}
                  onClick={()  => setSelectedGuest(g)}
                  onDelete={e  => { e.stopPropagation(); setDeleteTarget({ guest: g }); }}
                />
              ))}
            </div>
          )
      )}

      {/* ── Drawers ─────────────────────────────────────────────── */}
      {selectedStaff && (
        <StaffDrawer
          staff={selectedStaff.staff}
          user={selectedStaff.user}
          onClose={() => setSelectedStaff(null)}
        />
      )}
      {selectedGuest && (
        <GuestDrawer guest={selectedGuest} onClose={() => setSelectedGuest(null)} />
      )}

      {/* ── Add Staff Member Modal (same as Admin Dashboard) ───── */}
      {showAddStaff && (
        <AddStaffModal onClose={handleAddStaffClose} />
      )}

      {/* ── Add User Account Modal ──────────────────────────────── */}
      {showAddUser && (
        <AddUserModal onClose={handleAddUserClose} staffList={staff} />
      )}

      {/* ── Edit Modal ─────────────────────────────────────────── */}
      {editTarget && (
        <EditUserModal
          staff={editTarget.staff}
          user={editTarget.user}
          onClose={handleEditClose}
        />
      )}

      {/* ── Delete Confirm Modal ────────────────────────────────── */}
      {deleteTarget && (
        <DeleteConfirmModal
          staff={deleteTarget.staff ?? null}
          user={deleteTarget.user   ?? deleteTarget.guest ?? null}
          onClose={handleDeleteClose}
        />
      )}
    </div>
  );
};

const EmptyState = ({ label }) => (
  <div className="up-empty">
    <AlertCircle size={30}/>
    <p>{label}</p>
    <span>Try adjusting your search or filters</span>
  </div>
);

export default UsersPage;