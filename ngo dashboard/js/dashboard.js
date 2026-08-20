/* ============================================================
   js/dashboard.js — Role-Adaptive Dashboard Logic
   Handles both Admin and Employee views
   ============================================================ */

let SESSION = null;
let calState = {
  year:  new Date().getFullYear(),
  month: new Date().getMonth(),
  selectedDay: null,
};

/* ──────────────────────────────────────────────────────────
   INIT
   ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  SESSION = Auth.requireAuth();
  if (!SESSION) return;

  _setupHeader();
  _setupSidebar();

  if (SESSION.user.status === 'PENDING_APPROVAL') {
    _showPending(); return;
  }
  if (SESSION.user.status === 'REJECTED') {
    Auth.logout(); return;
  }

  showSection('overview');
  AIWidget.init();
});

function _setupHeader() {
  const u = SESSION.user, n = SESSION.ngo;
  _el('hd-user').textContent    = u.name;
  _el('hd-role').textContent    = u.role === 'ADMIN' ? 'Administrator' : 'Employee';
  _el('sb-avatar').textContent  = u.name.charAt(0).toUpperCase();
  _el('sb-uname').textContent   = u.name;
  _el('sb-urole').textContent   = u.role === 'ADMIN' ? 'Administrator' : 'Employee';
  _el('sb-org').textContent     = n.name;
}

function _setupSidebar() {
  const isAdmin = SESSION.user.role === 'ADMIN';
  document.querySelectorAll('[data-role="admin"]').forEach(el   => el.classList.toggle('hidden', !isAdmin));
  document.querySelectorAll('[data-role="employee"]').forEach(el => el.classList.toggle('hidden', isAdmin));
  if (isAdmin) _refreshBadge();
}

function _showPending() {
  _el('pendingScreen').classList.remove('hidden');
  _el('pendingOrg').textContent = SESSION.ngo.name;
}

/* ──────────────────────────────────────────────────────────
   NAVIGATION
   ────────────────────────────────────────────────────────── */
function showSection(id) {
  document.querySelectorAll('.nav-item[data-section]').forEach(el =>
    el.classList.toggle('active', el.dataset.section === id)
  );
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const sec = _el(`sec-${id}`);
  if (sec) sec.classList.add('active');

  const TITLES = {
    'overview':        ['Dashboard Overview',     `Welcome back, ${SESSION.user.name.split(' ')[0]}!`],
    'approvals':       ['Pending Approvals',      'Review and manage join requests'],
    'team':            ['Team Members',           'All active members of your organisation'],
    'calendar':        ['Calendar & Events',      'View, create, and manage events'],
    'announcements':   ['Announcements',          'Post news and updates for your team'],
    'meetings':        ['Meeting Requests',       'Review 1-on-1 appointment requests'],
    'request-meeting': ['Request a Meeting',      'Schedule a 1-on-1 with your administrator'],
    'newsfeed':        ['News Feed',              'Latest announcements from your organisation'],
    'my-meetings':     ['My Meeting Requests',    'Track your submitted meeting requests'],
  };
  const [title, sub] = TITLES[id] || ['Dashboard', ''];
  _el('hdTitle').textContent = title;
  _el('hdSub').textContent   = sub;

  _render(id);
  document.getElementById('sidebar').classList.remove('open');
}

function _render(id) {
  switch (id) {
    case 'overview':        renderOverview();       break;
    case 'approvals':       renderApprovals();      break;
    case 'team':            renderTeam();           break;
    case 'calendar':        renderCalendar();       break;
    case 'announcements':   renderAnnouncements();  break;
    case 'meetings':        renderAdminMeetings();  break;
    case 'request-meeting': renderReqMeeting();     break;
    case 'newsfeed':        renderNewsFeed();       break;
    case 'my-meetings':     renderMyMeetings();     break;
  }
}

/* ──────────────────────────────────────────────────────────
   OVERVIEW
   ────────────────────────────────────────────────────────── */
