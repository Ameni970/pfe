# Call Accounting System

Un système de comptabilité d'appels en temps réel qui permet de suivre et d'analyser les appels téléphoniques.

## Fonctionnalités

- 🔄 Surveillance des appels en temps réel
- 📊 Tableau de bord interactif
- 📝 Génération de rapports détaillés
- 🔐 Authentification sécurisée
- 📱 Interface responsive
- 🔔 Notifications en temps réel

## Prérequis

- Node.js >= 14.0.0
- MySQL >= 5.7
- Navigateur web moderne

## Installation

1. Cloner le dépôt :
```bash
git clone [URL_DU_REPO]
cd call-accounting
```

2. Installer les dépendances :
```bash
npm install
```

3. Configurer la base de données :
- Créer une base de données MySQL
- Modifier les paramètres de connexion dans `config.js`

4. Démarrer le serveur :
```bash
npm start
```

Pour le développement :
```bash
npm run dev
```

## Structure du projet

```
call-accounting/
├── public/              # Fichiers statiques
│   ├── index.html      # Page d'accueil
│   ├── login.html      # Page de connexion
│   ├── styles.css      # Styles CSS
│   └── app.js          # JavaScript client
├── server.js           # Point d'entrée du serveur
├── config.js           # Configuration
├── database.js         # Gestion de la base de données
├── logger.js           # Système de logs
└── package.json        # Dépendances
```

## Configuration

Le fichier `config.js` contient toutes les configurations du système :

- Configuration du serveur TCP
- Configuration du serveur Web
- Configuration de la base de données
- Configuration des WebSockets
- Configuration des logs
- Configuration de la sécurité
- Configuration des notifications
- Configuration des rapports

## API

### Authentification

```http
POST /login
Content-Type: application/json

{
    "identifiant": "user",
    "mot_de_passe": "password"
}
```

### Appels

```http
GET /calls
```

### Rapports

```http
GET /reports
```

## WebSocket

Le système utilise WebSocket pour la communication en temps réel :

```javascript
const ws = new WebSocket('ws://10.10.50.109:8002');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Traitement des données
};
```

## Sécurité

- Authentification sécurisée avec bcrypt
- Protection contre les injections SQL
- Validation des entrées
- Logs détaillés
- Gestion des erreurs

## Développement

Pour contribuer au projet :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## Licence

Ce projet est sous licence ISC.

## Support

Pour toute question ou problème, veuillez ouvrir une issue sur le dépôt GitHub. 