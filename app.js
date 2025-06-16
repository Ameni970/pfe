const express = require('express');
const mysql = require('mysql2');
const app = express();
const PORT = 8001;
const IP_ADDRESS = '10.10.50.109';

// Connexion MySQL
const db = mysql.createConnection({
  host: '10.10.50.108',
  user: 'user_reporting',
  password: 'voxtron',
  database: 'reporting'
});

// Gestion de la connexion à la base de données
db.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err);
    return;
  }
  console.log('Connecté à la base de données MySQL');
});

// Gestion des erreurs de la base de données
db.on('error', (err) => {
  console.error('Erreur de base de données:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Tentative de reconnexion à la base de données...');
    db.connect();
  } else {
    throw err;
  }
});

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Route principale - Rendu de la page avec HTML + chargement des PBX dynamiques
app.get('/', (_req, res) => {
  db.query('SELECT DISTINCT pbx FROM CDR ORDER BY pbx', (err, results) => {
    if (err) {
      return res.status(500).send('Erreur lors de la récupération des PBX');
    }

    const pbxOptions = results.map(r => `<option value="${r.pbx}">${r.pbx}</option>`).join('');

    res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Filtrage des Appels par pbx</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
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
            padding: 100px 20px 20px;
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
          h1, h2, h3 {
            font-family: 'Playfair Display', serif;
            font-weight: 600;
            margin-bottom: 1.5rem;
            color: var(--primary);
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          .card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 24px;
          }
          form {
            display: flex;
            flex-direction: column;
          }
          .form-group {
            margin-bottom: 20px;
          }
          label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: var(--dark);
          }
          input, select {
            padding: 12px 15px;
            margin-bottom: 18px;
            border: 1.8px solid var(--border);
            border-radius: 12px;
            font-size: 1rem;
            transition: all 0.25s ease;
            width: 100%;
          }
          input:focus, select:focus {
            border-color: var(--primary);
            outline: none;
            box-shadow: 0 0 6px var(--primary);
          }
          button, .btn {
            display: inline-block;
            text-align: center;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
          }
          button.primary, .btn.primary {
            background-color: var(--primary);
            color: white;
            box-shadow: 0 4px 10px var(--shadow);
          }
          button.primary:hover, .btn.primary:hover {
            background-color: #432c75;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid var(--border);
          }
          th {
            background-color: var(--primary);
            color: white;
            font-weight: 600;
          }
          tr:nth-child(even) {
            background-color: rgba(92, 61, 153, 0.05);
          }
          tr:hover {
            background-color: rgba(92, 61, 153, 0.1);
          }
          .empty-message {
            text-align: center;
            padding: 2rem;
            color: var(--gray);
            font-style: italic;
          }
          @media (max-width: 768px) {
            body {
              padding: 80px 15px 15px;
            }
            th, td {
              padding: 8px 10px;
            }
          }
        </style>
      </head>
      <body>
        <header>
          <div class="container">
            <div class="logo">Filtrage des Appels</div>
          </div>
        </header>
        
        <div class="container">
          <div class="card">
            <h1>Filtrer les appels</h1>
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

              <button type="submit" class="primary">Rechercher</button>
            </form>
          </div>

          <div class="card">
            <table id="resultsTable">
              <thead>
                <tr>
                  <th>PBX</th>
                  <th>Nom</th>
                  <th>Direction</th>
                  <th>UTC</th>
                  <th>Date locale</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>

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

              if (!res.ok) {
                throw new Error('Erreur réseau');
              }

              const data = await res.json();
              const tbody = document.querySelector('#resultsTable tbody');
              tbody.innerHTML = '';

              if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-message">Aucun appel trouvé</td></tr>';
                return;
              }

              data.forEach((row, index) => {
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
              console.error('Erreur:', error);
              alert('Une erreur est survenue lors de la récupération des données');
            }
          });
        </script>
      </body>
      </html>
    `);
  });
});

// Route POST pour le filtrage
app.post('/filtrer', (req, res) => {
  const { pbx, fromDate, toDate } = req.body;
  const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
  const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);

  const query = `
    SELECT * FROM CDR
    WHERE pbx = ? AND utc BETWEEN ? AND ?
    ORDER BY utc DESC
  `;

  db.query(query, [pbx, fromTimestamp, toTimestamp], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// Démarrage du serveur
app.listen(PORT, IP_ADDRESS, () => {
  console.log(`Serveur démarré sur http://${IP_ADDRESS}:${PORT}`);
});