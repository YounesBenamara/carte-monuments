# 🏛️ Ma Carte des Monuments

Application web locale pour garder une trace personnelle des musées et monuments historiques visités.

## Installation et lancement

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer le serveur
node server.js

# 3. Ouvrir dans le navigateur
# → http://localhost:3000
```

## Utilisation

- **Ajouter un lieu** : cliquez sur le bouton "Ajouter un lieu" dans la sidebar, ou faites un **clic droit** directement sur la carte pour pré-remplir les coordonnées
- **Rechercher sur la carte** : tapez un nom ou une adresse dans la barre au-dessus de la carte, puis choisissez un résultat (ou appuyez sur Entrée lorsque les propositions sont affichées). La carte zoome sur un pin rouge. Pour enregistrer ce lieu, cliquez ensuite sur « Ajouter à mes lieux » dans sa bulle. Le bouton ✕ efface la recherche et le pin.
- **Lieu déjà enregistré** : la bulle indique « Déjà dans mes lieux » et propose « Voir mon lieu » pour ouvrir la fiche existante. Le lieu reste accessible même si un filtre de catégorie le masquait.
- **Voir un lieu** : cliquez sur un marqueur pour voir la popup avec les détails et la photo
- **Centrer la carte** : cliquez sur un lieu dans la liste de gauche
- **Filtrer** : utilisez les boutons de filtre par catégorie (Musée, Monument, Site historique, Autre)
- **Supprimer** : survolez un lieu dans la liste et cliquez sur l'icône 🗑️

## Structure du projet

```
carte-monuments/
├── server.js           # Serveur Express (API REST)
├── package.json        # Dépendances Node.js
├── data/
│   ├── monuments.json  # Données persistées (JSON lisible)
│   └── photos/         # Photos uploadées
└── public/
    ├── index.html      # Page principale
    ├── app.js          # Logique frontend
    └── style.css       # Styles
```

## Personnalisation

### Modifier les couleurs des catégories

Dans `public/style.css`, modifiez les variables CSS :
```css
--color-musee: #2563EB;      /* bleu */
--color-monument: #D97706;   /* orange */
--color-site: #059669;       /* vert */
--color-autre: #6B7280;      /* gris */
```

Et dans `public/app.js`, le même mapping :
```javascript
const COULEURS_CATEGORIES = {
    'Musée': '#2563EB',
    'Monument': '#D97706',
    'Site historique': '#059669',
    'Autre': '#6B7280'
};
```

### Ajouter une catégorie

1. Ajouter l'option dans le `<select>` de `index.html`
2. Ajouter la couleur dans `COULEURS_CATEGORIES` et `ICONES_CATEGORIES` dans `app.js`
3. Ajouter le CSS pour le badge popup et le filtre dans `style.css`

### Modifier le centre initial de la carte

Dans `public/app.js` :
```javascript
const CARTE_CENTRE = [46.8, 2.5];  // [latitude, longitude]
const CARTE_ZOOM = 6;
```

## Données

Les données sont stockées dans `data/monuments.json` au format JSON lisible et éditable à la main. Les photos sont dans `data/photos/`.

Les visites et les photos personnelles ne sont pas incluses dans le dépôt Git. Sur une nouvelle installation, le dossier des photos et le fichier de visites vide sont créés automatiquement au lancement.
