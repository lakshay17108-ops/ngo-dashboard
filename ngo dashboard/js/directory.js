/* ============================================================
   js/directory.js — Public NGO Directory Logic
   No auth required — runs on directory.html
   ============================================================ */

const Directory = {
  ngos: [],

  init() {
    DB.seed();
    this.ngos = DB.ngos.getAll();
    this._updateStats();
    this._render(this.ngos);

    document.getElementById('dirSearch').addEventListener('input', e => {
      this._search(e.target.value);
    });
  },

  _updateStats() {
    const cities = new Set(this.ngos.map(n => n.city)).size;
    const el1 = document.getElementById('statTotal');
    const el2 = document.getElementById('statCities');
    const el3 = document.getElementById('statShowing');
    if (el1) el1.textContent = this.ngos.length;
    if (el2) el2.textContent = cities;
    if (el3) el3.textContent = this.ngos.length;
  },

  _render(ngos) {
    const el3 = document.getElementById('statShowing');
    if (el3) el3.textContent = ngos.length;

    const c = document.getElementById('ngoGrid');
    if (!ngos.length) {
      c.innerHTML = `
        <div class="empty" style="grid-column:1/-1;">
          <div class="empty-icon">🔍</div>
          <h3>No organisations found</h3>
          <p>Try a different search term.</p>
        </div>`;
      return;
    }

    c.innerHTML = ngos.map(ngo => {
      /* Pre-populated Google Meet creation link as per spec */
      const meetLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Meeting with ' + ngo.name)}&details=${encodeURIComponent('Please confirm agenda with ' + ngo.official_email)}&add=meet`;
      const initial  = ngo.name.charAt(0).toUpperCase();

      return `
        <div class="dir-card">
          <div class="dir-card-hd">
            <div class="dir-avatar">${initial}</div>
            <div>
              <div class="dir-name">${ngo.name}</div>
              <div class="dir-head">Led by ${ngo.head_name}</div>
            </div>
          </div>

          <div class="dir-info">
            <div class="dir-info-row">
              <i class="bi bi-geo-alt-fill"></i>
              <span>${ngo.address_line ? ngo.address_line + ', ' : ''}${ngo.city}, ${ngo.state} — ${ngo.pincode}</span>
            </div>
            <div class="dir-info-row">
              <i class="bi bi-envelope-fill"></i>
              <span>${ngo.official_email}</span>
            </div>
            <div class="dir-info-row">
              <i class="bi bi-telephone-fill"></i>
              <span>${ngo.phone || 'Not available'}</span>
            </div>
          </div>

          <div class="dir-actions">
            <a href="${meetLink}" target="_blank" rel="noopener" class="btn btn-primary btn-sm" style="flex:1;justify-content:center;">
              <i class="bi bi-camera-video-fill"></i> Google Meet
            </a>
            <a href="mailto:${ngo.official_email}" class="btn btn-outline btn-sm" title="Send email">
              <i class="bi bi-envelope"></i>
            </a>
            <a href="tel:${ngo.phone}" class="btn btn-outline btn-sm" title="Call" style="${ngo.phone ? '' : 'pointer-events:none;opacity:.4;'}">
              <i class="bi bi-telephone"></i>
            </a>
          </div>
        </div>`;
    }).join('');
  },

  _search(q) {
    const query = q.trim().toLowerCase();
    if (!query) { this._render(this.ngos); return; }
    const filtered = this.ngos.filter(n =>
      n.name.toLowerCase().includes(query) ||
      n.city.toLowerCase().includes(query) ||
      n.state.toLowerCase().includes(query) ||
      n.head_name.toLowerCase().includes(query) ||
      (n.address_line || '').toLowerCase().includes(query)
    );
    this._render(filtered);
  },
};
