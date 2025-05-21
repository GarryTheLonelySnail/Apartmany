// server.js

// --- Importy modulů ---
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// --- Nastavení aplikace Express ---
const app = express();
const port = process.env.PORT || 5000; // Pro Render.com a lokální vývoj

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// --- Hlavní cesta ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Připojení k databázi Sequelize ---
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.NODE_ENV === 'production' ? '/data/apartmany.db' : './apartmany.db', // Cesta pro Render a lokálně
    logging: process.env.NODE_ENV === 'production' ? false : console.log // Logování SQL jen lokálně
});

// --- Definice modelu Uzivatel ---
const Uzivatel = sequelize.define('uzivatel', {
    jmeno: { // Ponecháno jako 'jmeno', i když na frontendu je 'Označení'
        type: DataTypes.STRING,
        allowNull: false
    },
    email: { // NOVÉ POLE
        type: DataTypes.STRING,
        allowNull: true, // Může být null
        validate: {
            isEmail: true // Volitelná validace na straně serveru
        }
    },
    telefon: {
         type: DataTypes.STRING,
         allowNull: false
    },
    zaplaceno: { // Název sloupce zůstává 'zaplaceno', ale bude ukládat 'Dostavil se' / 'Nedostavil se'
        type: DataTypes.STRING,
        defaultValue: 'Nedostavil se'
    },
    poznamky: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    cisloBytu: { // Zóna
        type: DataTypes.INTEGER,
        allowNull: false
    },
    time: { // Začátek rezervace
        type: DataTypes.TIME,
        allowNull: false
    },
    timeEnd: { // NOVÉ POLE pro konec rezervace
        type: DataTypes.TIME,
        allowNull: false
    },
    date: {
         type: DataTypes.DATEONLY,
         allowNull: false
    }
}, {
    tableName: 'uzivatele',
    timestamps: false
});

// --- Synchronizace databáze (POUZE PRO VÝVOJ nebo JEDNORÁZOVÉ VYTVOŘENÍ/ÚPRAVU TABULKY) ---
// Pro produkci na Renderu by tento blok měl být zakomentován po prvotní inicializaci.
if (process.env.NODE_ENV !== 'production') { // Spustit sync jen pokud není produkce
    sequelize.sync({ alter: true }) // 'alter: true' se pokusí upravit tabulku, aby odpovídala modelu
        .then(() => {
            console.log('LOKÁLNÍ VÝVOJ: Databáze a tabulka "uzivatele" synchronizovány (alter:true).');
        })
        .catch(err => {
            console.error('LOKÁLNÍ VÝVOJ: Chyba synchronizace databáze:', err);
        });
}
// Pro první deploy na Render s novými sloupci byste mohli dočasně odkomentovat:
/*
if (process.env.NODE_ENV === 'production') {
    sequelize.sync({ alter: true })
        .then(() => {
            console.log('RENDER DEPLOY (SYNC): Tabulka "uzivatele" na /data/apartmany.db by měla být vytvořena/synchronizována.');
            console.log('RENDER DEPLOY (SYNC): PO ÚSPĚŠNÉM NASAZENÍ TENTO BLOK ZNOVU ZAKOMENTUJTE a commitněte změnu!');
        })
        .catch(err => {
            console.error('RENDER DEPLOY (SYNC): Chyba při synchronizaci:', err);
        });
}
*/
// --- Konec bloku pro synchronizaci ---


// --- API Endpoints ---

// GET /uzivatele - Načtení všech rezervací
app.get('/uzivatele', async (req, res) => {
    try {
        const uzivatele = await Uzivatel.findAll({
             order: [
                 ['date', 'ASC'],
                 ['time', 'ASC']
             ]
         });
        res.json(uzivatele);
    } catch (err) {
        console.error("Chyba při načítání uživatelů:", err);
        res.status(500).json({ error: 'Nastala chyba při načítání rezervací.' });
    }
});

// POST /uzivatele - Vytvoření nové rezervace
app.post('/uzivatele', async (req, res) => {
    try {
        console.log('Přijatá data pro novou rezervaci:', req.body);
        // Základní validace na serveru
        if (!req.body.jmeno || !req.body.telefon || !req.body.cisloBytu || !req.body.time || !req.body.date || !req.body.timeEnd || !req.body.zaplaceno) {
             return res.status(400).json({ error: 'Chybí povinné údaje (jmeno, telefon, cisloBytu, time, date, timeEnd, zaplaceno).' });
        }
        // Volitelná validace pro email, pokud je zadán
        if (req.body.email && typeof req.body.email === 'string' && req.body.email.trim() !== '') {
            // Jednoduchá kontrola formátu emailu (pro robustnější použijte knihovnu jako validator.js)
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
                return res.status(400).json({ error: 'Neplatný formát e-mailu.' });
            }
        }

        const uzivatel = await Uzivatel.create(req.body);
        res.status(201).json(uzivatel);
    } catch (err) {
        console.error('Chyba při vytváření rezervace:', err);
         if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
             return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
         }
        res.status(500).json({ error: 'Nastala chyba při ukládání rezervace.' });
    }
});

// PUT /uzivatele/:id - Aktualizace existující rezervace
app.put('/uzivatele/:id', async (req, res) => {
    try {
        const userId = req.params.id;
         if (!req.body.jmeno || !req.body.telefon || !req.body.cisloBytu || !req.body.time || !req.body.date || !req.body.timeEnd || !req.body.zaplaceno) {
             return res.status(400).json({ error: 'Chybí povinné údaje.' });
         }
        if (req.body.email && typeof req.body.email === 'string' && req.body.email.trim() !== '') {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
                return res.status(400).json({ error: 'Neplatný formát e-mailu.' });
            }
        }

        const [numberOfAffectedRows] = await Uzivatel.update(req.body, {
             where: { id: userId }
         });
        if (numberOfAffectedRows > 0) {
            const updatedUser = await Uzivatel.findByPk(userId);
            res.json(updatedUser);
        } else {
            res.status(404).json({ error: 'Rezervace nenalezena pro aktualizaci.' });
        }
    } catch (err) {
        console.error(`Chyba při aktualizaci rezervace ID ${req.params.id}:`, err);
         if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
             return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
         }
        res.status(500).json({ error: 'Nastala chyba při aktualizaci rezervace.' });
    }
});

// DELETE /uzivatele/:id - Smazání rezervace
app.delete('/uzivatele/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const deleted = await Uzivatel.destroy({
            where: { id: userId }
        });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Rezervace nenalezena.' });
        }
    } catch (err) {
        console.error(`Chyba při mazání rezervace ID ${req.params.id}:`, err);
        res.status(500).json({ error: 'Nastala chyba při mazání rezervace.' });
    }
});

// --- Spuštění serveru ---
app.listen(port, () => {
    console.log(`Server běží na portu ${port}. Přístup přes veřejnou URL Renderu nebo http://localhost:${port} pro lokální vývoj.`);
    if (process.env.NODE_ENV === 'production' || !process.env.NODE_ENV) { // Pokud je produkce nebo NODE_ENV není nastaven
        console.log('POZN: sequelize.sync() je deaktivováno pro běžný provoz.');
    }
});
