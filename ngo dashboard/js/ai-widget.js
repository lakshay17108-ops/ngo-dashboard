/* ============================================================
   js/ai-widget.js — Floating AI Assistant Widget
   Rule-based responses about holidays, meetings, directory
   ============================================================ */

const AIWidget = {
  open: false,

  init() {
    this._buildDOM();
    this._addMsg('bot', '👋 Hi! I\'m your NGO assistant.\n\nI can help with:\n• Upcoming holidays & events\n• How to book a meeting\n• Finding NGO contacts\n• Platform navigation\n\nWhat would you like to know?');
  },

  _buildDOM() {
    // Trigger button
    const btn = document.createElement('button');
    btn.className = 'ai-trigger';
    btn.id = 'aiTrigger';
    btn.title = 'NGO Assistant';
    btn.innerHTML = '<i class="bi bi-robot"></i>';
    btn.onclick = () => this.toggle();

    // Panel
    const panel = document.createElement('div');
    panel.className = 'ai-panel hidden';
    panel.id = 'aiPanel';
    panel.innerHTML = `
      <div class="ai-ph">
        <h3><i class="bi bi-robot"></i> NGO Assistant</h3>
        <button class="ai-close-btn" onclick="AIWidget.close()">✕</button>
      </div>
      <div class="ai-msgs" id="aiMsgs"></div>
      <div class="ai-chips" id="aiChips">
        <button class="ai-chip" onclick="AIWidget.ask('upcoming holidays')">📅 Holidays</button>
        <button class="ai-chip" onclick="AIWidget.ask('how to book a meeting')">🗓 Book Meeting</button>
        <button class="ai-chip" onclick="AIWidget.ask('NGO directory')">🔍 Directory</button>
        <button class="ai-chip" onclick="AIWidget.ask('help')">❓ Help</button>
      </div>
      <div class="ai-input-row">
        <input class="ai-inp" id="aiInp" placeholder="Ask me anything…"
               onkeydown="if(event.key==='Enter') AIWidget.send()">
        <button class="ai-send" onclick="AIWidget.send()">
          <i class="bi bi-send-fill"></i>
        </button>
      </div>`;

    document.body.appendChild(btn);
    document.body.appendChild(panel);
  },

  toggle() { this.open ? this.close() : this._open(); },

  _open() {
    this.open = true;
    document.getElementById('aiPanel').classList.remove('hidden');
    document.getElementById('aiTrigger').innerHTML = '<i class="bi bi-x-lg"></i>';
    setTimeout(() => document.getElementById('aiInp').focus(), 100);
  },

  close() {
    this.open = false;
    document.getElementById('aiPanel').classList.add('hidden');
    document.getElementById('aiTrigger').innerHTML = '<i class="bi bi-robot"></i>';
  },

  _addMsg(type, text) {
    const c = document.getElementById('aiMsgs');
    if (!c) return;
    const el = document.createElement('div');
    el.className = `ai-msg ${type}`;
    el.textContent = text;
    c.appendChild(el);
    c.scrollTop = c.scrollHeight;
  },

  send() {
    const inp = document.getElementById('aiInp');
    const txt = inp.value.trim();
    if (!txt) return;
    this._addMsg('user', txt);
    inp.value = '';
    setTimeout(() => this._addMsg('bot', this._respond(txt.toLowerCase())), 380);
  },

  ask(topic) {
    this._open();
    this._addMsg('user', topic);
    setTimeout(() => this._addMsg('bot', this._respond(topic.toLowerCase())), 320);
  },

  _respond(t) {
    const s = (typeof Auth !== 'undefined') ? Auth.getCurrentUser() : null;

    /* Holidays */
    if (/holida|vacation|day.off/.test(t)) {
      if (s) {
        const evs = DB.events.getByNgo(s.ngo.id)
          .filter(e => e.is_global_holiday)
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        if (!evs.length) return 'No holidays have been added yet. Your admin can add them through the Calendar section.';
        const list = evs.slice(0, 6).map(e => {
          const d = new Date(e.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
          return `• ${e.title} — ${d}`;
        }).join('\n');
        return `📅 Holidays for ${s.ngo.name}:\n\n${list}`;
      }
      return '📅 Public holidays like Republic Day (Jan 26), Independence Day (Aug 15), and Gandhi Jayanti (Oct 2) are marked in your organisation calendar. Sign in to see your NGO\'s specific holidays.';
    }

    /* Meeting booking */
    if (/meeting|book|appointment|schedule|1.on.1/.test(t)) {
      if (s && s.user.role === 'EMPLOYEE') {
        return '🗓 To book a 1-on-1 meeting with your admin:\n\n1. Go to "Request Meeting" in the sidebar\n2. Select a subject and preferred date/time\n3. Add an optional message\n4. Click "Submit Request"\n\nYour admin will Accept, Decline, or mark it Completed.';
      }
      if (s && s.user.role === 'ADMIN') {
        return '🗓 As Admin, view all meeting requests from your team under "Meeting Requests" in the sidebar. You can Accept, Decline, or mark them Completed.';
      }
      return '🗓 Employees can request 1-on-1 meetings with their admin through the "Request Meeting" section after logging in.';
    }

    /* Directory */
    if (/director|find.ngo|contact|other.org/.test(t)) {
      return '🔍 The Public NGO Directory is available without login!\n\nVisit directory.html to:\n• Search organisations by name or city\n• View contact details and addresses\n• Instantly create a Google Meet with any NGO\n\nYou can also click "NGO Directory" in the sidebar.';
    }

    /* Calendar/events */
    if (/calendar|event|schedule|upcoming/.test(t)) {
      return '📆 The Calendar shows:\n\n• 🔴 Global holidays (national/office closures)\n• 🔵 Org-wide events (visible to all)\n• 🟡 Personal assignments (only to you)\n\nAdmins can create events and assign them to specific employees using the "Create Event" button.';
    }

    /* Approvals */
    if (/approv|pending|join.request/.test(t)) {
      if (s && s.user.role === 'ADMIN') {
        const p = DB.users.getPendingByNgo(s.ngo.id);
        return `📋 You have ${p.length} pending approval request(s).\n\nNavigate to "Pending Approvals" in the sidebar to review and approve or reject them.`;
      }
      return 'When an employee registers with your NGO code, they\'re placed in Pending Approval until the admin reviews their request.';
    }

    /* Announcements/news */
    if (/news|announc|update|post/.test(t)) {
      return '📢 Announcements are posted by your admin and visible to all active employees in the "News Feed" section.\n\nAdmins can post new announcements from the "Announcements" section.';
    }

    /* Org code */
    if (/code|unique.code|org.code/.test(t)) {
      if (s && s.user.role === 'ADMIN') {
        return `🔑 Your organisation code is: ${s.ngo.unique_code}\n\nShare this with new volunteers/employees so they can join your NGO. They'll use it on the "Join NGO" tab on the login page.`;
      }
      return '🔑 Your NGO code appears on the Team Members page (admin only) and was shown when your organisation was first registered.';
    }

    /* Greetings */
    if (/^(hi|hello|hey|good\s)/.test(t)) {
      const name = s ? `, ${s.user.name.split(' ')[0]}` : '';
      return `Hello${name}! 👋 How can I help you today?\n\nTry asking about holidays, booking a meeting, the NGO directory, or type "help" for a full list.`;
    }

    /* Help */
    if (/help|what.can|topics/.test(t)) {
      return '🤖 I can help you with:\n\n📅 "holidays" — list your organisation\'s holidays\n🗓 "book a meeting" — how to request a 1-on-1\n🔍 "NGO directory" — find and contact other NGOs\n📆 "calendar" — understand your events\n📢 "announcements" — latest org news\n🔑 "org code" — your unique join code\n\nJust type your question!';
    }

    /* Default */
    return 'I\'m not sure about that. Try asking about:\n• "holidays"\n• "book a meeting"\n• "NGO directory"\n• "help"';
  },
};
