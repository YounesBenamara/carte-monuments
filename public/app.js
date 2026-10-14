/**
 * Ma Carte des Monuments — Logique principale
 * Inclut la recherche d'adresse via Nominatim (OpenStreetMap)
 */

// === CONFIGURATION ===
const CARTE_CENTRE = [46.8, 2.5];
const CARTE_ZOOM = 6;
const COULEURS_CATEGORIES = {
    'Musée': '#2563EB', 'Monument': '#D97706',
    'Site historique': '#059669', 'Autre': '#6B7280'
};
const ICONES_CATEGORIES = {
    'Musée': '🏛️', 'Monument': '🏰',
    'Site historique': '🏺', 'Autre': '📍'
};
const MOIS_VISITE = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// === VARIABLES GLOBALES ===
let map, marqueurs = {}, lieux = [], filtreActif = 'all';
let photoUploadPath = '', lieuASupprimer = null;
let localisationSelectionnee = '';
let sourceSelectionnee = '';
let rechercheTimer = null;        // Timer pour le debounce
let marqueurPreview = null;       // Marqueur temporaire de prévisualisation
let marqueurRecherche = null;     // Pin rouge pour explorer, sans enregistrer un lieu
let resultatRecherche = null;
let sequenceRecherche = 0;        // Ignorer les réponses d'une recherche remplacée

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
    initialiserDateVisite();
    initialiserCarte();
    chargerLieux();
    attacherEvenements();
});

// === DATE DE VISITE : JOUR / MOIS / ANNÉE ===
function initialiserDateVisite() {
    const mois = document.getElementById('input-mois');
    MOIS_VISITE.forEach((nom, index) => {
        mois.add(new Option(nom, String(index + 1).padStart(2, '0')));
    });
    const annee = document.getElementById('input-annee');
    for (let valeur = new Date().getFullYear(); valeur >= 1900; valeur--) {
        annee.add(new Option(String(valeur), String(valeur)));
    }
    mois.addEventListener('change', actualiserJoursVisite);
    annee.addEventListener('change', actualiserJoursVisite);
    actualiserJoursVisite();
}

function actualiserJoursVisite() {
    const jour = document.getElementById('input-jour');
    const valeur = jour.value;
    const mois = Number(document.getElementById('input-mois').value);
    // Sans année, autoriser le 29 février jusqu'à la sélection d'une année.
    const annee = Number(document.getElementById('input-annee').value) || 2000;
    const maximum = mois ? new Date(annee, mois, 0).getDate() : 31;
    jour.replaceChildren(new Option('Jour', ''));
    for (let numero = 1; numero <= maximum; numero++) {
        jour.add(new Option(String(numero), String(numero).padStart(2, '0')));
    }
    jour.value = Number(valeur) <= maximum ? valeur : '';
}

function decomposerDateVisite(dateStr) {
    const texte = String(dateStr || '').trim();
    const iso = texte.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
    if (iso) return { annee: iso[1], mois: iso[2] || '', jour: iso[3] || '' };
    // Reprendre aussi les anciennes dates telles que « mai 2026 ».
    const normaliser = valeur => valeur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const ancienne = normaliser(texte).match(/^(?:(\d{1,2})\s+)?([a-z]+)\s+(\d{4})$/);
    if (ancienne) {
        const index = MOIS_VISITE.findIndex(nom => normaliser(nom) === ancienne[2]);
        if (index !== -1) return {
            annee: ancienne[3], mois: String(index + 1).padStart(2, '0'),
            jour: ancienne[1] ? ancienne[1].padStart(2, '0') : ''
        };
    }
    return { annee: '', mois: '', jour: '' };
}

function remplirDateVisite(dateStr) {
    const date = decomposerDateVisite(dateStr);
    const annee = document.getElementById('input-annee');
    // Conserver les dates existantes même si leur année est hors de la liste.
    if (date.annee && !Array.from(annee.options).some(option => option.value === date.annee)) {
        annee.add(new Option(date.annee, date.annee));
    }
    annee.value = date.annee;
    document.getElementById('input-mois').value = date.mois;
    actualiserJoursVisite();
    document.getElementById('input-jour').value = date.jour;
}

