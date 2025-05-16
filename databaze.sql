"C:\Users\marti\Downloads\sqlite-tools-win-x64-3490100\sqlite3.exe" apartmany.db
CREATE TABLE uzivatele (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jmeno VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefon VARCHAR(255),
    zaplaceno VARCHAR(50) DEFAULT 'Nezaplaceno',
    poznamky TEXT,
    cisloBytu INTEGER,
    time TIME,
    date DATE
);