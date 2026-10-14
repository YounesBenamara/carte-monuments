/**
 * Serveur local — Ma Carte des Monuments
 * Lancement : node server.js → http://localhost:3000
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

// --- Chemins ---
const DATA_DIR = path.join(__dirname, 'data');
const PHOTOS_DIR = path.join(DATA_DIR, 'photos');
const MONUMENTS_FILE = path.join(DATA_DIR, 'monuments.json');

// --- Création des dossiers ---
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });
if (!fs.existsSync(MONUMENTS_FILE)) fs.writeFileSync(MONUMENTS_FILE, '[]', 'utf-8');

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data/photos', express.static(PHOTOS_DIR));

// --- Multer (upload photos) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, PHOTOS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
        cb(null, `${Date.now()}_${base}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (['image/jpeg','image/png','image/gif','image/webp'].includes(file.mimetype)) cb(null, true);
        else cb(new Error('Type non supporté. Utilisez JPG, PNG, GIF ou WebP.'));
    }
});

// --- Utilitaires ---
function lireLieux() {
    try { return JSON.parse(fs.readFileSync(MONUMENTS_FILE, 'utf-8')); }
    catch { return []; }
}
function sauvegarderLieux(lieux) {
    fs.writeFileSync(MONUMENTS_FILE, JSON.stringify(lieux, null, 2), 'utf-8');
}

// --- API ---
app.get('/api/places', (req, res) => res.json(lireLieux()));

app.post('/api/places', (req, res) => {
    const lieux = lireLieux();
    const { name, category, date, note, lat, lon, photo, locality, sourceId } = req.body;
    if (!name || !lat || !lon) return res.status(400).json({ error: 'Nom, latitude et longitude obligatoires.' });
    const lieu = {
        id: String(Date.now()),
        name: name.trim(), category: category || 'Autre',
        date: date || '', note: note || '',
        lat: parseFloat(lat), lon: parseFloat(lon),
        photo: photo || '',
        locality: typeof locality === 'string' ? locality.trim() : '',
        sourceId: typeof sourceId === 'string' ? sourceId.trim() : ''
    };
    lieux.push(lieu);
    sauvegarderLieux(lieux);
    console.log(`✅ Ajouté : "${lieu.name}"`);
    res.status(201).json(lieu);
});

app.put('/api/places/:id', (req, res) => {
    let lieux = lireLieux();
    const index = lieux.findIndex(l => l.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Lieu non trouvé.' });
    
    const { name, category, date, note, lat, lon, photo, locality, sourceId } = req.body;
    if (!name || !lat || !lon) return res.status(400).json({ error: 'Nom, latitude et longitude obligatoires.' });

    const oldPhoto = lieux[index].photo;
    if (photo !== undefined && photo !== oldPhoto && oldPhoto) {
        const p = path.join(__dirname, oldPhoto);
        if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    
    lieux[index] = {
        ...lieux[index],
        name: name.trim(), 
        category: category || 'Autre',
        date: date || '', 
        note: note || '',
        lat: parseFloat(lat), 
        lon: parseFloat(lon),
        photo: photo !== undefined ? photo : lieux[index].photo,
        locality: typeof locality === 'string' ? locality.trim() : (lieux[index].locality || ''),
        sourceId: typeof sourceId === 'string' ? sourceId.trim() : (lieux[index].sourceId || '')
    };

    sauvegarderLieux(lieux);
    console.log(`✏️ Modifié : "${lieux[index].name}"`);
    res.json(lieux[index]);
});

app.delete('/api/places/:id', (req, res) => {
    let lieux = lireLieux();
    const lieu = lieux.find(l => l.id === req.params.id);
    if (!lieu) return res.status(404).json({ error: 'Lieu non trouvé.' });
    if (lieu.photo) {
        const p = path.join(__dirname, lieu.photo);
        if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    lieux = lieux.filter(l => l.id !== req.params.id);
    sauvegarderLieux(lieux);
    console.log(`🗑️ Supprimé : "${lieu.name}"`);
    res.json({ message: 'Supprimé.', id: req.params.id });
});

app.post('/api/upload', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucune photo.' });
    res.json({ path: `data/photos/${req.file.filename}` });
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE')
        return res.status(400).json({ error: 'Photo trop volumineuse (max 10 Mo).' });
    if (err) return res.status(400).json({ error: err.message });
    next();
});

app.listen(PORT, () => {
    console.log(`\n🏛️  Ma Carte des Monuments — http://localhost:${PORT}\n`);
});