function lireDateVisite() {
    const jour = document.getElementById('input-jour').value;
    const mois = document.getElementById('input-mois').value;
    const annee = document.getElementById('input-annee').value;
    if ((jour || mois) && !annee) throw new Error('Choisis une année pour la date de visite');
    if (jour && !mois) throw new Error('Choisis un mois pour la date de visite');
    return annee ? annee + (mois ? '-' + mois : '') + (jour ? '-' + jour : '') : '';
}

function initialiserCarte() {
    map = L.map('map', { center: CARTE_CENTRE, zoom: CARTE_ZOOM, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(map);
    map.on('contextmenu', (e) => ouvrirModalAjout(e.latlng.lat, e.latlng.lng));
}

// === API ===
async function chargerLieux() {
    try {
        lieux = await (await fetch('/api/places')).json();
        rafraichirAffichage();
    } catch (err) { afficherToast('❌ Erreur de chargement'); }
}

async function ajouterLieu(donnees) {
    try {
        const r = await fetch('/api/places', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(donnees)
        });
        if (!r.ok) throw new Error((await r.json()).error);
        const lieu = await r.json();
        lieux.push(lieu);
        rafraichirAffichage();
        afficherToast(`✅ "${lieu.name}" ajouté`);
        map.setView([lieu.lat, lieu.lon], 14);
    } catch (err) { afficherToast(`❌ ${err.message}`); }
}

async function supprimerLieu(id) {
    try {
        const r = await fetch(`/api/places/${id}`, { method: 'DELETE' });
        if (!r.ok) throw new Error('Erreur');
        lieux = lieux.filter(l => l.id !== id);
        rafraichirAffichage();
        afficherToast('🗑️ Lieu supprimé');
    } catch (err) { afficherToast('❌ Erreur suppression'); }
}

async function modifierLieu(id, donnees) {
    try {
        const r = await fetch(`/api/places/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(donnees)
        });
        if (!r.ok) throw new Error((await r.json()).error);
        const lieu = await r.json();
        const index = lieux.findIndex(l => l.id === id);
        if (index !== -1) lieux[index] = lieu;
        rafraichirAffichage();
        afficherToast(`✅ "${lieu.name}" modifié`);
        map.setView([lieu.lat, lieu.lon], 14);
    } catch (err) { afficherToast(`❌ ${err.message}`); }
}

async function uploaderPhoto(fichier) {
    const fd = new FormData();
    fd.append('photo', fichier);
    try {
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!r.ok) throw new Error((await r.json()).error);
        return (await r.json()).path;
    } catch (err) { afficherToast(`❌ ${err.message}`); return ''; }
}

// === RECHERCHE NOMINATIM ===
/**
 * Rechercher un lieu via l'API Nominatim (OpenStreetMap)
 * Gratuit, sans clé API, limité à 1 requête/seconde
 */
async function rechercherNominatim(query) {
    if (!query || query.length < 3) return [];
    try {
        const url = `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1&accept-language=fr`;
        const r = await fetch(url, {
            headers: { 'User-Agent': 'MaCarteDesMonuments/1.0' }
        });
        return await r.json();
    } catch (err) {
        console.error('Erreur Nominatim:', err);
        return [];
    }
}

/**
 * Déterminer l'icône à afficher selon le type de résultat Nominatim
 */
function iconeNominatim(result) {
    const t = result.type || '';
    const c = result.class || '';
    if (c === 'tourism' || t === 'museum') return '🏛️';
    if (t === 'castle' || t === 'monument' || t === 'memorial') return '🏰';
    if (c === 'historic') return '🏺';
    if (c === 'amenity') return '🏠';
    if (t === 'city' || t === 'town' || t === 'village') return '🏙️';
    return '📍';
}

/**
 * Extraire un nom court depuis le résultat Nominatim
 */
function nomCourt(result) {
    // Prendre le nom ou le premier segment du display_name
    return result.name || result.display_name.split(',')[0].trim();
}

/** Afficher seulement la ville et le pays, sans rue ni région. */
function localisationCourte(result) {
    const adresse = result.address || {};
    const ville = adresse.city || adresse.town || adresse.village ||
        adresse.municipality || adresse.hamlet || adresse.locality || '';
    return [ville, adresse.country].filter(Boolean).join(', ');
}

/** Identifiant durable du lieu fourni par la recherche. */
function identifiantRecherche(result) {
    return result.osm_type && result.osm_id ? `${result.osm_type}/${result.osm_id}` : '';
}

function trouverLieuEnregistre(result) {
    const sourceId = identifiantRecherche(result);
    const lat = Number(result.lat), lon = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const normaliser = nom => String(nom || '').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const nom = normaliser(nomCourt(result));
    const distance = lieu => {
        const radians = valeur => valeur * Math.PI / 180;
        const a = Math.sin(radians(Number(lieu.lat) - lat) / 2) ** 2 +
            Math.cos(radians(lat)) * Math.cos(radians(Number(lieu.lat))) *
            Math.sin(radians(Number(lieu.lon) - lon) / 2) ** 2;
        return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
    };
    // Priorité à l'identifiant, y compris si le nom ou les coordonnées ont changé.
    const exact = sourceId && lieux.find(lieu => lieu.sourceId === sourceId);
    if (exact) return exact;
    return lieux.find(lieu => {
        if (sourceId && lieu.sourceId) return false;
        const ecart = distance(lieu);
        // Compatibilité avec les lieux déjà enregistrés sans identifiant de recherche.
        return ecart <= 1 || (nom && normaliser(lieu.name) === nom && ecart <= 150);
    }) || null;
}

/**
 * Construire le HTML de la liste de résultats de recherche
 */
function construireResultatsHTML(resultats) {
    if (resultats.length === 0) {
        return '<div class="search-no-results">Aucun résultat trouvé</div>';
    }
    return resultats.map((r, i) => `
        <div class="search-result-item" data-index="${i}">
            <span class="search-result-icon">${iconeNominatim(r)}</span>
            <div class="search-result-info">
                <div class="search-result-name">${escapeHtml(nomCourt(r))}</div>
                <div class="search-result-address">${escapeHtml(localisationCourte(r))}</div>
            </div>
        </div>
    `).join('');
}

/**
 * Recherche avec debounce (attend 400ms après la dernière frappe)
 */
function rechercheDebounce(query, container, onSelect, spinner) {
    if (rechercheTimer) clearTimeout(rechercheTimer);
    const sequence = ++sequenceRecherche;
    container.classList.remove('visible');
    if (!query || query.length < 3) {
        container.classList.remove('visible');
        if (spinner) spinner.classList.remove('visible');
        return;
    }
    if (spinner) spinner.classList.add('visible');
    rechercheTimer = setTimeout(async () => {
        const resultats = await rechercherNominatim(query);
        if (sequence !== sequenceRecherche) return;
        if (spinner) spinner.classList.remove('visible');
        container.innerHTML = construireResultatsHTML(resultats);
        container.classList.add('visible');
        // Attacher les clics sur les résultats
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const idx = parseInt(item.dataset.index);
                onSelect(resultats[idx]);
                container.classList.remove('visible');
            });
        });
    }, 400);
}

// === EXPLORATION DE LA CARTE ===
function supprimerMarqueurRecherche() {
    if (marqueurRecherche) {
        map.removeLayer(marqueurRecherche);
        marqueurRecherche = null;
    }
    resultatRecherche = null;
}

function creerPopupRecherche(result) {
    const existant = trouverLieuEnregistre(result);
    const contenu = document.createElement('div');
    contenu.className = 'popup-body';
    const nom = document.createElement('div');
    nom.className = 'popup-name';
    nom.textContent = nomCourt(result);
    const localisation = document.createElement('div');
    localisation.className = 'popup-locality';
    localisation.textContent = localisationCourte(result);
    contenu.append(nom, localisation);
    if (existant) {
        const statut = document.createElement('div');
        statut.className = 'popup-already-saved';
        statut.textContent = '✓ Déjà dans mes lieux';
        contenu.append(statut);
    }
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'popup-search-add';
    action.textContent = existant ? 'Voir mon lieu' : 'Ajouter à mes lieux';
    action.addEventListener('click', () => {
        const lieu = trouverLieuEnregistre(result);
        if (lieu) {
            supprimerMarqueurRecherche();
            centrerSurLieu(lieu.id);
        } else {
            ouvrirModalAjout(parseFloat(result.lat), parseFloat(result.lon),
                nomCourt(result), localisationCourte(result), identifiantRecherche(result));
        }
    });
    contenu.append(action);
    return contenu;
}

function afficherLieuRecherche(result) {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    supprimerMarqueurRecherche();
    resultatRecherche = result;

    const icone = L.divIcon({
        className: 'search-marker',
        html: '<svg width="32" height="44" viewBox="0 0 32 44" aria-hidden="true"><path d="M16 1C7.7 1 1 7.7 1 16c0 11 15 26 15 26s15-15 15-26C31 7.7 24.3 1 16 1Z" fill="#DC2626" stroke="white" stroke-width="2"/><circle cx="16" cy="16" r="5" fill="white"/></svg>',
        iconSize: [32, 44], iconAnchor: [16, 43], popupAnchor: [0, -39]
    });
    marqueurRecherche = L.marker([lat, lon], {
        icon: icone, title: nomCourt(result), zIndexOffset: 1000
    }).addTo(map);

    marqueurRecherche.bindPopup(creerPopupRecherche(result), { maxWidth: 300 });

    // Adapter le zoom : une ville ou un pays occupe plus d'espace qu'un monument.
    const limites = (result.boundingbox || []).map(Number);
    if (limites.length === 4 && limites.every(Number.isFinite) &&
        limites[0] < limites[1] && limites[2] < limites[3]) {
        map.fitBounds([[limites[0], limites[2]], [limites[1], limites[3]]], {
            padding: [40, 70], maxZoom: 16
        });
    } else {
        map.setView([lat, lon], 16, { animate: true });
    }
    marqueurRecherche.openPopup();
}

// === AFFICHAGE ===
function rafraichirAffichage() {
    const f = filtreActif === 'all' ? lieux : lieux.filter(l => l.category === filtreActif);
    rafraichirMarqueurs(f);
    rafraichirListe(f);
    rafraichirCompteur();
    if (marqueurRecherche && resultatRecherche) {
        marqueurRecherche.setPopupContent(creerPopupRecherche(resultatRecherche));
    }
}

function rafraichirMarqueurs(liste) {
    Object.values(marqueurs).forEach(m => map.removeLayer(m));
    marqueurs = {};
    liste.forEach(lieu => {
        const col = COULEURS_CATEGORIES[lieu.category] || '#6B7280';
        const ico = ICONES_CATEGORIES[lieu.category] || '📍';
        const divIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="width:36px;height:36px;background:${col};border-radius:50% 50% 50% 4px;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px ${col}66;border:2.5px solid white;"><span style="transform:rotate(45deg);font-size:16px;">${ico}</span></div>`,
            iconSize: [36, 36], iconAnchor: [4, 36], popupAnchor: [14, -30]
        });
        marqueurs[lieu.id] = L.marker([lieu.lat, lieu.lon], { icon: divIcon })
            .addTo(map)
            .bindPopup(() => creerPopupContenu(lieu), { maxWidth: 300, closeButton: true });
    });
}

