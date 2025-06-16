const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const app = express();
const PORT = 8001;
const IP_ADDRESS = '10.10.50.109';

// MySQL Pool
const pool = mysql.createPool({
  host: '10.10.50.108',
  user: 'user_reporting',
  password: 'voxtron',
  database: 'reporting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection
pool.getConnection()
  .then(conn => {
    console.log('Connected to MySQL database');
    conn.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: 'votre_secret_très_fort_en_prod',
  resave: false,
  saveUninitialized: false,
}));

// Sanitize input helper
function sanitizeInput(input) {
  return input === undefined || input === '' ? null : input;
}

// Common styles
const commonStyles = `
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600&family=Playfair+Display:wght@500&display=swap" rel="stylesheet" />
  <style>
    :root {
      --primary: #5c3d99; 
      --secondary: #ff6f91;
      --accent: #ffa600;
      --light: #fafafa;
      --dark: #222222;
      --gray: #666666;
      --border: #ddd;
      --shadow: rgba(0, 0, 0, 0.1);
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Montserrat', sans-serif;
      background-color: var(--light);
      color: var(--dark);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: white;
      box-shadow: 0 2px 5px var(--shadow);
      padding: 1rem 2rem;
      position: fixed;
      width: 100%;
      top: 0;
      z-index: 1000;
    }
    header .container {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    header .logo {
      font-family: 'Playfair Display', serif;
      font-size: 1.9rem;
      font-weight: 600;
      color: var(--primary);
      letter-spacing: -0.5px;
    }
    header nav ul {
      list-style: none;
      display: flex;
      gap: 1.8rem;
    }
    header nav ul li a {
      color: var(--dark);
      text-decoration: none;
      font-weight: 600;
      padding: 0.3rem 0;
      border-bottom: 2px solid transparent;
      transition: all 0.3s ease;
    }
    header nav ul li a:hover {
      color: var(--primary);
      border-bottom: 2px solid var(--primary);
    }
    main {
      flex-grow: 1;
      max-width: 450px;
      margin: 100px auto 2rem;
      padding: 0 1rem;
    }
    h1, h2 {
      font-family: 'Playfair Display', serif;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    p {
      color: var(--gray);
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    form {
      display: flex;
      flex-direction: column;
    }
    input, select {
      padding: 12px 15px;
      margin-bottom: 18px;
      border: 1.8px solid var(--border);
      border-radius: 12px;
      font-size: 1rem;
      transition: all 0.25s ease;
    }
    input:focus, select:focus {
      border-color: var(--primary);
      outline: none;
      box-shadow: 0 0 6px var(--primary);
    }
    button.btn, a.btn {
      display: block;
      text-align: center;
      text-decoration: none;
      padding: 14px 0;
      border-radius: 14px;
      font-weight: 700;
      font-size: 1.1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    button.btn {
      background-color: var(--primary);
      color: white;
      border: none;
      box-shadow: 0 4px 10px var(--shadow);
    }
    button.btn:hover {
      background-color: #432c75;
    }
    a.btn {
      background-color: var(--secondary);
      color: white;
      margin-top: 1rem;
      box-shadow: 0 3px 7px rgba(255, 111, 145, 0.4);
    }
    a.btn:hover {
      background-color: #d65174;
    }
    #message {
      font-weight: 600;
      margin-bottom: 1rem;
      min-height: 1.3em;
    }
    @media (max-width: 480px) {
      main {
        margin: 90px 1rem 2rem;
        max-width: 100%;
      }
      header nav ul {
        gap: 1rem;
      }
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: var(--primary);
      color: white;
    }
  </style>
`;

// Dynamic Header with Role
function getHeaderHTML(req) {
  const user = req.session.user;
  const adminNavItem = user?.role === 'admin'
    ? `<li><a href="http://10.10.50.108/phpmyadmin/db_structure.php?server=1&db=reporting" target="_blank">phpMyAdmin</a></li>`
    : '';
  return `
    <header>
      <div class="container">
        <div class="logo">Call Accounting Hub</div>
        <nav>
          <ul>
            <li><a href="/welcome">Accueil</a></li>
            ${user ? `
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="/menu">Menu</a></li>
              ${adminNavItem}
              <li>
                <form action="/logout" method="POST" style="display:inline;">
                  <button type="submit" style="background:none;border:none;cursor:pointer;font:inherit;color:inherit;padding:0;font-weight:600;">Déconnexion</button>
                </form>
              </li>` : `<li><a href="/login">Connexion</a></li>`
            }
          </ul>
        </nav>
      </div>
    </header>
  `;
}

// Middleware for Admin Access
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/login');
  }
  next();
}

