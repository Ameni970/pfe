const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());  
app.use(cors());

const IP_ADDRESS = '10.10.50.109';
const PORT = 8001;

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

// Common HTML head with styles
const htmlHead = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
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
        h1, h2, h3 {
            font-family: 'Playfair Display', serif;
            font-weight: 600;
            margin-bottom: 1.5rem;
            color: var(--primary);
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
        button, .btn {
            display: inline-block;
            text-align: center;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.65rem;
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
        button.secondary, .btn.secondary {
            background-color: var(--secondary);
            color: white;
            box-shadow: 0 3px 7px rgba(255, 111, 145, 0.4);
        }
        button.secondary:hover, .btn.secondary:hover {
            background-color: #d65174;
        }
        button.accent, .btn.accent {
            background-color: var(--accent);
            color: white;
        }
        button.accent:hover, .btn.accent:hover {
            background-color: #e69500;
        }
        button.danger {
            background-color: #ff4444;
            color: white;
        }
        button.danger:hover {
            background-color: #cc0000;
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
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: var(--dark);
        }
        #message {
            font-weight: 600;
            margin-bottom: 1rem;
            min-height: 1.3em;
        }
        @media (max-width: 768px) {
            header nav ul {
                gap: 1rem;
            }
            th, td {
                padding: 8px 10px;
            }
        }
    </style>
</head>
`;

// Header HTML
const headerHTML = `
<header>
    <div class="container">
        <div class="logo">Call Accounting Hub</div>
        <nav>
            <ul>
                <li><a href="/">Historique Appels</a></li>
                <li><a href="/users">Gestion Utilisateurs</a></li>
            </ul>
        </nav>
    </div>
</header>
`;

// Route affichage utilisateurs
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
                <a href="/?utilisateur=${encodeURIComponent(user.identifiant)}" class="btn primary" style="margin-left: 5px;">
                    🔍 Consulter
                </a>
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
app.post('/delete/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM utilisateurs WHERE id = ?', [req.params.id]);
        res.redirect('/users');
    } catch (error) {
        console.error('❌ Erreur suppression :', error);
        res.status(500).send('Erreur lors de la suppression.');
    }
});

// Route mise à jour utilisateur
app.post('/update/:id', async (req, res) => {
    const { nom, identifiant, role } = req.body;
    try {
        await db.execute(
            'UPDATE utilisateurs SET nom = ?, identifiant = ?, role = ? WHERE id = ?',
            [nom, identifiant, role, req.params.id]
        );
        res.redirect('/users');
    } catch (error) {
        console.error('❌ Erreur mise à jour :', error);
        res.status(500).send('Erreur mise à jour');
    }
});

// Route historique appels (page d'accueil "/")
app.get('/', async (req, res) => {
    const utilisateur = req.query.utilisateur || ''; // filtre facultatif
    let query = `
        SELECT cdr_id, msg, time, e164, dn, root, h323, conf, calls
        FROM events
    `;
    const params = [];

    if (utilisateur) {
        query += ` WHERE e164 = ? OR dn = ? OR h323 = ? `;
        params.push(utilisateur, utilisateur, utilisateur);
    }

    query += ` ORDER BY time DESC LIMIT 100`;

    try {
        const [calls] = await db.query(query, params);

        const rows = calls.map(call => `
            <tr>
                <td>${call.cdr_id || ''}</td>
                <td>${call.msg || ''}</td>
                <td>${call.time ? new Date(call.time * 1000).toLocaleString() : ''}</td>
                <td>${call.e164 || ''}</td>
                <td>${call.dn || ''}</td>
                <td>${call.root || ''}</td>
                <td>${call.h323 || ''}</td>
                <td>${call.conf || ''}</td>
                <td>${call.calls || ''}</td>
            </tr>
        `).join('');

        res.send(`
            ${htmlHead}
            <body>
                ${headerHTML}
                <div class="container">
                    <div class="card">
                        <h2>🔎 Historique des appels</h2>
                        <form method="GET" action="/" id="filterForm" style="margin-bottom: 20px;">
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <div style="flex-grow: 1;">
                                    <input type="text" name="utilisateur" id="utilisateur" value="${utilisateur}" 
                                        placeholder="Filtrer par identifiant (ex: 101 ou Ilhem)" style="width: 100%;"/>
                                </div>
                                <button type="submit" class="primary">Rechercher</button>
                            </div>
                        </form>

                        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                            <button id="toggleNoIdBtn" class="secondary">Masquer les appels sans ID</button>
                            <button id="masquerBtn" class="secondary">Masquer</button>
                        </div>

                        <div style="overflow-x: auto;">
                            <table id="callsTable">
                                <thead>
                                    <tr>
                                        <th>CDR ID</th>
                                        <th>Message</th>
                                        <th>Date / Heure</th>
                                        <th>E164</th>
                                        <th>DN</th>
                                        <th>Root</th>
                                        <th>H323</th>
                                        <th>Conf</th>
                                        <th>Calls</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <script>
                    let hidden = false;

                    function toggleHide() {
                        const rows = document.querySelectorAll('#callsTable tbody tr');
                        if (!hidden) {
                            rows.forEach(row => {
                                const cdrIdCell = row.cells[0];
                                if (!cdrIdCell.textContent.trim()) {
                                    row.style.display = 'none';
                                }
                            });
                            hidden = true;
                            updateButtonsText();
                        } else {
                            rows.forEach(row => {
                                row.style.display = '';
                            });
                            hidden = false;
                            updateButtonsText();
                        }
                    }

                    function updateButtonsText() {
                        const toggleBtn = document.getElementById('toggleNoIdBtn');
                        const masquerBtn = document.getElementById('masquerBtn');
                        if(hidden) {
                            toggleBtn.textContent = 'Afficher les appels sans ID';
                            masquerBtn.textContent = 'Afficher';
                        } else {
                            toggleBtn.textContent = 'Masquer les appels sans ID';
                            masquerBtn.textContent = 'Masquer';
                        }
                    }

                    document.getElementById('toggleNoIdBtn').addEventListener('click', toggleHide);
                    document.getElementById('masquerBtn').addEventListener('click', toggleHide);
                </script>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('❌ Erreur lors de la requête :', err);
        res.status(500).send("❌ Erreur serveur lors de la récupération des appels.");
    }
});

app.listen(PORT, IP_ADDRESS, async () => {
    await connectDB();
    console.log(`🚀 Serveur lancé : http://${IP_ADDRESS}:${PORT}/users`);
});