function creerPopupContenu(lieu) {
    const bc = { 'Musée': 'popup-badge-musee', 'Monument': 'popup-badge-monument',
        'Site historique': 'popup-badge-site', 'Autre': 'popup-badge-autre' }[lieu.category] || 'popup-badge-autre';
    let h = '<div class="popup-content">';
    if (lieu.photo) h += `<img class="popup-photo" src="/${lieu.photo}" alt="${lieu.name}" onerror="this.style.display='none'">`;
    h += `<div class="popup-body"><div class="popup-name">${escapeHtml(lieu.name)}</div>`;
    h += `<span class="popup-badge ${bc}">${escapeHtml(lieu.category)}</span>`;
    if (lieu.date) h += `<div class="popup-date">📅 ${escapeHtml(formatDateAffichage(lieu.date))}</div>`;
    if (lieu.note) h += `<div class="popup-note">${escapeHtml(lieu.note)}</div>`;
    h += '</div></div>';
    return h;
}

function rafraichirListe(liste) {
    const c = document.getElementById('liste-lieux');
    if (liste.length === 0) {
        c.innerHTML = `<div class="liste-vide"><span class="liste-vide-icon">🗺️</span>
            <div class="liste-vide-text">Aucun lieu enregistré.<br>Utilisez la <strong>barre de recherche</strong><br>ou faites un <strong>clic droit</strong> sur la carte.</div></div>`;
        return;
    }
    c.innerHTML = liste.map(l => {
        const col = COULEURS_CATEGORIES[l.category] || '#6B7280';
        return `<div class="lieu-card" data-id="${l.id}" onclick="centrerSurLieu('${l.id}')">
            <div class="lieu-card-dot" style="background:${col}"></div>
            <div class="lieu-card-info"><div class="lieu-card-name">${escapeHtml(l.name)}</div>
            <div class="lieu-card-meta"><span class="lieu-card-category">${escapeHtml(l.category)}</span>
            ${l.date ? `<span>· ${escapeHtml(formatDateAffichage(l.date))}</span>` : ''}</div></div>
            <button class="lieu-card-edit" onclick="event.stopPropagation();editerLieu('${l.id}')" title="Modifier">✏️</button>
            <button class="lieu-card-delete" onclick="event.stopPropagation();demanderSuppression('${l.id}')" title="Supprimer">🗑️</button></div>`;
    }).join('');
}

