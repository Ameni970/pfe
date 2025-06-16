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

// Common Styles
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
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1500);
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
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title></title>
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
        <a href="/users" class="btn">Gestion des Utilisateurs</a>
      </div>
    </main></body></html>
  `);
});

// Gestion des Managers

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
      <a href="/gestion-managers" class="btn">Retour</a>
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
    res.redirect('/gestion-managers');
  } catch (e) {
    console.error('Erreur ajout manager:', e);
    res.status(500).send('Erreur serveur lors de l\'ajout du manager');
  }
});

// Gestion des Utilisateurs
app.get('/users', async (req, res) => {
    const [users] = await db.query('SELECT * FROM utilisateurs');

    const rows = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.nom}</td>
            <td>${user.identifiant}</td>
            <td>${user.role}</td>
            <td>
                <button onclick="showEditForm(${user.id}, '${user.nom}', '${user.identifiant}', '${user.role}')" 
                    class="accent">✏ Modifier</button>
                <form action="/delete/${user.id}" method="POST" style="display:inline;" onsubmit="return confirm('Supprimer cet utilisateur ?')">
                    <button type="submit" class="danger">🗑 Supprimer</button>
                </form>
                
            </td>
        </tr>
    `).join('');

    res.send(`
        ${htmlHead}
        <body>
            ${headerHTML}
            <div class="container">
                <div class="card">
                    <h2>Gestion des utilisateurs</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nom</th>
                                <th>Identifiant</th>
                                <th>Rôle</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>

                <div id="editFormContainer" class="card" style="display:none;">
                    <h3>Modifier utilisateur</h3>
                    <form id="editForm" method="POST">
                        <input type="hidden" name="id" id="editId">
                        <div class="form-group">
                            <label for="editNom">Nom :</label>
                            <input type="text" name="nom" id="editNom" required>
                        </div>
                        <div class="form-group">
                            <label for="editIdentifiant">Identifiant :</label>
                            <input type="text" name="identifiant" id="editIdentifiant" required>
                        </div>
                        <div class="form-group">
                            <label for="editRole">Rôle :</label>
                            <select name="role" id="editRole" required>
                                <option value="admin">Admin</option>
                                <option value="employer">Employer</option>
                            </select>
                        </div>
                        <button type="submit" class="primary">✅ Enregistrer</button>
                        <button type="button" onclick="hideEditForm()" class="secondary" style="margin-left:10px;">Annuler</button>
                    </form>
                </div>
            </div>

            <script>
                function showEditForm(id, nom, identifiant, role) {
                    document.getElementById('editFormContainer').style.display = 'block';
                    document.getElementById('editForm').action = '/update/' + id;
                    document.getElementById('editId').value = id;
                    document.getElementById('editNom').value = nom;
                    document.getElementById('editIdentifiant').value = identifiant;
                    document.getElementById('editRole').value = role;
                    window.scrollTo(0, document.body.scrollHeight);
                }

                function hideEditForm() {
                    document.getElementById('editFormContainer').style.display = 'none';
                }
            </script>
        </body>
        </html>
    `);
});

// Route suppression utilisateur
app.post('/delete/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM utilisateurs WHERE id = ?', [req.params.id]);
    res.redirect('/users');
  } catch (error) {
    console.error('❌ Erreur suppression :', error);
    res.status(500).send('Erreur lors de la suppression.');
  }
});

// Route mise à jour utilisateur
app.post('/update/:id', requireAdmin, async (req, res) => {
  const { nom, identifiant, role } = req.body;
  try {
    await pool.execute(
      'UPDATE utilisateurs SET nom = ?, identifiant = ?, role = ? WHERE id = ?',
      [nom, identifiant, role, req.params.id]
    );
    res.redirect('/users');
  } catch (error) {
    console.error('❌ Erreur mise à jour :', error);
    res.status(500).send('Erreur mise à jour');
  }
});

// Start server
app.listen(PORT, IP_ADDRESS, () => {
  console.log(`Server running at http://${IP_ADDRESS}:${PORT}/`);
});