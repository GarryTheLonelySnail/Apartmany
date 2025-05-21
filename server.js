// server.js

// --- Importy modulů ---
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// --- Nastavení aplikace Express ---
const app = express();
const port = process.env.PORT || 5000;

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
    logging: console.log // Zapne logování SQL dotazů pro ladění na Renderu (můžete nastavit na false v produkci)
});

// --- Definice modelu Uzivatel ---
const Uzivatel = sequelize.define('uzivatel', {
    jmeno: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true, // Povoluje NULL v databázi
        validate: {
            isEmail: true // Validuje formát, POKUD je hodnota zadána (ne NULL)
        }
    },
    telefon: {
         type: DataTypes.STRING,
         allowNull: false
    },
    zaplaceno: {
        type: DataTypes.STRING,
        defaultValue: 'Dostavil se'
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
    timeEnd: {
        type: DataTypes.TIME,
        allowNull: true,
        defaultValue: null
    },
    date: {
         type: DataTypes.DATEONLY,
         allowNull: false
    }
}, {
    tableName: 'uzivatele',
    timestamps: false
});

// --- Deaktivovaná synchronizace databáze pro běžný provoz ---
/*
sequelize.sync({ alter: true }) // NEBO force: true
    .then(() => {
        console.log('<<<<< RENDER DEPLOY (SYNC): Tabulka "uzivatele" ... >>>>>');
        console.log('<<<<< RENDER DEPLOY (SYNC): TENTO BLOK MUSÍ BÝT ZAKOMENTOVÁN PRO BĚŽNÝ PROVOZ! >>>>>');
    })
    .catch(err => {
        console.error('<<<<< RENDER DEPLOY (SYNC): Chyba při synchronizaci:', err);
    });
*/
// --- KONEC BLOKU PRO SYNCHRONIZACI ---


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
        const dataToCreate = { ...req.body };

        // Převod prázdného emailu na null pro správnou validaci a uložení
        if (dataToCreate.email !== undefined && dataToCreate.email.trim() === '') {
            dataToCreate.email = null;
        }

        // Základní validace povinných polí
        if (!dataToCreate.jmeno || !dataToCreate.telefon || !dataToCreate.cisloBytu || !dataToCreate.time || !dataToCreate.date || dataToCreate.timeEnd === undefined || !dataToCreate.zaplaceno) {
             return res.status(400).json({ error: 'Chybí povinné údaje (jmeno, telefon, cisloBytu, time, date, timeEnd, zaplaceno).' });
        }
        // Validace formátu emailu v modelu se uplatní, pokud dataToCreate.email není null

        const uzivatel = await Uzivatel.create(dataToCreate);
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
        const dataToUpdate = { ...req.body };

        // Převod prázdného emailu na null
        if (dataToUpdate.email !== undefined && dataToUpdate.email.trim() === '') {
            dataToUpdate.email = null;
        }

        // Základní validace povinných polí
        if (!dataToUpdate.jmeno || !dataToUpdate.telefon || !dataToUpdate.cisloBytu || !dataToUpdate.time || !dataToUpdate.date || dataToUpdate.timeEnd === undefined || !dataToUpdate.zaplaceno) {
             return res.status(400).json({ error: 'Chybí povinné údaje.' });
        }
        // Validace formátu emailu v modelu se uplatní, pokud dataToUpdate.email není null

        const [numberOfAffectedRows] = await Uzivatel.update(dataToUpdate, {
            where: { id: userId },
            individualHooks: true // Důležité pro spuštění validátorů i při update
        });

        if (numberOfAffectedRows > 0) {
            const updatedUser = await Uzivatel.findByPk(userId);
            res.json(updatedUser);
        } else {
            // Mohlo se stát, že záznam existoval, ale data byla stejná, takže update neproběhl.
            // Nebo záznam neexistoval. Pro jistotu vrátíme aktuální stav.
            const userExists = await Uzivatel.findByPk(userId);
            if (userExists) {
                res.json(userExists); // Data byla stejná, vracíme existující
            } else {
                res.status(404).json({ error: 'Rezervace nenalezena pro aktualizaci.' });
            }
        }
    } catch (err) {
        console.error(`RENDER LOG: Chyba při aktualizaci rezervace ID ${req.params.id}:`, err);
         if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
             return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
         }
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
    console.log('POZN: sequelize.sync() je deaktivováno pro běžný provoz.');
});
