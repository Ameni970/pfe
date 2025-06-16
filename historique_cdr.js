const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const app = express();
const IP_ADDRESS = '10.10.50.109';
const PORT = 8001;

app.use(bodyParser.urlencoded({ extended: true }));

// Connexion MySQL
let db;
async function connectDB() {
  db = await mysql.createConnection({
    host: '10.10.50.108',
    user: 'user_reporting',
    password: 'voxtron',
    database: 'reporting'
  });
  console.log('✅ Connecté à MySQL');
}

// Route principale
app.get('/', async (req, res) => {
  const dateDebut = req.query.date_debut || '';
  const dateFin = req.query.date_fin || '';

  let query = `
    SELECT id, guid, seq, sys, pbx, node, device, cn, e164, h323, obj_h323, obj_e164, call_id, direction, utc, local_time
    FROM CDR
    WHERE 1=1
  `;
  const params = [];

  if (dateDebut && dateFin) {
    const start = new Date(dateDebut + 'T00:00:00Z');
    const end = new Date(dateFin + 'T23:59:59Z');
    const startUTC = Math.floor(start.getTime() / 1000);
    const endUTC = Math.floor(end.getTime() / 1000);
    query += ` AND utc BETWEEN ? AND ? `;
    params.push(startUTC, endUTC);
  }

  query += ` ORDER BY utc DESC LIMIT 100`;

  try {
    const [calls] = await db.query(query, params);

    const rows = calls.map(call => `
      <tr>
        <td>${call.id || ''}</td>
        <td>${call.e164 || ''}</td>
        <td>${call.h323 || ''}</td>
        <td>${call.utc ? new Date(call.utc * 1000).toLocaleString() : ''}</td>
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
      padding: 2rem 1rem;
      max-width: 900px;
      margin: 0 auto;
    }
    h1 {
      font-family: 'Playfair Display', serif;
      font-weight: 600;
      margin-bottom: 1.5rem;
      color: var(--primary);
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
      font-weight: 400;
      color: var(--dark);
    }
    th {
      background-color: var(--primary);
      color: white;
      font-weight: 600;
    }
    tr:hover {
      background-color: var(--accent);
      color: white;
      cursor: default;
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
      transition: all 0.25s ease;
      font-family: 'Montserrat', sans-serif;
      color: var(--dark);
    }
    input[type="date"]:focus {
      border-color: var(--primary);
      outline: none;
      box-shadow: 0 0 6px var(--primary);
    }
    button {
      background-color: var(--primary);
      border: none;
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
    <div>
      <button type="submit">Filtrer</button>
    </div>
    <div>
      <button type="button" onclick="window.location.href='/'">Réinitialiser</button>
    </div>
  </form>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>E164</th>
        <th>H323</th>
        <th>UTC</th>
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
    function masquerLigne(btn) {
      const row = btn.closest('tr');
      row.style.display = 'none';
    }
  </script>
</body>
</html>`);
  } catch (err) {
    console.error('❌ Erreur MySQL :', err);
    res.status(500).send("Erreur lors de la récupération des données.");
  }
});

// Lancer le serveur après la connexion MySQL
connectDB().then(() => {
  app.listen(PORT, IP_ADDRESS, () => {
    console.log(`✅ Serveur lancé : http://${IP_ADDRESS}:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Erreur de connexion DB :', err);
});
