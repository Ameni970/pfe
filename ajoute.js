const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

const app = express();
const IP_ADDRESS = '10.10.50.109';
const PORT = 8001;

let db;

// Connexion à la base de données
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware session
app.use(session({
  secret: 'ta-cle-secrete-ici',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // 1 heure
}));

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

// Header HTML as a function that checks user role
function getHeaderHTML(req) {
  const user = req.session.user;
  const adminNavItem = user && user.role === 'admin' ? 
    `<li><a href="http://10.10.50.108/phpmyadmin/db_structure.php?server=1&db=reporting" target="_blank">phpMyAdmin</a></li>` : 
    '';
  
  return `
    <header>
      <div class="container">
        <div class="logo">Call Accounting Hub</div>
        <nav>
          <ul>
            <li><a href="/welcome">Accueil</a></li>
            ${user ? `
              <li><a href="/dashboard">Dashboard</a></li>
              ${adminNavItem}
              <li><form action="/logout" method="POST" style="display:inline;"><button type="submit" style="background:none;border:none;cursor:pointer;font:inherit;color:inherit;padding:0;font-weight:600;">Déconnexion</button></form></li>
            ` : `
              <li><a href="/register">Inscription</a></li>
              <li><a href="/login">Connexion</a></li>
            `}
          </ul>
        </nav>
      </div>
    </header>
  `;
}

// Middleware d'authentification
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// Routes

// Accueil
app.get(['/', '/welcome'], (req, res) => {
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

// Page d'inscription


// Page de connexion
app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  
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
        <h1>Connexion</h1>
        <p id="message"></p>
        <form id="loginForm">
          <input name="identifiant" type="text" placeholder="Identifiant" required />
          <input name="mot_de_passe" type="password" placeholder="Mot de passe" required />
          <button class="btn" type="submit">Se connecter</button>
        </form>
        <p style="text-align:center; margin-top:1rem;">
          <a href="/register" class="btn">Pas encore de compte ? Inscription</a>
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

// POST /login : Connexion utilisateur
app.post('/login', async (req, res) => {
  try {
    const { identifiant, mot_de_passe } = req.body;
    if (!identifiant || !mot_de_passe) {
      return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    const [rows] = await db.execute('SELECT * FROM utilisateurs WHERE identifiant = ?', [identifiant]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!isMatch) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    }

    req.session.user = {
      id: user.id,
      nom: user.nom,
      identifiant: user.identifiant,
      role: user.role
    };

    return res.json({ message: 'Connexion réussie.' });
  } catch (error) {
    console.error('Erreur POST /login:', error);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Dashboard
app.get('/dashboard', requireLogin, (req, res) => {
  const user = req.session.user;
  
  // Add admin link only if user is admin
  

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>Dashboard - Call Accounting</title>
      ${commonStyles}
      <style>
        body {
          background: #f0f2f5;
          color: var(--dark);
          min-height: 100vh;
        }
        main {
          max-width: 700px;
          margin: 120px auto 2rem;
          padding: 2rem;
          background: white;
          border-radius: 20px;
          box-shadow: 0 3px 15px rgba(0,0,0,0.1);
          text-align: center;
        }
        h1 {
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: var(--primary);
        }
        button.btn-logout {
          background: var(--secondary);
          color: white;
          padding: 12px 25px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 600;
          font-size: 1rem;
          margin-top: 1.5rem;
          transition: background 0.3s ease;
        }
        button.btn-logout:hover {
          background: #d65174;
        }
        a.btn-admin {
          display: inline-block;
          background-color: var(--accent);
          color: white;
          padding: 12px 25px;
          border-radius: 14px;
          text-decoration: none;
          font-weight: 600;
          margin: 1rem 0;
          transition: background 0.3s ease;
        }
        a.btn-admin:hover {
          background-color: #e69500;
        }
      </style>
    </head>
    <body>
      ${getHeaderHTML(req)}
      <main>
        <h1>Bonjour ${user.nom} !</h1>
        <p>Vous êtes connecté avec le rôle <strong>${user.role}</strong>.</p>
        ${adminLink}
        <form action="/logout" method="POST">
          <button class="btn-logout" type="submit">Se déconnecter</button>
        </form>
      </main>
    </body>
    </html>
  `);
});

// Déconnexion
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Erreur déconnexion:', err);
      return res.status(500).send('Erreur serveur lors de la déconnexion.');
    }
    res.redirect('/login');
  });
});

// Lancer le serveur après connexion DB
connectDB().then(() => {
  app.listen(PORT, IP_ADDRESS, () => {
    console.log(`🚀 Serveur démarré sur http://${IP_ADDRESS}:${PORT}`);
  });
});