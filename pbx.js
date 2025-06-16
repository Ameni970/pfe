const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const app = express();

const IP_ADDRESS = '10.10.50.122';
const PORT = 8001;

app.use(bodyParser.urlencoded({ extended: true }));

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
    console.error('❌ Erreur MySQL:', err);
    process.exit(1);
  }
}
connectDB();

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Ajouter un PBX</title>
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
      font-size: 1.9rem;
      font-weight: 600;
      color: var(--primary);
    }
    main {
      flex-grow: 1;
      max-width: 450px;
      margin: 100px auto 2rem;
      padding: 0 1rem;
    }
    h1 {
      font-size: 1.8rem;
      color: var(--primary);
      margin-bottom: 1.5rem;
      text-align: center;
    }
    form {
      display: flex;
      flex-direction: column;
    }
    input {
      padding: 12px 15px;
      margin-bottom: 18px;
      border: 1.8px solid var(--border);
      border-radius: 12px;
      font-size: 1rem;
      transition: all 0.25s ease;
    }
    input:focus {
      border-color: var(--primary);
      outline: none;
      box-shadow: 0 0 6px var(--primary);
    }
    button.btn {
      display: block;
      padding: 14px 0;
      border-radius: 14px;
      font-weight: 700;
      font-size: 1.1rem;
      cursor: pointer;
      background-color: var(--primary);
      color: white;
      border: none;
      box-shadow: 0 4px 10px var(--shadow);
      transition: background-color 0.3s ease;
    }
    button.btn:hover {
      background-color: #432c75;
    }
    @media (max-width: 480px) {
      main {
        margin: 90px 1rem 2rem;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <div class="logo">📟 Gestion PBX</div>
    </div>
  </header>

  <main>
    <h1>Ajouter un PBX</h1>
    <form action="/add" method="POST">
      <input type="text" name="nom" placeholder="Nom du PBX" required />
      <input type="text" name="localisation" placeholder="Localisation" />
      <input type="text" name="num_serie" placeholder="Numéro de série" />
      <input type="text" name="version_firewere" placeholder="Version Firmware" />
      <input type="text" name="type" placeholder="Type" />
      <button type="submit" class="btn">Ajouter</button>
    </form>
  </main>
</body>
</html>
`);
});

app.post('/add', async (req, res) => {
  const { nom, localisation, num_serie, version_firewere, type } = req.body;
  await db.query(
    'INSERT INTO pbx (nom, localisation, num_serie, version_firewere, type) VALUES (?, ?, ?, ?, ?)',
    [nom, localisation, num_serie, version_firewere, type]
  );
  res.send(`
  <html>
    <head>
      <meta charset="UTF-8">
      <title>Succès</title>
      <style>
        body {
          font-family: 'Montserrat', sans-serif;
          background-color: var(--light);
          color: var(--dark);
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        .message {
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 4px 10px var(--shadow);
          text-align: center;
        }
        a {
          margin-top: 20px;
          display: inline-block;
          color: var(--primary);
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="message">
        <h2>✅ PBX ajouté avec succès !</h2>
        <a href="/">⬅ Retour</a>
      </div>
    </body>
  </html>
  `);
});

app.listen(PORT, IP_ADDRESS, () => {
  console.log(`🚀 Serveur lancé sur http://${IP_ADDRESS}:${PORT}`);
});