// Routes

app.get('/', (req, res) => res.redirect('/welcome'));

app.get('/welcome', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Accueil - Call Accounting</title>
      ${commonStyles}
      <style>
        body {
          background: linear-gradient(135deg, #5c3d99, #ff6f91);
          background-attachment: fixed;
          color: white;
        }
        main {
          max-width: 500px;
          margin: 120px auto 2rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 15px;
          box-shadow: 0 0 15px rgba(0,0,0,0.3);
          text-align: center;
        }
        main img {
          max-width: 180px;
          margin-bottom: 1rem;
          opacity: 0.7;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(0,0,0,0.4);
        }
        main h1 {
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          font-size: 2.4rem;
          margin-bottom: 0.7rem;
          color: #fff;
          text-shadow: 1px 1px 4px rgba(0,0,0,0.7);
        }
        main p {
          font-size: 1.2rem;
          color: #eee;
          margin-bottom: 2rem;
        }
        a.btn {
          font-size: 1.1rem;
        }
      </style>
    </head>
    <body>
      ${getHeaderHTML(req)}
      <main>
        <img src="chahbi.jpg" alt="Chahbi Logo" />
        <h1>Bienvenue sur Call Accounting Hub</h1>
        ${req.session.user ? `
          <a href="/dashboard" class="btn" style="margin-bottom: 1rem;">📊 Tableau de bord</a>
        ` : `
          <a href="/login" class="btn">🔐 Se connecter</a>
        `}
      </main>
    </body>
    </html>
  `);
});

app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>Connexion - Call Accounting</title>
      ${commonStyles}
      <style>
        body {
          background: linear-gradient(135deg, #5c3d99, #ff6f91);
          background-attachment: fixed;
          color: white;
        }
        main {
          max-width: 500px;
          margin: 120px auto 2rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 15px;
          box-shadow: 0 0 15px rgba(0,0,0,0.3);
        }
        h1 {
          text-align: center;
          color: #fff;
          margin-bottom: 1rem;
        }
        #message {
          text-align: center;
          color: #ffaaaa;
          font-weight: 600;
          min-height: 1.3em;
          margin-bottom: 1rem;
        }
      </style>
    </head>
    <body>
      ${getHeaderHTML(req)}
      <main>
        <h1>Connexion Admin</h1>
        <p id="message"></p>
        <form id="loginForm">
          <input name="identifiant" type="text" placeholder="Identifiant" required />
          <input name="mot_de_passe" type="password" placeholder="Mot de passe" required />
          <button class="btn" type="submit">Se connecter</button>
        </form>
        <p style="text-align:center; margin-top:1rem; color: #ffaaaa;">
          Accès réservé aux administrateurs
        </p>
      </main>
      <script>
        const form = document.getElementById('loginForm');
        const message = document.getElementById('message');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          message.textContent = '';
          const data = {
            identifiant: form.identifiant.value.trim(),
            mot_de_passe: form.mot_de_passe.value
          };
          try {
            const res = await fetch('/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            const json = await res.json();
            if (res.ok) {
              message.style.color = '#aaffaa';
              message.textContent = json.message;
              setTimeout(() => window.location.href = '/dashboard', 1500);
            } else {
              message.style.color = '#ffaaaa';
              message.textContent = json.error || 'Erreur inconnue';
            }
          } catch (err) {
            message.style.color = '#ffaaaa';
            message.textContent = 'Erreur réseau';
          }
        });
      </script>
    </body>
    </html>
  `);
});

