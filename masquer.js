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
  const utilisateur = req.query.utilisateur || '';
  const dateInput = req.query.utc || ''; // format attendu : YYYY-MM-DD

  let query = `
    SELECT id, guid, seq, sys, pbx, node, device, cn, e164, h323, obj_h323, obj_e164, call_id, direction, utc, local_time
    FROM CDR
    WHERE 1=1
  `;
  const params = [];

  if (utilisateur) {
    query += ` AND (e164 = ? OR h323 = ? OR obj_e164 = ?) `;
    params.push(utilisateur, utilisateur, utilisateur);
  }

  if (dateInput) {
    const startDate = new Date(dateInput + 'T00:00:00Z');
    const endDate = new Date(dateInput + 'T23:59:59Z');
    const startUTC = Math.floor(startDate.getTime() / 1000);
    const endUTC = Math.floor(endDate.getTime() / 1000);
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
    body { font-family: Arial; background: #f4f4f4; margin: 20px; color: #333; }
    table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
    th { background: #eee; }
    .filter-container { margin-bottom: 20px; }
    .filter-container input { padding: 8px; margin-right: 10px; }
    .btn { background: #007BFF; color: #fff; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px; }
    .btn:hover { background: #0056b3; }
  </style>
</head>
<body>
  <h1>Historique des Appels (table CDR)</h1>
  <div class="filter-container">
    <form method="get">
      <input type="text" name="utilisateur" placeholder="Filtrer par identifiant..." value="${utilisateur}">
      <input type="date" name="utc" placeholder="Filtrer par date UTC..." value="${dateInput}">
      <button type="submit" class="btn">Filtrer</button>
      <button type="button" class="btn" onclick="window.location.href='/'">Réafficher tout</button>
    </form>
  </div>
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

