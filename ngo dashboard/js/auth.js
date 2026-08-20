/* ============================================================
   js/auth.js — Authentication & Session Logic
   ============================================================ */

const Auth = {

  /* Register a new NGO + creates the ADMIN user ─────────── */
  registerNGO(d) {
    if (DB.users.getByEmail(d.email)) {
      throw new Error('An account with this email already exists.');
    }

    // Ensure unique code is unique
    let code;
    do { code = _code(8); } while (DB.ngos.getByCode(code));

    const ngo = DB.ngos.create({
      name:           d.orgName,
      unique_code:    code,
      head_name:      d.name,
      official_email: d.email,
      phone:          d.phone      || '',
      address_line:   d.address    || '',
      city:           d.city       || '',
      state:          d.state      || '',
      pincode:        d.pincode    || '',
    });

    const user = DB.users.create({
      ngo_id:   ngo.id,
      name:     d.name,
      email:    d.email,
      password: d.password,
      role:     'ADMIN',
      status:   'ACTIVE',
    });

    DB.session.set(user, ngo);
    return { user, ngo };
  },

  /* Register an employee (placed in PENDING_APPROVAL) ───── */
  registerEmployee(d) {
    const ngo = DB.ngos.getByCode(d.ngoCode.toUpperCase().trim());
    if (!ngo) throw new Error('Invalid organisation code. Please double-check and try again.');

    if (DB.users.getByEmail(d.email)) {
      throw new Error('An account with this email already exists.');
    }

    const user = DB.users.create({
      ngo_id:   ngo.id,
      name:     d.name,
      email:    d.email,
      password: d.password,
      role:     'EMPLOYEE',
      status:   'PENDING_APPROVAL',
    });

    DB.session.set(user, ngo);
    return { user, ngo };
  },

  /* Login ─────────────────────────────────────────────────── */
  login(email, password) {
    const user = DB.users.getByEmail(email);
    if (!user) throw new Error('No account found with this email address.');

    const hash = btoa(unescape(encodeURIComponent(password)));
    if (user.password_hash !== hash) throw new Error('Incorrect password. Please try again.');

    if (user.status === 'REJECTED') {
      throw new Error('Your account request was rejected. Contact your organisation administrator.');
    }

    const ngo = DB.ngos.getById(user.ngo_id);
    if (!ngo) throw new Error('Organisation not found. Please contact support.');

    DB.session.set(user, ngo);
    return { user, ngo };
  },

  /* Logout ────────────────────────────────────────────────── */
  logout() {
    DB.session.clear();
    window.location.href = 'index.html';
  },

  /* Get current session ───────────────────────────────────── */
  getCurrentUser() {
    return DB.session.get();
  },

  /* Guard — redirect if not authenticated ─────────────────── */
  requireAuth() {
    const s = DB.session.get();
    if (!s) { window.location.href = 'index.html'; return null; }

    // Refresh from DB (status may have changed)
    const user = DB.users.getById(s.user.id);
    const ngo  = DB.ngos.getById(s.ngo.id);
    if (!user || !ngo) { DB.session.clear(); window.location.href = 'index.html'; return null; }

    DB.session.set(user, ngo);
    return { user, ngo };
  },
};