app.post('/login', async (req, res) => {
  const { identifiant, mot_de_passe } = req.body;
  try {
    const [rows] = await pool.execute('SELECT * FROM utilisateurs WHERE identifiant = ?', [identifiant]);
    const user = rows[0];
    if (user && await bcrypt.compare(mot_de_passe, user.mot_de_passe)) {
      if (user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Accès réservé aux administrateurs' 
        });
      }
      delete user.mot_de_passe;
      req.session.user = user;
      return res.json({ success: true, message: 'Connexion réussie' });
    }
    return res.status(401).json({ success: false, error: 'Identifiants invalides' });
  } catch (e) {
    console.error('Erreur lors de la connexion :', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/dashboard', requireAdmin, (req, res) => {
  const user = req.session.user;
  res.send(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Dashboard</title>
    ${commonStyles}</head><body>${getHeaderHTML(req)}
    <main><h1>Bienvenue ${user.nom} (${user.role})</h1></main></body></html>
  `);
});

app.get('/menu', requireAdmin, (req, res) => {
  res.send(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Menu</title>
    ${commonStyles}</head><body>${getHeaderHTML(req)}
    <main>
      <h1>Menu Principal</h1>
      <div class="menu-buttons">
        <a href="/ajouter-pbx" class="btn">Ajouter PBX</a>
        <a href="/autre-fonctionnalite" class="btn">Autre fonction</a>
      </div>
    </main></body></html>
  `);
});

app.get('/ajouter-pbx', requireAdmin, (req, res) => {
  res.send(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ajouter un PBX</title>
    ${commonStyles}</head><body>${getHeaderHTML(req)}
    <main>
      <h1>Ajouter un PBX</h1>
      <form action="/ajouter-pbx" method="POST">
        <input type="text" name="nom" placeholder="Nom du PBX" required />
        <input type="text" name="localisation" placeholder="Localisation" />
        <input type="text" name="num_serie" placeholder="Numéro de série" />
        <input type="text" name="version_firmware" placeholder="Version Firmware" />
        <input type="text" name="type" placeholder="Type" />
        <button class="btn" type="submit">Ajouter</button>
      </form>
      <a href="/menu" class="btn">Retour au menu</a>
    </main></body></html>
  `);
});

app.post('/ajouter-pbx', requireAdmin, async (req, res) => {
  try {
    const { nom, localisation, num_serie, version_firewere, type } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).send(`
        <h3>Le champ "Nom du PBX" est obligatoire.</h3>
        <a href="/ajouter-pbx" class="btn">Réessayer</a>
      `);
    }

    const params = [
      nom,
      sanitizeInput(localisation),
      sanitizeInput(num_serie),
      sanitizeInput(version_firewere),
      sanitizeInput(type)
    ];

    await pool.execute(
      'INSERT INTO pbx (nom, localisation, num_serie, version_firewere, type) VALUES (?, ?, ?, ?, ?)',
      params
    );

    // Redirection avec message de succès dans l'URL
    res.redirect('/liste-pbx?success=1');

  } catch (e) {
    console.error('Erreur lors de l\'ajout du PBX:', e.message);
    res.status(500).send(`
      <h3>Erreur serveur lors de l'ajout du PBX</h3>
      <p>Voir les logs côté serveur pour plus d'informations.</p>
      <a href="/ajouter-pbx" class="btn">Réessayer</a>
    `);
  }
});

app.get('/liste-pbx', async (req, res) => {
  const successMessage = req.query.success ? `
    <div id="message" style="color:green; margin-bottom:1rem; font-weight:bold;">
      ✅ PBX ajouté avec succès !
    </div>
  ` : '';

  try {
    const [results] = await pool.query('SELECT DISTINCT pbx FROM CDR ORDER BY pbx');
    const pbxOptions = results.map(r => `<option value="${r.pbx}">${r.pbx}</option>`).join('');
    res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Filtrage des Appels par PBX</title>
        ${commonStyles}
      </head>
      <body>
        ${getHeaderHTML(req)}
        <header>
          <div class="container">
            <div class="logo">Filtrage des Appels</div>
          </div>
        </header>
        <main>
          <h1>Ajouter un PBX</h1>
          ${successMessage}
          <form id="filterForm">
            <div class="form-group">
              <label for="pbx">PBX</label>
              <select id="pbx" name="pbx" required>
                <option value="">Sélectionner un PBX</option>
                ${pbxOptions}
              </select>
            </div>
            <div class="form-group">
              <label for="fromDate">Date de début</label>
              <input type="date" id="fromDate" name="fromDate" required />
            </div>
            <div class="form-group">
              <label for="toDate">Date de fin</label>
              <input type="date" id="toDate" name="toDate" required />
            </div>
            <button type="submit" class="btn">Rechercher</button>
          </form>
        </main>
        <script>
          document.getElementById('filterForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const pbx = document.getElementById('pbx').value;
            const fromDate = document.getElementById('fromDate').value;
            const toDate = document.getElementById('toDate').value;
            try {
              const res = await fetch('/filtrer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pbx, fromDate, toDate })
              });
              const data = await res.json();
              const tbody = document.querySelector('#resultsTable tbody');
              tbody.innerHTML = '';
              if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray);font-style:italic;">Aucun appel trouvé</td></tr>';
                return;
              }
              data.forEach(row => {
                const utc = new Date(row.utc * 1000).toLocaleString();
                const local = new Date(row.local_time * 1000).toLocaleString();
                const tr = document.createElement('tr');
                tr.innerHTML = \`
                  <td>\${row.pbx}</td>
                  <td>\${row.cn}</td>
                  <td>\${row.direction}</td>
                  <td>\${utc}</td>
                  <td>\${local}</td>
                \`;
                tbody.appendChild(tr);
              });
            } catch (error) {
              alert('Erreur réseau ou serveur');
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Erreur lors de la récupération des PBX:', err);
    res.status(500).send('Erreur lors de la récupération des PBX');
  }
});

app.post('/filtrer', async (req, res) => {
  const { pbx, fromDate, toDate } = req.body;
  const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
  const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
  try {
    const [results] = await pool.query(
      'SELECT * FROM CDR WHERE pbx = ? AND utc BETWEEN ? AND ? ORDER BY utc DESC',
      [pbx, fromTimestamp, toTimestamp]
    );
    res.json(results);
  } catch (e) {
    console.error('Erreur lors du filtrage:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/autre-fonctionnalite', requireAdmin, (req, res) => {
  res.send(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Autres Fonctions</title>
    ${commonStyles}</head><body>${getHeaderHTML(req)}
    <main>
      <h1>Autres fonctions</h1>
      <div style="display:flex;flex-direction:column;gap:1rem;">
        <a href="/ajouter-manager" class="btn">Ajouter Manager</a>
        <a href="/liste-pbx" class="btn">Consulter PBX</a>
        <a href="/liste-cdr" class="btn">Consulter CDR</a>
      </div>
      <a href="/menu" class="btn">Retour au menu</a>
    </main></body></html>
  `);
});

