// --- Importy modulů ---
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// --- Nastavení aplikace Express ---
const app = express();
const port = 5000;

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
    storage: 'C:\\Users\\marti\\apartmany.db' // !! ZKONTROLUJTE SPRÁVNOST TÉTO CESTY !!
});

// --- Definice modelu Uzivatel ---
const Uzivatel = sequelize.define('uzivatel', {
    jmeno: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    telefon: {
         type: DataTypes.STRING,
         allowNull: false
    },
    zaplaceno: {
        type: DataTypes.STRING,
        defaultValue: 'Nezaplaceno'
    },
    poznamky: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    cisloBytu: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    date: {
         type: DataTypes.DATEONLY,
         allowNull: false
    }
}, {
    tableName: 'uzivatele',   // Explicitně definovaný název tabulky
    timestamps: false
});

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
        if (!req.body.jmeno || !req.body.telefon || !req.body.cisloBytu || !req.body.time || !req.body.date) {
             return res.status(400).json({ error: 'Chybí povinné údaje.' });
        }
        const uzivatel = await Uzivatel.create(req.body);
        res.status(201).json(uzivatel);
    } catch (err) {
        console.error('Chyba při vytváření rezervace:', err);
         if (err.name === 'SequelizeValidationError') {
             return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
         }
        res.status(500).json({ error: 'Nastala chyba při ukládání rezervace.' });
    }
});

// PUT /uzivatele/:id - Aktualizace existující rezervace
app.put('/uzivatele/:id', async (req, res) => {
    try {
        const userId = req.params.id;
         if (!req.body.jmeno || !req.body.telefon || !req.body.cisloBytu || !req.body.time || !req.body.date) {
             return res.status(400).json({ error: 'Chybí povinné údaje.' });
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
         if (err.name === 'SequelizeValidationError') {
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
    console.log(`Server běží na http://localhost:${port}`);
    console.log('POZN: sequelize.sync() je deaktivováno pro běžný provoz.');
});