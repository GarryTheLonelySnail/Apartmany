import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Uzivatele() {
    const [uzivatele, setUzivatele] = useState([]);

    useEffect(() => {
        axios.get('http://localhost:5000/uzivatele')
            .then(res => setUzivatele(res.data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <table>
                <thead>
                    <tr>
                        <th>Jméno</th>
                        <th>Email</th>
                        <th>Zaplaceno</th>
                        <th>Poznámky</th>
                    </tr>
                </thead>
                <tbody>
                    {uzivatele.map(uzivatel => (
                        <tr key={uzivatel.id}>
                            <td>{uzivatel.jmeno}</td>
                            <td>{uzivatel.email}</td>
                            <td>{uzivatel.zaplaceno ? 'Ano' : 'Ne'}</td>
                            <td>{uzivatel.poznamky}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default Uzivatele;