function rafraichirCompteur() {
    const n = lieux.length;
    document.getElementById('compteur').textContent =
        n === 0 ? 'Aucun lieu visité' : n === 1 ? '1 lieu visité' : `${n} lieux visités`;
}

// === ÉVÉNEMENTS ===
function attacherEvenements() {
    // Bouton ajouter
    document.getElementById('btn-ajouter').addEventListener('click', () => ouvrirModalAjout());

    // Fermer modale ajout
    document.getElementById('btn-fermer-modal').addEventListener('click', fermerModalAjout);
    document.getElementById('modal-overlay').addEventListener('click', e => {
        if (e.target === e.currentTarget) fermerModalAjout();
    });

    // Soumission formulaire
    document.getElementById('form-lieu').addEventListener('submit', async e => {
        e.preventDefault();
        await soumettreFormulaire();
    });

    // Upload photo
    document.getElementById('upload-zone').addEventListener('click', () => {
        document.getElementById('input-photo').click();
    });
    document.getElementById('input-photo').addEventListener('change', async e => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const p = document.getElementById('upload-preview');
            p.src = ev.target.result;
            p.classList.add('visible');
            document.getElementById('upload-placeholder').style.display = 'none';
        };
        reader.readAsDataURL(f);
        photoUploadPath = await uploaderPhoto(f);
    });

    // Filtres
    document.querySelectorAll('.filtre-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filtre-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filtreActif = btn.dataset.category;
            rafraichirAffichage();
        });
    });

    // Modale confirmation suppression
    document.getElementById('btn-fermer-confirm').addEventListener('click', fermerModalConfirm);
    document.getElementById('btn-annuler-suppression').addEventListener('click', fermerModalConfirm);
    document.getElementById('modal-confirm').addEventListener('click', e => {
        if (e.target === e.currentTarget) fermerModalConfirm();
    });
    document.getElementById('btn-confirmer-suppression').addEventListener('click', async () => {
        if (lieuASupprimer) { await supprimerLieu(lieuASupprimer); lieuASupprimer = null; fermerModalConfirm(); }
    });

    // Échap pour fermer
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { fermerModalAjout(); fermerModalConfirm(); }
    });

    // === RECHERCHE SUR LA CARTE ===
    const mapInput = document.getElementById('map-search-input');
    const mapResults = document.getElementById('map-search-results');
    const mapClear = document.getElementById('map-search-clear');

    mapInput.addEventListener('input', () => {
        mapClear.classList.toggle('visible', mapInput.value.length > 0);
        rechercheDebounce(mapInput.value.trim(), mapResults, (result) => {
            // Explorer le lieu avec un pin rouge. L'ajout reste un choix séparé.
            mapInput.value = nomCourt(result);
            mapClear.classList.add('visible');
            afficherLieuRecherche(result);
        }, null);
    });

    // Entrée sélectionne la première proposition déjà affichée.
    mapInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && mapResults.classList.contains('visible')) {
            e.preventDefault();
            const premier = mapResults.querySelector('.search-result-item');
            if (premier) premier.click();
        }
    });

    mapClear.addEventListener('click', () => {
        sequenceRecherche++;
        if (rechercheTimer) clearTimeout(rechercheTimer);
        mapInput.value = '';
        mapClear.classList.remove('visible');
        mapResults.classList.remove('visible');
        supprimerMarqueurRecherche();
    });

    // Fermer résultats carte au clic ailleurs
    document.addEventListener('click', e => {
        if (!e.target.closest('.map-search')) mapResults.classList.remove('visible');
    });

    // === RECHERCHE DANS LA MODALE ===
    const modalInput = document.getElementById('input-recherche');
    const modalResults = document.getElementById('modal-search-results');
    const spinner = document.getElementById('search-spinner');

    modalInput.addEventListener('input', () => {
        rechercheDebounce(modalInput.value.trim(), modalResults, (result) => {
            selectionnerLieuRecherche(result);
        }, spinner);
    });

    // Bouton "Changer" dans le sélecteur de lieu
    document.getElementById('btn-changer-lieu').addEventListener('click', () => {
        document.getElementById('lieu-selectionne').style.display = 'none';
        document.getElementById('input-recherche').parentElement.parentElement.style.display = '';
        document.getElementById('input-lat').value = '';
        document.getElementById('input-lon').value = '';
        localisationSelectionnee = '';
        sourceSelectionnee = '';
        document.getElementById('input-recherche').value = '';
        document.getElementById('input-recherche').focus();
    });

    // Fermer résultats modale au clic ailleurs
    document.addEventListener('click', e => {
        if (!e.target.closest('.form-group') || !e.target.closest('#input-recherche')) {
            modalResults.classList.remove('visible');
        }
    });
}

