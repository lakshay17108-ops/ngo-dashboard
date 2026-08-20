/* ============================================================
   js/db.js — LocalStorage Database Layer
   Mirrors the 5-table SQL schema from the spec
   ============================================================ */

const KEYS = {
  NGOS:     'ngo_db_ngos',
  USERS:    'ngo_db_users',
  EVENTS:   'ngo_db_calendar_events',
  MEETINGS: 'ngo_db_meeting_requests',
  NEWS:     'ngo_db_news_posts',
  SESSION:  'ngo_session',
  SEEDED:   'ngo_seeded_v2',
};

/* ── Helpers ─────────────────────────────────────────────── */
function _get(key)        { return JSON.parse(localStorage.getItem(key) || '[]'); }
function _set(key, data)  { localStorage.setItem(key, JSON.stringify(data)); }
function _uid()           { return Date.now() + Math.floor(Math.random() * 9999); }
function _code(len = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/* ── DB Object ───────────────────────────────────────────── */
const DB = {

  /* ── 1. NGOs (Tenant Entity) ─────────────────────────── */
  ngos: {
    getAll()         { return _get(KEYS.NGOS); },
    getById(id)      { return _get(KEYS.NGOS).find(n => n.id === id) || null; },
    getByCode(code)  { return _get(KEYS.NGOS).find(n => n.unique_code === code) || null; },

    create(d) {
      const rows = _get(KEYS.NGOS);
      const ngo = {
        id:             _uid(),
        name:           d.name,
        unique_code:    d.unique_code || _code(8),
        head_name:      d.head_name,
        official_email: d.official_email,
        phone:          d.phone,
        address_line:   d.address_line,
        city:           d.city,
        state:          d.state,
        pincode:        d.pincode,
        created_at:     new Date().toISOString(),
      };
      rows.push(ngo);
      _set(KEYS.NGOS, rows);
      return ngo;
    },
  },

  /* ── 2. Users (Role-Based Access) ───────────────────── */
  users: {
    getAll()                 { return _get(KEYS.USERS); },
    getById(id)              { return _get(KEYS.USERS).find(u => u.id === id) || null; },
    getByEmail(email)        { return _get(KEYS.USERS).find(u => u.email === email.toLowerCase()) || null; },
    getByNgo(ngoId)          { return _get(KEYS.USERS).filter(u => u.ngo_id === ngoId); },
    getPendingByNgo(ngoId)   { return _get(KEYS.USERS).filter(u => u.ngo_id === ngoId && u.status === 'PENDING_APPROVAL'); },
    getActiveByNgo(ngoId)    { return _get(KEYS.USERS).filter(u => u.ngo_id === ngoId && u.status === 'ACTIVE'); },

    create(d) {
      const rows = _get(KEYS.USERS);
      if (rows.find(u => u.email === d.email.toLowerCase())) {
        throw new Error('An account with this email already exists.');
      }
      const user = {
        id:            _uid(),
        ngo_id:        d.ngo_id,
        name:          d.name,
        email:         d.email.toLowerCase(),
        password_hash: btoa(unescape(encodeURIComponent(d.password))),
        role:          d.role,                            // 'ADMIN' | 'EMPLOYEE'
        status:        d.status || 'PENDING_APPROVAL',   // 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED'
        created_at:    new Date().toISOString(),
      };
      rows.push(user);
      _set(KEYS.USERS, rows);
      return user;
    },

    update(id, updates) {
      const rows = _get(KEYS.USERS);
      const idx = rows.findIndex(u => u.id === id);
      if (idx === -1) throw new Error('User not found.');
      rows[idx] = { ...rows[idx], ...updates };
      _set(KEYS.USERS, rows);
      return rows[idx];
    },
  },

  /* ── 3. Calendar Events (Dual-Scope) ─────────────────── */
  events: {
    getAll()         { return _get(KEYS.EVENTS); },
    getByNgo(ngoId)  { return _get(KEYS.EVENTS).filter(e => e.ngo_id === ngoId); },

    getForEmployee(ngoId, userId) {
      return _get(KEYS.EVENTS).filter(e =>
        e.ngo_id === ngoId &&
        (e.is_org_wide || e.is_global_holiday || e.assigned_user_id === userId)
      );
    },

    create(d) {
      const rows = _get(KEYS.EVENTS);
      const ev = {
        id:                  _uid(),
        ngo_id:              d.ngo_id,
        title:               d.title,
        description:         d.description || '',
        start_time:          d.start_time,
        end_time:            d.end_time,
        is_global_holiday:   d.is_global_holiday || false,
        is_org_wide:         d.is_org_wide || false,
        created_by_user_id:  d.created_by_user_id,
        assigned_user_id:    d.assigned_user_id || null,
        created_at:          new Date().toISOString(),
      };
      rows.push(ev);
      _set(KEYS.EVENTS, rows);
      return ev;
    },

    delete(id) { _set(KEYS.EVENTS, _get(KEYS.EVENTS).filter(e => e.id !== id)); },
  },

  /* ── 4. Meeting Requests (1-on-1 Appointments) ───────── */
  meetings: {
    getAll()                 { return _get(KEYS.MEETINGS); },
    getByNgo(ngoId)          { return _get(KEYS.MEETINGS).filter(r => r.ngo_id === ngoId); },
    getByEmployee(empId)     { return _get(KEYS.MEETINGS).filter(r => r.employee_id === empId); },

    create(d) {
      const rows = _get(KEYS.MEETINGS);
      const req = {
        id:             _uid(),
        ngo_id:         d.ngo_id,
        employee_id:    d.employee_id,
        admin_id:       d.admin_id,
        subject:        d.subject,
        message:        d.message || '',
        requested_date: d.requested_date,
        status:         'PENDING',   // 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED'
        created_at:     new Date().toISOString(),
      };
      rows.push(req);
      _set(KEYS.MEETINGS, rows);
      return req;
    },

    update(id, updates) {
      const rows = _get(KEYS.MEETINGS);
      const idx = rows.findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Request not found.');
      rows[idx] = { ...rows[idx], ...updates };
      _set(KEYS.MEETINGS, rows);
      return rows[idx];
    },
  },

  /* ── 5. News & Announcements ─────────────────────────── */
  news: {
    getAll()        { return _get(KEYS.NEWS); },
    getByNgo(ngoId) {
      return _get(KEYS.NEWS)
        .filter(p => p.ngo_id === ngoId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    create(d) {
      const rows = _get(KEYS.NEWS);
      const post = {
        id:         _uid(),
        ngo_id:     d.ngo_id,
        admin_id:   d.admin_id,
        title:      d.title,
        content:    d.content,
        created_at: new Date().toISOString(),
      };
      rows.push(post);
      _set(KEYS.NEWS, rows);
      return post;
    },

    delete(id) { _set(KEYS.NEWS, _get(KEYS.NEWS).filter(p => p.id !== id)); },
  },

  /* ── Session (simulated JWT) ─────────────────────────── */
  session: {
    get()           { const s = sessionStorage.getItem(KEYS.SESSION); return s ? JSON.parse(s) : null; },
    set(user, ngo)  { sessionStorage.setItem(KEYS.SESSION, JSON.stringify({ user, ngo })); },
    clear()         { sessionStorage.removeItem(KEYS.SESSION); },
  },

  /* ── Demo Seed Data ──────────────────────────────────── */
  seed() {
    if (localStorage.getItem(KEYS.SEEDED)) return;

    const today = new Date();
    const dt = (y, m, d, h = 0, min = 0) => new Date(y ?? today.getFullYear(), m ?? today.getMonth(), d ?? today.getDate(), h, min).toISOString();

    /* Create 3 demo NGOs */
    const ngo1 = this.ngos.create({ name: 'Helping Hands Foundation', unique_code: 'HHF12345', head_name: 'Priya Sharma', official_email: 'priya@helpinghands.org', phone: '+91 98765 43210', address_line: '12, Gandhi Nagar, Sector 4', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' });
    const ngo2 = this.ngos.create({ name: 'Green Earth Initiative',   unique_code: 'GEI67890', head_name: 'Arjun Mehta',  official_email: 'arjun@greenearth.org',   phone: '+91 87654 32109', address_line: '45, Eco Park Road',          city: 'Bengaluru', state: 'Karnataka', pincode: '560001' });
    const ngo3 = this.ngos.create({ name: 'Children First Society',   unique_code: 'CFS11223', head_name: 'Anita Reddy',  official_email: 'hello@childrenfirst.org', phone: '+91 76543 21098', address_line: '78, Rose Garden Lane',       city: 'Hyderabad', state: 'Telangana', pincode: '500001' });

    /* Admin users */
    const a1 = this.users.create({ ngo_id: ngo1.id, name: 'Priya Sharma', email: 'priya@helpinghands.org', password: 'admin123', role: 'ADMIN',    status: 'ACTIVE' });
    const a2 = this.users.create({ ngo_id: ngo2.id, name: 'Arjun Mehta',  email: 'arjun@greenearth.org',   password: 'admin123', role: 'ADMIN',    status: 'ACTIVE' });
         this.users.create({ ngo_id: ngo1.id, name: 'Ravi Kumar',   email: 'ravi@helpinghands.org',   password: 'emp123',   role: 'EMPLOYEE', status: 'ACTIVE' });
    const emp2 = this.users.create({ ngo_id: ngo1.id, name: 'Sara Thomas',  email: 'sara@helpinghands.org',  password: 'emp123',   role: 'EMPLOYEE', status: 'ACTIVE' });
         this.users.create({ ngo_id: ngo1.id, name: 'Neha Patel',   email: 'neha@helpinghands.org',  password: 'emp123',   role: 'EMPLOYEE', status: 'PENDING_APPROVAL' });

    /* Calendar events for ngo1 */
    const yr = today.getFullYear();
    this.events.create({ ngo_id: ngo1.id, title: 'Republic Day Holiday',    description: 'National holiday — office closed',      start_time: dt(yr,0,26), end_time: dt(yr,0,26,23,59), is_global_holiday: true, is_org_wide: true, created_by_user_id: a1.id });
    this.events.create({ ngo_id: ngo1.id, title: 'Independence Day Holiday', description: 'National holiday — office closed',      start_time: dt(yr,7,15), end_time: dt(yr,7,15,23,59), is_global_holiday: true, is_org_wide: true, created_by_user_id: a1.id });
    this.events.create({ ngo_id: ngo1.id, title: 'Gandhi Jayanti',           description: 'National holiday — office closed',      start_time: dt(yr,9,2),  end_time: dt(yr,9,2,23,59),  is_global_holiday: true, is_org_wide: true, created_by_user_id: a1.id });
    this.events.create({ ngo_id: ngo1.id, title: 'Quarterly Team Sync',      description: 'All-hands planning session for Q3',    start_time: dt(yr, today.getMonth(), today.getDate()+3, 10, 0), end_time: dt(yr, today.getMonth(), today.getDate()+3, 12, 0), is_org_wide: true,  created_by_user_id: a1.id });
    this.events.create({ ngo_id: ngo1.id, title: 'Community Outreach Drive', description: 'Field volunteers needed — bring IDs',  start_time: dt(yr, today.getMonth(), today.getDate()+10,9,0), end_time: dt(yr, today.getMonth(), today.getDate()+10,17,0), is_org_wide: true,  created_by_user_id: a1.id });
    this.events.create({ ngo_id: ngo1.id, title: 'Sara — Report Submission', description: 'Submit monthly volunteer report by EOD',start_time: dt(yr, today.getMonth(), today.getDate()+5,17,0), end_time: dt(yr, today.getMonth(), today.getDate()+5,18,0), assigned_user_id: emp2.id, created_by_user_id: a1.id });

    /* News for ngo1 */
    this.news.create({ ngo_id: ngo1.id, admin_id: a1.id, title: 'Welcome to NGO Connect! 🎉', content: 'We are thrilled to launch our new digital management platform. This workspace will help our team coordinate events, track meetings, and stay aligned on our mission. If you have any questions, reach out through the Request Meeting feature.' });
    this.news.create({ ngo_id: ngo1.id, admin_id: a1.id, title: 'Volunteer Drive — August 2026', content: 'We are organizing a community outreach program on the last weekend of August. All volunteers are encouraged to participate. Please submit a meeting request if you need more details about your assigned zone or logistics.' });

    /* Meeting request from emp2 */
    this.meetings.create({ ngo_id: ngo1.id, employee_id: emp2.id, admin_id: a1.id, subject: 'Discussion on Monthly Report Template', message: 'Hi, I wanted to check on the new template for the monthly volunteer report before I submit it next week.', requested_date: dt(yr, today.getMonth(), today.getDate()+6, 14, 0) });

    localStorage.setItem(KEYS.SEEDED, 'true');
  },
};