function renderOverview() {
  Quotes.render('qbText', 'qbAuthor');
  const { ngo, user } = SESSION;
  const isAdmin = user.role === 'ADMIN';

  if (isAdmin) {
    const active   = DB.users.getActiveByNgo(ngo.id).filter(u => u.role === 'EMPLOYEE');
    const pending  = DB.users.getPendingByNgo(ngo.id);
    const evs      = DB.events.getByNgo(ngo.id).filter(e => new Date(e.start_time) >= new Date());
    const pendMtg  = DB.meetings.getByNgo(ngo.id).filter(r => r.status === 'PENDING');

    _setStats(
      [active.length, 'Active Employees'],
      [pending.length, 'Pending Approvals'],
      [evs.length, 'Upcoming Events'],
      [pendMtg.length, 'Pending Meetings'],
    );
    _renderActivity(DB.meetings.getByNgo(ngo.id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6), 'mtg');
  } else {
    const evs     = DB.events.getForEmployee(ngo.id, user.id).filter(e => new Date(e.start_time) >= new Date());
    const myMtgs  = DB.meetings.getByEmployee(user.id);
    const pending = myMtgs.filter(r => r.status === 'PENDING');
    const news    = DB.news.getByNgo(ngo.id);

    _setStats(
      [evs.length, 'Upcoming Events'],
      [pending.length, 'Pending Requests'],
      [myMtgs.length, 'Total Requests'],
      [news.length, 'News Posts'],
    );
    _renderActivity(news.slice(0, 5), 'news');
  }
}

function _setStats([v1,l1], [v2,l2], [v3,l3], [v4,l4]) {
  _el('s1v').textContent = v1; _el('s1l').textContent = l1;
  _el('s2v').textContent = v2; _el('s2l').textContent = l2;
  _el('s3v').textContent = v3; _el('s3l').textContent = l3;
  _el('s4v').textContent = v4; _el('s4l').textContent = l4;
}

