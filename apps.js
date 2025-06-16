const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const IP_ADDRESS = '10.10.50.122';
const PORT = 8001;

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'secret_key',
  resave: false,
  saveUninitialized: true
}));

// Connexion MySQL
let db;
async function connectDB() {
  try {
    db = await mysql.createConnection({
      host: '10.10.50.108',
      user: 'user_reporting',
      password: 'voxtron',
      database: 'reporting'
    });
    console.log('✅ Connecté à MySQL');
  } catch (err) {
    console.error('❌ Erreur de connexion MySQL:', err.message);
  }
}
connectDB();

// Route de login
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Connexion</title></head>
      <body>
        <h2>Connexion</h2>
        <form method="POST" action="/login">
          <input type="text" name="username" placeholder="Nom d'utilisateur" required />
          <input type="password" name="password" placeholder="Mot de passe" required />
          <button type="submit">Se connecter</button>
        </form>
      </body>
    </html>
  `);
});

// Traitement login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.execute(
      'SELECT * FROM utilisateurs WHERE identifiant = ? AND mot_de_passe = ?',
      [username, password]
    );
    if (rows.length > 0) {
      req.session.user = rows[0];
      res.redirect('/dashboard');
    } else {
      res.send('<p>Identifiants invalides. <a href="/">Réessayer</a></p>');
    }
  } catch (err) {
    console.error('Erreur SQL:', err);
    res.status(500).send('Erreur serveur');
  }
});

// Dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/');

  const user = req.session.user;
  res.send(`
    <html>
      <head><title>Dashboard</title></head>
      <body>
        <h1>Bienvenue, ${user.nom}</h1>
        ${user.role === 'admin' ? `
          <p>Interface Administrateur</p>
          <button style="background-color:#007bff;color:white;padding:10px;border:none;">Bouton réservé à l’admin</button>
        ` : `
          <p>Interface Utilisateur</p>
        `}
        <br><br><a href="/logout">Se déconnecter</a>
      </body>
    </html>
  `);
});

// Déconnexion
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Lancer le serveur
app.listen(PORT, IP_ADDRESS, () => {
  console.log(`🚀 Serveur lancé sur http://${IP_ADDRESS}:${PORT}`);
});
