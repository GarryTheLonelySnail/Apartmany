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
    storage: '/data/apartmany.db', // Cesta na perzistentním disku Renderu
    logging: console.log // Zapne logování SQL dotazů pro ladění na Renderu
});

// --- Definice modelu Uzivatel (s novými sloupci email a timeEnd) ---
const Uzivatel = sequelize.define('uzivatel', {
    jmeno: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    telefon: {
         type: DataTypes.STRING,
         allowNull: false
    },
    zaplaceno: { // Název sloupce zůstává 'zaplaceno', ukládá 'Dostavil se' / 'Nedostavil se'
        type: DataTypes.STRING,
        defaultValue: 'Dostavil se' // VÝCHOZÍ HODNOTA ZMĚNĚNA
    },
    poznamky: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    cisloBytu: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    time: { // Začátek rezervace
        type: DataTypes.TIME,
        allowNull: false
    },
    timeEnd: { // Konec rezervace
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

// --- DOČASNĚ ODKOMENTUJTE TENTO BLOK POUZE PRO JEDNO NASAZENÍ NA RENDER ---
// --- ABY SE AKTUALIZOVALO SCHÉMA DATABÁZE (PŘIDALY/UPRAVILY SLOUPCE) ---
sequelize.sync({ alter: true })
    .then(() => {
        console.log('<<<<< RENDER DEPLOY (SYNC): Tabulka "uzivatele" na /data/apartmany.db by měla být aktualizována (alter:true). >>>>>');
        console.log('<<<<< RENDER DEPLOY (SYNC): Zkontrolujte logy pro SQL příkazy jako ALTER TABLE. >>>>>');
        console.log('<<<<< RENDER DEPLOY (SYNC): PO ÚSPĚŠNÉM NASAZENÍ TENTO BLOK ZNOVU ZAKOMENTUJTE v server.js a commitněte změnu! >>>>>');
    })
    .catch(err => {
        console.error('<<<<< RENDER DEPLOY (SYNC): Chyba při synchronizaci databáze:', err);
    });
// --- KONEC DOČASNÉ ČÁSTI ---


// --- API Endpoints ---
// GET /uzivatele
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
        console.error("RENDER LOG: Chyba při načítání uživatelů:", err);
        res.status(500).json({ error: 'Nastala chyba při načítání rezervací.' });
    }
});

// POST /uzivatele
app.post('/uzivatele', async (req, res) => {
    try {
        console.log('RENDER LOG: Přijatá data pro novou rezervaci:', req.body);
        if (!req.body.jmeno || !req.body.telefon || !req.body.cisloBytu || !req.body.time || !req.body.date || !req.body.timeEnd || !req.body.zaplaceno) {
             return res.status(400).json({ error: 'Chybí povinné údaje (jmeno, telefon, cisloBytu, time, date, timeEnd, zaplaceno).' });
        }
        if (req.body.email && typeof req.body.email === 'string' && req.body.email.trim() !== '') {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
                return res.status(400).json({ error: 'Neplatný formát e-mailu.' });
            }
        }
        const uzivatel = await Uzivatel.create(req.body);
        res.status(201).json(uzivatel);
    } catch (err) {
        console.error('RENDER LOG: Chyba při vytváření rezervace:', err);
         if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
             return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
         }
        res.status(500).json({ error: 'Nastala chyba při ukládání rezervace.' });
    }
});

// PUT /uzivatele/:id
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
        const [numberOfAffectedRows] = await Uzivatel.update(req.body, { where: { id: userId } });
        if (numberOfAffectedRows > 0) {
            const updatedUser = await Uzivatel.findByPk(userId);
            res.json(updatedUser);
        } else {
            res.status(404).json({ error: 'Rezervace nenalezena pro aktualizaci.' });
        }
    } catch (err) {
        console.error(`RENDER LOG: Chyba při aktualizaci rezervace ID ${req.params.id}:`, err);
        res.status(500).json({ error: 'Nastala chyba při aktualizaci rezervace.' });
    }
});

// DELETE /uzivatele/:id
app.delete('/uzivatele/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const deleted = await Uzivatel.destroy({ where: { id: userId } });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Rezervace nenalezena.' });
        }
    } catch (err) {
        console.error(`RENDER LOG: Chyba při mazání rezervace ID ${req.params.id}:`, err);
        res.status(500).json({ error: 'Nastala chyba při mazání rezervace.' });
    }
});


// --- Spuštění serveru ---
app.listen(port, () => {
    console.log(`Server běží na portu ${port}. Přístup přes veřejnou URL Renderu.`);
    // Následující řádek odkomentujte až po finálním zakomentování sequelize.sync() bloku
    // console.log('POZN: sequelize.sync() je deaktivováno pro běžný provoz.');
});
