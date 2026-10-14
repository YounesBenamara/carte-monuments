# Prompt — Application "Ma Carte des Monuments"

## Contexte

Je veux créer une application web locale (pas de serveur distant, pas de compte, pas de cloud) pour garder une trace personnelle des musées et monuments historiques que j'ai visités. L'app tourne dans mon navigateur via un simple fichier HTML, ou via un petit serveur local Node/Python si nécessaire pour la gestion des fichiers.

---

## Fonctionnalités attendues

### Carte interactive
- Carte navigable (zoom, déplacement) basée sur **Leaflet.js** avec les tuiles OpenStreetMap
- Marqueurs colorés selon la catégorie du lieu (musée, monument, site historique, autre)
- Clic droit sur la carte pour placer un nouveau marqueur directement à cet endroit
- Clic sur un marqueur existant → popup avec toutes les infos du lieu + photo

### Ajout d'un lieu
Formulaire avec les champs suivants :
- Nom du lieu (obligatoire)
- Catégorie : Musée / Monument / Site historique / Autre
- Date de visite (texte libre, ex: "juin 2024")
- Note / souvenir (texte libre)
- Latitude / Longitude (pré-remplies si clic droit sur la carte)
- Photo (upload depuis le disque, stockée localement)

### Gestion des lieux
- Liste latérale ou panneau de tous les lieux ajoutés, cliquable pour centrer la carte dessus
- Filtre par catégorie
- Suppression d'un lieu avec confirmation
- Compteur du nombre de lieux visités

### Persistance des données
- Toutes les données (coordonnées, noms, notes, photos) sont **stockées localement** sur le disque dans un fichier JSON (`data/monuments.json`)
- Les photos sont stockées dans un dossier `data/photos/` et référencées par chemin relatif dans le JSON
- Aucune dépendance à un service externe ou à une connexion internet (sauf les tuiles de carte OpenStreetMap)

---

## Stack technique souhaitée

**Option recommandée — Mini serveur local Node.js :**
- `server.js` avec **Express** (ou serveur HTTP natif Node) pour servir les fichiers statiques et exposer une API REST simple
- `index.html` + `app.js` + `style.css` pour le frontend
- API endpoints :
  - `GET /api/places` → retourne tous les lieux
  - `POST /api/places` → ajoute un lieu
  - `DELETE /api/places/:id` → supprime un lieu
  - `POST /api/upload` → upload une photo, retourne le chemin
- Lancement : `node server.js` puis ouvrir `http://localhost:3000`

**Alternative si Node non disponible — Python :**
- `server.py` avec **Flask**
- Même logique d'API REST
- Lancement : `python server.py`

---

## Structure de fichiers attendue

```
carte-monuments/
├── server.js          # ou server.py
├── package.json       # si Node
├── data/
│   ├── monuments.json # données persistées
│   └── photos/        # photos uploadées
└── public/
    ├── index.html
    ├── app.js
    └── style.css
```

---

## Design de l'interface

- Interface sobre, moderne, en français
- Palette : bleu foncé (#185FA5) comme couleur principale, fond blanc ou gris très clair
- Sidebar à gauche avec la liste des lieux et les filtres
- Carte qui prend tout l'espace restant à droite
- Formulaire d'ajout dans une modale (popup)
- Responsive basique (fonctionne sur grand écran, pas besoin d'être mobile-first)
- Couleur des marqueurs par catégorie :
  - Musée → bleu
  - Monument → orange/amber
  - Site historique → vert
  - Autre → gris

---

## Contraintes importantes

- **Tout doit fonctionner en local**, sans compte, sans API key, sans cloud
- Les photos doivent être copiées dans `data/photos/` au moment de l'upload (pas de base64 dans le JSON, c'est trop lourd)
- Le fichier `monuments.json` doit être humainement lisible et éditable à la main si besoin
- Le code doit être **commenté en français** et facile à modifier
- Utiliser **Leaflet.js** (CDN) pour la carte, pas Google Maps ni Mapbox
- Pas de framework frontend lourd (pas de React/Vue/Angular) — HTML/JS vanilla suffisent

---

## Format du fichier monuments.json

```json
[
  {
    "id": "1717500000000",
    "name": "Musée de l'Ancien Évêché",
    "category": "Musée",
    "date": "mars 2024",
    "note": "Superbe collection gallo-romaine, entrée gratuite",
    "lat": 45.1885,
    "lon": 5.7245,
    "photo": "data/photos/eveche.jpg"
  }
]
```

---

## Ce que je veux recevoir

1. Tous les fichiers du projet, prêts à lancer
2. Un `README.md` avec les instructions d'installation et de lancement (2-3 commandes max)
3. Le code commenté pour que je puisse facilement modifier les couleurs, les catégories, les champs du formulaire
