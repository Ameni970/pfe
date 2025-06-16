const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const app = express();

const PORT = 8001;
const IP_ADDRESS = '10.10.50.122';

// Connexion base de données distante
let db;
async function connectDB() {
  try {
    db = await mysql.createConnection({
      host: '10.10.50.108',
      user: 'user_reporting',
      password: 'voxtron',
      database: 'reporting',
    });
    console.log('✅ Connexion à MySQL réussie.');
  } catch (err) {
    console.error('❌ Erreur connexion MySQL :', err);
    process.exit(1);
  }
}

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'votre_secret',
  resave: false,
  saveUninitialized: false,
}));

// Style CSS commun
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
  </style>
`;

// Header HTML avec nav dynamique selon connexion et rôle
function getHeaderHTML(req) {
  const user = req.session.user;
  const adminNavItem = user?.role === 'admin'
    ? `<li><a href="http://10.10.50.108/phpmyadmin/db_structure.php?server=1&db=reporting" target="_blank">phpMyAdmin</a></li>` : '';
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

// Middleware pour forcer la connexion
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// Routes principales

app.get('/', (req, res) => res.redirect('/welcome'));

app.get('/welcome', (req, res) => {
  res.send(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Accueil</title>
    ${commonStyles}</head><body>${getHeaderHTML(req)}
    <main><h1>Bienvenue sur le système de gestion d'appels</h1></main></body></html>
  `);
});

app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Connexion</title>
    ${commonStyles}</head><body>${getHeaderHTML(req)}
    <main>
      <form method="POST" action="/login">
        <h1>Connexion</h1>
        <input type="text" name="identifiant" placeholder="Identifiant" required />
        <input type="password" name="mot_de_passe" placeholder="Mot de passe" required />
        <button class="btn" type="submit">Se connecter</button>
      </form>
    </main></body></html>
  `);
});

app.post('/login', async (req, res) => {
  const { identifiant, mot_de_passe } = req.body;
  try {
    const [rows] = await db.execute('SELECT * FROM utilisateurs WHERE identifiant = ?', [identifiant]);
    const user = rows[0];
    if (user && await bcrypt.compare(mot_de_passe, user.mot_de_passe)) {
      req.session.user = user;
      return res.redirect('/dashboard');
    }
    res.send('<p>Identifiants invalides</p><a href="/login">Retour</a>');
  } catch (e) {
    res.status(500).send('Erreur serveur');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/dashboard', requireLogin, (req, res) => {
  const user = req.session.user;
  res.send(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Dashboard</title>
    ${commonStyles}</head><body>${getHeaderHTML(req)}
    <main><h1>Bienvenue ${user.nom} (${user.role})</h1></main></body></html>
  `);
});

app.get('/menu', requireLogin, (req, res) => {
  res.send(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Menu</title>
    ${commonStyles}</head><body>${getHeaderHTML(req)}
    <main>
      <h1>Menu Principal</h1>
      <div class="menu-buttons">
        <a href="/ajouter-pbx">Ajouter PBX</a>
        <a href="/autre-fonctionnalite">Autre fonction</a>
      </div>
    </main></body></html>
  `);
});

// --- Route page d’ajout PBX (GET + POST) ---
app.get('/ajouter-pbx', requireLogin, (req, res) => {
  res.send(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ajouter un PBX</title>
    ${commonStyles}</head><body>${getHeaderHTML(req)}
    <main>
      <h1>Ajouter un PBX</h1>
      <form action="/ajouter-pbx" method="POST">
        <input type="text" name="nom" placeholder="Nom du PBX" required />
        <input type="text" name="localisation" placeholder="Localisation" />
        <input type="text" name="num_serie" placeholder="Numéro de série" />
        <input type="text" name="version_firewere" placeholder="Version Firmware" />
        <input type="text" name="type" placeholder="Type" />
        <button class="btn" type="submit">Ajouter</button>
      </form>
      <a href="/menu" class="btn">Retour au menu</a>
    </main></body></html>
  `);
});

app.post('/ajouter-pbx', requireLogin, async (req, res) => {
  const { nom, localisation, num_serie, version_firewere, type } = req.body;
  try {
    await db.execute(
      'INSERT INTO pbx (nom, localisation, num_serie, version_firewere, type) VALUES (?, ?, ?, ?, ?)',
      [nom, localisation, num_serie, version_firewere, type]
    );
    res.send(`
      <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Succès</title>${commonStyles}</head><body>${getHeaderHTML(req)}
      <main style="text-align:center; margin-top: 100px;">
        <h2>✅ PBX ajouté avec succès !</h2>
        <a href="/menu" class="btn">Retour au menu</a>
      </main></body></html>
    `);
  } catch (err) {
    res.status(500).send('Erreur lors de l\'ajout du PBX');
  }
});

// Lancement du serveur après connexion DB
connectDB().then(() => {
  app.listen(PORT, IP_ADDRESS, () => {
    console.log(`🚀 Serveur lancé à http://${IP_ADDRESS}:${PORT}`);
  });
});