app.get('/ajouter-manager', requireAdmin, (req, res) => {
  res.send(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ajouter Manager</title>
    ${commonStyles}</head><body>${getHeaderHTML(req)}
    <main>
      <h1>Ajouter un Manager</h1>
      <form method="POST" action="/ajouter-manager">
        <input name="nom" placeholder="Nom complet" required />
        <input name="identifiant" placeholder="Identifiant" required />
        <input name="mot_de_passe" type="password" placeholder="Mot de passe" required />
        <select name="role" required>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <button class="btn" type="submit">Ajouter</button>
      </form>
      <a href="/autre-fonctionnalite" class="btn">Retour</a>
    </main></body></html>
  `);
});

app.post('/ajouter-manager', requireAdmin, async (req, res) => {
  try {
    const { nom, identifiant, mot_de_passe, role } = req.body;
    const hashedPwd = await bcrypt.hash(mot_de_passe, 10);
    await pool.execute(
      'INSERT INTO utilisateurs (nom, identifiant, mot_de_passe, role) VALUES (?, ?, ?, ?)',
      [nom, identifiant, hashedPwd, role || 'manager']
    );
    res.redirect('/autre-fonctionnalite');
  } catch (e) {
    console.error('Erreur ajout manager:', e);
    res.status(500).send('Erreur serveur lors de l\'ajout du manager');
  }
});

app.get('/liste-cdr', requireAdmin, async (req, res) => {
  const dateDebut = req.query.date_debut || '';
  const dateFin = req.query.date_fin || '';
  let query = 'SELECT id, e164, h323, utc, direction, call_id FROM CDR WHERE 1=1';
  const params = [];

  if (dateDebut && dateFin) {
    const start = Math.floor(new Date(dateDebut + 'T00:00:00Z').getTime() / 1000);
    const end = Math.floor(new Date(dateFin + 'T23:59:59Z').getTime() / 1000);
    query += ' AND utc BETWEEN ? AND ?';
    params.push(start, end);
  }

  query += ' ORDER BY utc DESC LIMIT 100';

  try {
    const [calls] = await pool.query(query, params);

    const rows = calls.map(call => `
      <tr>
        <td>${call.id || ''}</td>
        <td>${call.e164 || ''}</td>
        <td>${call.h323 || ''}</td>
        <td>${new Date(call.utc * 1000).toLocaleString()}</td>
        <td>${call.direction || ''}</td>
        <td>${call.call_id || ''}</td>
        <td><button onclick="masquerLigne(this)">Masquer</button></td>
      </tr>
    `).join('');

    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Historique des Appels - CDR</title>
  <style>
    :root {
      --primary: #5c3d99;
      --secondary: #ff6f91;
      --accent: #ffa600;
      --light: #fafafa;
      --dark: #222222;
      --gray: #666666;
      --border: #ddd;
      --shadow: rgba(0, 0, 0, 0.1);
    }
    body {
      font-family: 'Montserrat', sans-serif;
      background: var(--light);
      color: var(--dark);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 2rem 1rem;
      max-width: 900px;
      margin: 0 auto;
    }
    h1 {
      font-family: 'Playfair Display', serif;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2rem;
      background: white;
      box-shadow: 0 2px 5px var(--shadow);
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      text-align: left;
      padding: 12px 15px;
      border-bottom: 1.5px solid var(--border);
    }
    th {
      background-color: var(--primary);
      color: white;
    }
    tr:hover {
      background-color: var(--accent);
      color: white;
    }
    form {
      background: white;
      padding: 1.5rem 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px var(--shadow);
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: flex-end;
      margin-bottom: 1.5rem;
    }
    label {
      font-weight: 600;
      margin-bottom: 0.5rem;
      display: block;
      color: var(--primary);
    }
    input[type="date"] {
      padding: 12px 15px;
      border: 1.8px solid var(--border);
      border-radius: 12px;
      font-size: 1rem;
      width: 100%;
    }
    input[type="date"]:focus {
      border-color: var(--primary);
      outline: none;
      box-shadow: 0 0 6px var(--primary);
    }
    button {
      background-color: var(--primary);
      color: white;
      font-weight: 700;
      font-size: 0.65rem;
      padding: 14px 0;
      border-radius: 14px;
      cursor: pointer;
      width: 150px;
      box-shadow: 0 4px 10px var(--shadow);
      transition: background-color 0.3s ease;
    }
    button:hover {
      background-color: #432c75;
    }
    @media (max-width: 600px) {
      form {
        flex-direction: column;
      }
      button {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  ${getHeaderHTML(req)}
  <h1>Historique des Appels (table CDR)</h1>
  <form method="get">
    <div>
      <label>Date début:</label>
      <input type="date" name="date_debut" value="${dateDebut}">
    </div>
    <div>
      <label>Date fin:</label>
      <input type="date" name="date_fin" value="${dateFin}">
    </div>
    <div><button type="submit">Filtrer</button></div>
    <div><button type="button" onclick="window.location.href='/liste-cdr'">Réinitialiser</button></div>
  </form>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>E164</th>
        <th>H323</th>
        <th>Date UTC</th>
        <th>Direction</th>
        <th>Call ID</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <script>
    function masquerLigne(button) {
      const row = button.closest('tr');
      if (row) row.style.display = 'none';
    }
  </script>
</body>
</html>
`);
  } catch (err) {
    console.error('Erreur lors de la récupération des appels:', err);
    res.status(500).send('Erreur serveur lors du chargement des appels');
  }
});

app.listen(PORT, IP_ADDRESS, () => {
  console.log(`Server running at http://${IP_ADDRESS}:${PORT}/`);
});