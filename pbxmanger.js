const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const IP_ADDRESS = '10.10.50.122';
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

// Middleware pour parser le body des formulaires
app.use(express.urlencoded({ extended: true }));

// Fonction simple pour échapper le HTML (pour éviter l'injection dans la vue générée)
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Route principale pour afficher les relations PBX ⇄ Manager avec style complet
app.get('/pbx-manager', async (req, res) => {
  try {
    const [relations] = await db.query(`
      SELECT pm.id, p.nom AS pbx_nom, u.nom AS manager_nom 
      FROM pbx_manager pm
      JOIN pbx p ON pm.pbx_id = p.id
      JOIN utilisateurs u ON pm.manager_id = u.id
    `);

    const [pbxList] = await db.query("SELECT id, nom FROM pbx");
    const [managers] = await db.query("SELECT id, nom FROM utilisateurs WHERE role = 'employe'");

    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Gestion PBX - Manager</title>

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
      padding: 2rem 1rem;
      max-width: 900px;
      margin: 0 auto;
    }
    h2, h4 {
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
    }
    label {
      font-weight: 600;
      margin-bottom: 0.5rem;
      display: block;
      color: var(--primary);
    }
    select {
      padding: 12px 15px;
      border: 1.8px solid var(--border);
      border-radius: 12px;
      font-size: 1rem;
      width: 100%;
      transition: all 0.25s ease;
      font-family: 'Montserrat', sans-serif;
      color: var(--dark);
    }
    select:focus {
      border-color: var(--primary);
      outline: none;
      box-shadow: 0 0 6px var(--primary);
    }
    button {
      background-color: var(--primary);
      border: none;
      color: white;
      font-weight: 700;
      font-size: 1.1rem;
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
  <h2>Relations PBX ⇄ Manager</h2>

  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>PBX</th>
        <th>Manager</th>
      </tr>
    </thead>
    <tbody>
      ${relations.map(rel => `
        <tr>
          <td>${rel.id}</td>
          <td>${escapeHtml(rel.pbx_nom)}</td>
          <td>${escapeHtml(rel.manager_nom)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

 
  <form action="/pbx-manager/add" method="POST">
    <div style="flex: 1 1 40%;">
      <label for="pbx_id">PBX</label>
      <select id="pbx_id" name="pbx_id" required>
        ${pbxList.map(p => `<option value="${p.id}">${escapeHtml(p.nom)}</option>`).join('')}
      </select>
    </div>
    <div style="flex: 1 1 40%;">
      <label for="manager_id">Manager</label>
      <select id="manager_id" name="manager_id" required>
        ${managers.map(m => `<option value="${m.id}">${escapeHtml(m.nom)}</option>`).join('')}
      </select>
    </div>
    <div style="flex: 1 1 15%;">
      <button type="submit">Ajouter</button>
    </div>
  </form>
</body>
</html>
    `);

  } catch (error) {
    console.error('Erreur récupération données :', error);
    res.status(500).send('Erreur serveur lors de la récupération des données');
  }
});

// Route POST pour ajouter une nouvelle relation
app.post('/pbx-manager/add', async (req, res) => {
  const { pbx_id, manager_id } = req.body;
  try {
    await db.query("INSERT INTO pbx_manager (pbx_id, manager_id) VALUES (?, ?)", [pbx_id, manager_id]);
    res.redirect('/pbx-manager');
  } catch (error) {
    console.error('Erreur ajout relation :', error);
    res.status(500).send('Erreur lors de l’ajout de la relation : ' + error.message);
  }
});

// Lancement serveur après connexion à la BDD
connectDB().then(() => {
  app.listen(PORT, IP_ADDRESS, () => {
    console.log(`🚀Serveur démarré à http://${IP_ADDRESS}:${PORT}/pbx-manager`);
  });
});