function _renderActivity(items, type) {
  const c = _el('actList');
  if (!items.length) {
    c.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px;">No recent activity.</div>`;
    return;
  }

  c.innerHTML = items.map(item => {
    if (type === 'mtg') {
      const emp = DB.users.getById(item.employee_id);
      const d   = _fmtDate(item.created_at);
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border);">
          <div class="sb-avatar" style="width:34px;height:34px;font-size:13px;background:var(--primary-subtle);color:var(--primary);">${emp ? emp.name.charAt(0) : '?'}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13.5px;font-weight:600;">${item.subject}</div>
            <div style="font-size:12px;color:var(--text-3);">${emp ? emp.name : 'Unknown'} &nbsp;·&nbsp; ${d}</div>
          </div>
          ${_badge(item.status)}
        </div>`;
    } else {
      const d = _fmtDate(item.created_at);
      return `
        <div style="display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-bottom:1px solid var(--border);">
          <div style="width:34px;height:34px;border-radius:8px;background:var(--primary-subtle);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;">📢</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13.5px;font-weight:600;">${item.title}</div>
            <div style="font-size:12px;color:var(--text-3);">${d}</div>
          </div>
        </div>`;
    }
  }).join('');
}

/* ──────────────────────────────────────────────────────────
   ADMIN: PENDING APPROVALS
   ────────────────────────────────────────────────────────── */
function renderApprovals() {
  _refreshBadge();
  const pending = DB.users.getPendingByNgo(SESSION.ngo.id);
  const c = _el('approvalsCnt');

  if (!pending.length) {
    c.innerHTML = _empty('✅', 'All caught up!', 'No pending approval requests right now.');
    return;
  }

  c.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${pending.map(u => `
            <tr id="arow-${u.id}">
              <td>${_avatar(u.name, 'var(--accent-subtle)', 'hsl(38,80%,35%)')} &nbsp;${u.name}</td>
              <td>${u.email}</td>
              <td>${_fmtDate(u.created_at)}</td>
              <td><span class="badge badge-warn">Pending</span></td>
              <td>
                <div style="display:flex;gap:6px;">
                  <button class="btn btn-success btn-sm" onclick="approveUser(${u.id})"><i class="bi bi-check-lg"></i> Approve</button>
                  <button class="btn btn-danger btn-sm"  onclick="rejectUser(${u.id})"><i class="bi bi-x-lg"></i> Reject</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function approveUser(id) {
  DB.users.update(id, { status: 'ACTIVE' });
  toast('Employee approved! 🎉', 'ok');
  renderApprovals();
}

function rejectUser(id) {
  if (!confirm('Reject this join request?')) return;
  DB.users.update(id, { status: 'REJECTED' });
  toast('Request rejected.', 'err');
  renderApprovals();
}

/* ──────────────────────────────────────────────────────────
   ADMIN: TEAM MEMBERS
   ────────────────────────────────────────────────────────── */
function renderTeam() {
  const members = DB.users.getActiveByNgo(SESSION.ngo.id).filter(u => u.id !== SESSION.user.id);
  const orgCodeEl = _el('orgCode');
  if (orgCodeEl) orgCodeEl.textContent = SESSION.ngo.unique_code;

  const c = _el('teamCnt');
  if (!members.length) {
    c.innerHTML = _empty('👥', 'No team members yet', `Share code <strong>${SESSION.ngo.unique_code}</strong> with your volunteers and employees.`);
    return;
  }

  c.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th></tr></thead>
        <tbody>
          ${members.map(u => `
            <tr>
              <td style="display:flex;align-items:center;gap:10px;">${_avatar(u.name)} <span style="font-weight:500;">${u.name}</span></td>
              <td>${u.email}</td>
              <td><span class="badge badge-info">${u.role}</span></td>
              <td>${_fmtDate(u.created_at)}</td>
              <td><span class="badge badge-ok">Active</span></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/* ──────────────────────────────────────────────────────────
   CALENDAR (Admin + Employee)
   ────────────────────────────────────────────────────────── */
function renderCalendar() {
  const isAdmin = SESSION.user.role === 'ADMIN';
  // Show create button only for admins
  const btn = _el('calCreateBtn');
  if (btn) btn.classList.toggle('hidden', !isAdmin);

  const evs = _getEventsForRole();
  _renderGrid(evs);
  _renderUpcoming(evs);
}

function _getEventsForRole() {
  const { ngo, user } = SESSION;
  return user.role === 'ADMIN'
    ? DB.events.getByNgo(ngo.id)
    : DB.events.getForEmployee(ngo.id, user.id);
}

function _renderGrid(evs) {
  const { year, month } = calState;
  _el('calTitle').textContent = new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  /* Build date → events map */
  const map = {};
  evs.forEach(e => {
    const d = new Date(e.start_time);
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    (map[k] = map[k] || []).push(e);
  });

  const firstDay      = new Date(year, month, 1).getDay();
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const daysInPrev    = new Date(year, month, 0).getDate();
  const today         = new Date();
  let html = '';

  // Prev-month filler
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-day other-m"><div class="day-n">${daysInPrev - i}</div></div>`;
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday   = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    const isSel     = calState.selectedDay === day;
    const k         = `${year}-${month}-${day}`;
    const dayEvs    = map[k] || [];

    const dots = dayEvs.slice(0, 3).map(e =>
      `<div class="day-ev${e.is_global_holiday ? ' holiday' : ''}">${e.title}</div>`
    ).join('');

    html += `
      <div class="cal-day${isToday ? ' today' : ''}${isSel ? ' selected' : ''}" onclick="selectDay(${day})">
        <div class="day-n">${day}</div>
        <div class="day-events">${dots}</div>
      </div>`;
  }

  // Next-month filler
  const rem = 7 - (((firstDay + daysInMonth) % 7) || 7);
  if (rem < 7) for (let d = 1; d <= rem; d++)
    html += `<div class="cal-day other-m"><div class="day-n">${d}</div></div>`;

  _el('calGrid').innerHTML = html;
}

function selectDay(day) {
  calState.selectedDay = day;
  const evs = _getEventsForRole();
  _renderGrid(evs);

  const { year, month } = calState;
  const dayEvs = evs.filter(e => {
    const d = new Date(e.start_time);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  const dateStr = new Date(year, month, day).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  _el('selDayTitle').textContent = dateStr;

  const c = _el('selDayEvs');
  if (!dayEvs.length) {
    c.innerHTML = `<p style="padding:14px;font-size:13px;color:var(--text-3);">No events on this day.</p>`;
    return;
  }
  const isAdmin = SESSION.user.role === 'ADMIN';
  c.innerHTML = dayEvs.map(e => {
    const t1 = new Date(e.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const t2 = new Date(e.end_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="ev-item">
        <div class="ev-dot${e.is_global_holiday ? ' holiday' : ''}"></div>
        <div style="flex:1;">
          <div class="ev-title">${e.title}</div>
          <div class="ev-time">${t1} – ${t2}</div>
          ${e.description ? `<div style="font-size:12.5px;color:var(--text-3);margin-top:3px;">${e.description}</div>` : ''}
          <div style="margin-top:5px;display:flex;gap:5px;flex-wrap:wrap;">
            ${e.is_global_holiday ? '<span class="badge badge-err">Holiday</span>' : ''}
            ${e.is_org_wide && !e.is_global_holiday ? '<span class="badge badge-info">Org-wide</span>' : ''}
            ${e.assigned_user_id && !e.is_org_wide ? '<span class="badge badge-warn">Personal</span>' : ''}
          </div>
        </div>
        ${isAdmin ? `<button class="btn btn-ghost btn-sm" onclick="deleteEvent(${e.id})" title="Delete event" style="color:var(--err);"><i class="bi bi-trash"></i></button>` : ''}
      </div>`;
  }).join('');
}

function _renderUpcoming(evs) {
  const now = new Date();
  const upcoming = evs
    .filter(e => new Date(e.start_time) >= now)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 8);

  const c = _el('upcomingList');
  if (!upcoming.length) {
    c.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px;">No upcoming events.</div>`;
    return;
  }

  c.innerHTML = upcoming.map(e => {
    const dt  = new Date(e.start_time);
    const tm  = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const col = e.is_global_holiday ? 'var(--err)' : 'var(--primary)';
    const bg  = e.is_global_holiday ? 'var(--err-bg)' : 'var(--primary-subtle)';
    return `
      <div class="ev-item">
        <div style="width:40px;height:40px;border-radius:8px;background:${bg};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="font-size:13px;font-weight:700;color:${col};line-height:1;">${dt.getDate()}</div>
          <div style="font-size:10px;color:${col};">${dt.toLocaleDateString('en-IN',{month:'short'})}</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div class="ev-title" style="font-size:13px;">${e.title}</div>
          <div class="ev-time">${tm}</div>
        </div>
      </div>`;
  }).join('');
}

function prevMonth() {
  calState.month--; if (calState.month < 0) { calState.month = 11; calState.year--; }
  calState.selectedDay = null; renderCalendar();
}
function nextMonth() {
  calState.month++; if (calState.month > 11) { calState.month = 0; calState.year++; }
  calState.selectedDay = null; renderCalendar();
}

function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  DB.events.delete(id);
  toast('Event deleted.', 'ok');
  renderCalendar();
}

/* Create Event Modal */
function openCreateEvent() {
  const emps = DB.users.getActiveByNgo(SESSION.ngo.id).filter(u => u.role === 'EMPLOYEE');
  _el('evAssign').innerHTML =
    `<option value="">Org-wide (all employees)</option>` +
    emps.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
  _el('createEvModal').classList.remove('hidden');
}
function closeCreateEvent() {
  _el('createEvModal').classList.add('hidden');
  _el('createEvForm').reset();
}
function submitCreateEvent() {
  const title = _val('evTitle'), desc = _val('evDesc');
  const st = _val('evStart'), et = _val('evEnd');
  const isHol = _el('evHoliday').checked;
  const assign = _val('evAssign');

  if (!title || !st || !et) { toast('Fill in title and both date/time fields.', 'err'); return; }
  if (new Date(st) >= new Date(et)) { toast('End time must be after start time.', 'err'); return; }

  DB.events.create({
    ngo_id: SESSION.ngo.id,
    title, description: desc,
    start_time: new Date(st).toISOString(),
    end_time:   new Date(et).toISOString(),
    is_global_holiday: isHol,
    is_org_wide: !assign,
    assigned_user_id: assign ? parseInt(assign) : null,
    created_by_user_id: SESSION.user.id,
  });

  closeCreateEvent();
  toast('Event created! 🗓', 'ok');
  renderCalendar();
}

/* ──────────────────────────────────────────────────────────
   ADMIN: ANNOUNCEMENTS
   ────────────────────────────────────────────────────────── */
function renderAnnouncements() {
  const posts = DB.news.getByNgo(SESSION.ngo.id);
  const c = _el('annCnt');

  const form = `
    <div class="card" style="margin-bottom:var(--s7);">
      <div class="card-header"><h3 class="card-title"><i class="bi bi-megaphone"></i> New Announcement</h3></div>
      <div class="form-group">
        <label for="annTitle">Title *</label>
        <input type="text" id="annTitle" placeholder="Announcement headline">
      </div>
      <div class="form-group" style="margin-bottom:var(--s6);">
        <label for="annContent">Content *</label>
        <textarea id="annContent" placeholder="Write your update…" style="min-height:100px;"></textarea>
      </div>
      <button class="btn btn-primary" onclick="submitAnnouncement()">
        <i class="bi bi-megaphone"></i> Post Announcement
      </button>
    </div>`;

  const list = posts.length
    ? posts.map(p => `
        <div class="news-card">
          <div class="news-meta">
            <i class="bi bi-megaphone"></i>
            ${_fmtDateLong(p.created_at)}
            <button class="btn btn-ghost btn-sm" style="margin-left:auto;color:var(--err);" onclick="deleteAnnouncement(${p.id})">
              <i class="bi bi-trash"></i>
            </button>
          </div>
          <h3 style="font-size:1rem;">${p.title}</h3>
          <p>${p.content}</p>
        </div>`).join('')
    : _empty('📢', 'No announcements yet', 'Post your first one above.');

  c.innerHTML = form + list;
}

function submitAnnouncement() {
  const title   = _val('annTitle');
  const content = _val('annContent');
  if (!title || !content) { toast('Please fill in both title and content.', 'err'); return; }

  DB.news.create({ ngo_id: SESSION.ngo.id, admin_id: SESSION.user.id, title, content });
  toast('Announcement posted! 📢', 'ok');
  renderAnnouncements();
}

function deleteAnnouncement(id) {
  if (!confirm('Delete this announcement?')) return;
  DB.news.delete(id);
  toast('Announcement deleted.', 'ok');
  renderAnnouncements();
}

/* ──────────────────────────────────────────────────────────
   ADMIN: MEETING REQUESTS
   ────────────────────────────────────────────────────────── */
function renderAdminMeetings() {
  const reqs = DB.meetings.getByNgo(SESSION.ngo.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const c = _el('adminMtgCnt');

  if (!reqs.length) {
    c.innerHTML = _empty('🗓', 'No meeting requests', 'Your team members haven\'t submitted any requests yet.');
    return;
  }

  c.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Employee</th><th>Subject</th><th>Requested Date</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${reqs.map(r => {
            const emp = DB.users.getById(r.employee_id);
            return `
              <tr>
                <td style="display:flex;align-items:center;gap:8px;">${_avatar(emp ? emp.name : '?')} <span>${emp ? emp.name : 'Unknown'}</span></td>
                <td>
                  <div style="font-weight:600;font-size:13.5px;">${r.subject}</div>
                  ${r.message ? `<div style="font-size:12px;color:var(--text-3);">${r.message.slice(0,55)}${r.message.length>55?'…':''}</div>` : ''}
                </td>
                <td>${_fmtDateTime(r.requested_date)}</td>
                <td>${_fmtDate(r.created_at)}</td>
                <td>${_badge(r.status)}</td>
                <td>
                  ${r.status === 'PENDING'   ? `<div style="display:flex;gap:5px;">
                    <button class="btn btn-success btn-sm" onclick="updateMeeting(${r.id},'ACCEPTED')"><i class="bi bi-check-lg"></i> Accept</button>
                    <button class="btn btn-danger btn-sm"  onclick="updateMeeting(${r.id},'DECLINED')"><i class="bi bi-x-lg"></i> Decline</button></div>` : ''}
                  ${r.status === 'ACCEPTED'  ? `<button class="btn btn-outline btn-sm" onclick="updateMeeting(${r.id},'COMPLETED')"><i class="bi bi-check-circle"></i> Complete</button>` : ''}
                  ${r.status === 'DECLINED' || r.status === 'COMPLETED' ? '<span style="font-size:12px;color:var(--text-3);">—</span>' : ''}
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function updateMeeting(id, status) {
  DB.meetings.update(id, { status });
  const msgs = { ACCEPTED: 'Meeting accepted ✅', DECLINED: 'Meeting declined.', COMPLETED: 'Marked as completed ✔️' };
  toast(msgs[status], status === 'DECLINED' ? 'err' : 'ok');
  renderAdminMeetings();
}

/* ──────────────────────────────────────────────────────────
   EMPLOYEE: REQUEST MEETING
   ────────────────────────────────────────────────────────── */
function renderReqMeeting() {
  const admins = DB.users.getByNgo(SESSION.ngo.id).filter(u => u.role === 'ADMIN' && u.status === 'ACTIVE');
  _el('reqMtgCnt').innerHTML = `
    <div class="card" style="max-width:580px;">
      <div class="card-header"><h3 class="card-title">Request a 1-on-1 Meeting</h3></div>
      <div id="reqErr" class="alert alert-err hidden" style="margin-bottom:14px;"></div>
      <div id="reqOk"  class="alert alert-ok  hidden" style="margin-bottom:14px;"></div>
      <div class="form-group">
        <label>Meeting With</label>
        <select id="reqAdmin">
          ${admins.map(a => `<option value="${a.id}">${a.name} — Admin</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="reqSubject">Subject *</label>
        <input type="text" id="reqSubject" placeholder="Brief subject of the meeting">
      </div>
      <div class="form-group">
        <label for="reqDate">Preferred Date & Time *</label>
        <input type="datetime-local" id="reqDate" min="${new Date().toISOString().slice(0,16)}">
      </div>
      <div class="form-group" style="margin-bottom:var(--s7);">
        <label for="reqMsg">Additional Notes</label>
        <textarea id="reqMsg" placeholder="Any additional context or agenda items…"></textarea>
      </div>
      <button class="btn btn-primary" onclick="submitReqMeeting()">
        <i class="bi bi-calendar-plus"></i> Submit Request
      </button>
    </div>`;
}

function submitReqMeeting() {
  const adminId = parseInt(_val('reqAdmin'));
  const subject = _val('reqSubject');
  const date    = _val('reqDate');
  const message = _val('reqMsg');

  _el('reqErr').classList.add('hidden');
  _el('reqOk').classList.add('hidden');

  if (!subject || !date) {
    _el('reqErr').innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Please fill in subject and date.';
    _el('reqErr').classList.remove('hidden'); return;
  }
  if (new Date(date) < new Date()) {
    _el('reqErr').innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Please select a future date/time.';
    _el('reqErr').classList.remove('hidden'); return;
  }

  DB.meetings.create({
    ngo_id: SESSION.ngo.id,
    employee_id: SESSION.user.id,
    admin_id: adminId,
    subject, message,
    requested_date: new Date(date).toISOString(),
  });

  _el('reqOk').innerHTML = '<i class="bi bi-check-circle-fill"></i> Your request has been submitted. The admin will respond shortly.';
  _el('reqOk').classList.remove('hidden');
  _el('reqSubject').value = '';
  _el('reqDate').value    = '';
  _el('reqMsg').value     = '';
  toast('Meeting request submitted! 🎉', 'ok');
}

/* ──────────────────────────────────────────────────────────
   EMPLOYEE: NEWS FEED
   ────────────────────────────────────────────────────────── */
function renderNewsFeed() {
  const posts = DB.news.getByNgo(SESSION.ngo.id);
  const c = _el('newsFeedCnt');
  if (!posts.length) {
    c.innerHTML = _empty('📰', 'No announcements yet', 'Check back later for updates from your organisation.');
    return;
  }
  c.innerHTML = `<div style="max-width:700px;">` + posts.map(p => `
    <div class="news-card">
      <div class="news-meta"><i class="bi bi-megaphone"></i> ${_fmtDateLong(p.created_at)}</div>
      <h3 style="font-size:1rem;">${p.title}</h3>
      <p>${p.content}</p>
    </div>`).join('') + `</div>`;
}

/* ──────────────────────────────────────────────────────────
   EMPLOYEE: MY MEETINGS
   ────────────────────────────────────────────────────────── */
function renderMyMeetings() {
  const mine = DB.meetings.getByEmployee(SESSION.user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const c = _el('myMtgCnt');

  if (!mine.length) {
    c.innerHTML = _empty('🗓', 'No requests yet', 'Go to <strong>Request Meeting</strong> to schedule a 1-on-1 with your admin.');
    return;
  }

  c.innerHTML = `
    <div class="table-wrap" style="max-width:900px;">
      <table>
        <thead><tr><th>Subject</th><th>Requested Date</th><th>Submitted</th><th>Status</th></tr></thead>
        <tbody>
          ${mine.map(r => `
            <tr>
              <td>
                <div style="font-weight:600;">${r.subject}</div>
                ${r.message ? `<div style="font-size:12px;color:var(--text-3);">${r.message.slice(0,60)}${r.message.length>60?'…':''}</div>` : ''}
              </td>
              <td>${_fmtDateTime(r.requested_date)}</td>
              <td>${_fmtDate(r.created_at)}</td>
              <td>${_badge(r.status)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/* ──────────────────────────────────────────────────────────
   UTILITIES
   ────────────────────────────────────────────────────────── */
function _el(id)  { return document.getElementById(id); }
function _val(id) { return _el(id) ? _el(id).value.trim() : ''; }

function _avatar(name, bg = 'var(--primary-subtle)', color = 'var(--primary)') {
  return `<div style="width:30px;height:30px;border-radius:50%;background:${bg};color:${color};display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${name.charAt(0).toUpperCase()}</div>`;
}

function _badge(status) {
  const map = {
    PENDING:         '<span class="badge badge-warn">Pending</span>',
    ACCEPTED:        '<span class="badge badge-ok">Accepted</span>',
    DECLINED:        '<span class="badge badge-err">Declined</span>',
    COMPLETED:       '<span class="badge badge-info">Completed</span>',
    PENDING_APPROVAL:'<span class="badge badge-warn">Awaiting Approval</span>',
    ACTIVE:          '<span class="badge badge-ok">Active</span>',
    REJECTED:        '<span class="badge badge-err">Rejected</span>',
  };
  return map[status] || `<span class="badge badge-muted">${status}</span>`;
}

function _empty(icon, title, msg) {
  return `<div class="empty"><div class="empty-icon">${icon}</div><h3>${title}</h3><p>${msg}</p></div>`;
}

function _fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function _fmtDateLong(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function _fmtDateTime(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function _refreshBadge() {
  const p = DB.users.getPendingByNgo(SESSION.ngo.id);
  const b = _el('pendBadge');
  if (b) { b.textContent = p.length; b.classList.toggle('hidden', p.length === 0); }
}

function toast(msg, type = 'ok') {
  const c = _el('toasts');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `${type === 'ok' ? '✅' : '❌'} ${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function logout()            { Auth.logout(); }
function toggleSidebar()     { document.getElementById('sidebar').classList.toggle('open'); }