/**
 * Sélectionner un lieu depuis les résultats de recherche (modale)
 */
function selectionnerLieuRecherche(result) {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const nom = nomCourt(result);

    // Remplir les champs cachés
    document.getElementById('input-lat').value = lat;
    document.getElementById('input-lon').value = lon;

    // Pré-remplir le nom si vide
    if (!document.getElementById('input-nom').value.trim()) {
        document.getElementById('input-nom').value = nom;
    }

    // Auto-détection de catégorie
    const t = result.type || '';
    const c = result.class || '';
    if (c === 'tourism' && t === 'museum') {
        document.getElementById('input-categorie').value = 'Musée';
    } else if (t === 'castle' || t === 'monument' || t === 'memorial') {
        document.getElementById('input-categorie').value = 'Monument';
    } else if (c === 'historic') {
        document.getElementById('input-categorie').value = 'Site historique';
    }

    // Afficher le lieu sélectionné
    document.getElementById('lieu-selectionne-nom').textContent = nom;
    localisationSelectionnee = localisationCourte(result);
    sourceSelectionnee = identifiantRecherche(result);
    document.getElementById('lieu-selectionne-adresse').textContent = localisationSelectionnee;
    document.getElementById('lieu-selectionne').style.display = 'flex';

    // Masquer le champ de recherche
    document.getElementById('input-recherche').parentElement.parentElement.style.display = 'none';

    // Centrer la carte
    map.setView([lat, lon], 16, { animate: true });

    // Placer un marqueur de prévisualisation
    supprimerMarqueurPreview();
    marqueurPreview = L.marker([lat, lon], {
        icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="width:40px;height:40px;background:var(--primary,#185FA5);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 14px rgba(24,95,165,0.4);border:3px solid white;animation:pulse 1.5s ease infinite;"><span style="font-size:18px;">📍</span></div>`,
            iconSize: [40, 40], iconAnchor: [20, 20]
        })
    }).addTo(map);
}

function supprimerMarqueurPreview() {
    if (marqueurPreview) { map.removeLayer(marqueurPreview); marqueurPreview = null; }
}

// === MODALE AJOUT ===
function ouvrirModalAjout(lat, lon, nom, localisation, sourceId) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = 'Ajouter un lieu';
    document.getElementById('input-id').value = '';
    localisationSelectionnee = localisation || '';
    sourceSelectionnee = sourceId || '';
    overlay.classList.add('visible');

    if (lat !== undefined && lon !== undefined) {
        document.getElementById('input-lat').value = lat;
        document.getElementById('input-lon').value = lon;

        if (nom) {
            // Résultat de recherche → afficher le lieu sélectionné
            document.getElementById('lieu-selectionne-nom').textContent = nom;
            document.getElementById('lieu-selectionne-adresse').textContent = localisationSelectionnee;
            document.getElementById('lieu-selectionne').style.display = 'flex';
            document.getElementById('input-recherche').parentElement.parentElement.style.display = 'none';
            if (!document.getElementById('input-nom').value.trim()) {
                document.getElementById('input-nom').value = nom;
            }
        } else {
            // Clic droit → la ville et le pays ne sont pas connus.
            document.getElementById('lieu-selectionne-nom').textContent = 'Position personnalisée';
            document.getElementById('lieu-selectionne-adresse').textContent = 'Lieu choisi sur la carte';
            document.getElementById('lieu-selectionne').style.display = 'flex';
            document.getElementById('input-recherche').parentElement.parentElement.style.display = 'none';
        }
    }

    setTimeout(() => document.getElementById('input-nom').focus(), 100);
}

function fermerModalAjout() {
    document.getElementById('modal-overlay').classList.remove('visible');
    document.getElementById('form-lieu').reset();
    actualiserJoursVisite();
    photoUploadPath = '';
    localisationSelectionnee = '';
    sourceSelectionnee = '';
    document.getElementById('upload-preview').classList.remove('visible');
    document.getElementById('upload-preview').src = '';
    document.getElementById('upload-placeholder').style.display = '';
    // Réinitialiser la recherche
    document.getElementById('lieu-selectionne').style.display = 'none';
    document.getElementById('input-recherche').value = '';
    document.getElementById('input-recherche').parentElement.parentElement.style.display = '';
    document.getElementById('modal-search-results').classList.remove('visible');
    document.getElementById('input-lat').value = '';
    document.getElementById('input-lon').value = '';
    document.getElementById('input-id').value = '';
    document.getElementById('modal-title').textContent = 'Ajouter un lieu';
    supprimerMarqueurPreview();
}

async function soumettreFormulaire() {
    let date;
    try { date = lireDateVisite(); }
    catch (err) { afficherToast(`⚠️ ${err.message}`); return; }
    const id = document.getElementById('input-id').value;
    const donnees = {
        name: document.getElementById('input-nom').value.trim(),
        category: document.getElementById('input-categorie').value,
        date,
        note: document.getElementById('input-note').value.trim(),
        lat: document.getElementById('input-lat').value,
        lon: document.getElementById('input-lon').value,
        locality: localisationSelectionnee,
        sourceId: sourceSelectionnee,
        photo: photoUploadPath
    };
    if (!donnees.name) { afficherToast('⚠️ Le nom du lieu est obligatoire'); return; }
    if (!donnees.lat || !donnees.lon) { afficherToast('⚠️ Veuillez rechercher et sélectionner un lieu'); return; }
    supprimerMarqueurPreview();
    if (id) {
        await modifierLieu(id, donnees);
    } else {
        await ajouterLieu(donnees);
    }
    fermerModalAjout();
}

function editerLieu(id) {
    const lieu = lieux.find(l => l.id === id);
    if (!lieu) return;
    
    document.getElementById('input-id').value = lieu.id;
    document.getElementById('input-nom').value = lieu.name;
    document.getElementById('input-categorie').value = lieu.category;
    
    remplirDateVisite(lieu.date);
    
    document.getElementById('input-note').value = lieu.note;
    document.getElementById('input-lat').value = lieu.lat;
    document.getElementById('input-lon').value = lieu.lon;
    
    if (lieu.photo) {
        photoUploadPath = lieu.photo;
        const p = document.getElementById('upload-preview');
        p.src = '/' + lieu.photo;
        p.classList.add('visible');
        document.getElementById('upload-placeholder').style.display = 'none';
    } else {
        photoUploadPath = '';
    }
    
    document.getElementById('lieu-selectionne-nom').textContent = lieu.name;
    localisationSelectionnee = lieu.locality || '';
    sourceSelectionnee = lieu.sourceId || '';
    document.getElementById('lieu-selectionne-adresse').textContent = localisationSelectionnee;
    document.getElementById('lieu-selectionne').style.display = 'flex';
    document.getElementById('input-recherche').parentElement.parentElement.style.display = 'none';
    
    document.getElementById('modal-title').textContent = 'Modifier le lieu';
    document.getElementById('modal-overlay').classList.add('visible');
}

function centrerSurLieu(id) {
    const lieu = lieux.find(l => l.id === id);
    if (!lieu) return;
    // Le lieu peut être masqué par un filtre de catégorie au moment de la recherche.
    if (!marqueurs[id]) {
        filtreActif = 'all';
        document.querySelectorAll('.filtre-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === 'all');
        });
        rafraichirAffichage();
    }
    map.setView([lieu.lat, lieu.lon], 16, { animate: true });
    if (marqueurs[id]) marqueurs[id].openPopup();
}

function demanderSuppression(id) {
    const lieu = lieux.find(l => l.id === id);
    if (!lieu) return;
    lieuASupprimer = id;
    document.getElementById('confirm-text').textContent =
        `Voulez-vous vraiment supprimer « ${lieu.name} » ? Cette action est irréversible.`;
    document.getElementById('modal-confirm').classList.add('visible');
}

function fermerModalConfirm() {
    document.getElementById('modal-confirm').classList.remove('visible');
    lieuASupprimer = null;
}

// === UTILITAIRES ===
function afficherToast(message) {
    const ex = document.querySelector('.toast');
    if (ex) ex.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = message;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('visible'));
    setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 300); }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function formatDateAffichage(dateStr) {
    if (!dateStr) return '';
    const date = decomposerDateVisite(dateStr);
    if (date.annee && date.mois) {
        const mois = MOIS_VISITE[Number(date.mois) - 1];
        if (mois) return `${date.jour ? Number(date.jour) + ' ' : ''}${mois.toLowerCase()} ${date.annee}`;
    }
    return dateStr;
}
