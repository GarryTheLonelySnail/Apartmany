document.addEventListener('DOMContentLoaded', () => {
    // Form Elements
    const formSectionTitle = document.querySelector('.form-section h2');
    const jmenoInput = document.getElementById('jmeno');
    const telefonInput = document.getElementById('telefon');
    const emailInput = document.getElementById('email');
    const cisloBytuSelect = document.getElementById('cisloBytu');
    const timeSelect = document.getElementById('time');
    const timeEndSelect = document.getElementById('time-end');
    const dateInput = document.getElementById('date');
    const zaplacenoSelect = document.getElementById('zaplaceno');
    const poznamkyInput = document.getElementById('poznamky');
    const addUserButton = document.getElementById('add-user');

    // List & Filter Elements
    const reservationsTbody = document.getElementById('reservations-tbody');
    const filterNameInput = document.getElementById('filter-name');
    const filterPhoneInput = document.getElementById('filter-phone');
    const filterEmailInput = document.getElementById('filter-email');

    // Message Elements
    const formErrorMessage = document.getElementById('form-error-message');
    const formSuccessMessage = document.getElementById('form-success-message');

    // Pagination & Rows per Page Elements
    const rowsSelect = document.getElementById('rows-select');
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const pageInfoSpan = document.getElementById('page-info');

    const API_BASE_URL = 'https://apartmany.onrender.com'; // Zkontrolujte tuto URL!

    let allUsers = [];
    let filteredAndSortedUsers = [];
    let currentPage = 1;
    let rowsPerPage = parseInt(rowsSelect.value, 10);

    // --- Initialization ---
    function populateZoneSelect() {
        cisloBytuSelect.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = ""; defaultOption.textContent = "Zvolte zónu";
        defaultOption.selected = true; defaultOption.disabled = true;
        cisloBytuSelect.appendChild(defaultOption);
        for (let i = 1; i <= 18; i++) {
            const option = document.createElement('option');
            option.value = i; option.textContent = `Zóna ${i}`;
            cisloBytuSelect.appendChild(option);
        }
    }

    function populateTimeSelects() {
        const timePickers = [timeSelect, timeEndSelect];
        timePickers.forEach(picker => {
            picker.innerHTML = '';
            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.textContent = picker === timeSelect ? "Vyberte začátek" : "Vyberte konec";
            defaultOption.selected = true; defaultOption.disabled = true;
            picker.appendChild(defaultOption);
            const startHour = 0; const endHour = 23;
            for (let hour = startHour; hour <= endHour; hour++) {
                for (let minute of ['00', '30']) {
                    const timeValue = `${String(hour).padStart(2, '0')}:${minute}`;
                    const option = document.createElement('option');
                    option.value = timeValue; option.textContent = timeValue;
                    picker.appendChild(option);
                }
            }
        });
    }

    populateZoneSelect();
    populateTimeSelects();

    // --- Display Logic ---
    function updatePaginatedView() {
        filteredAndSortedUsers.sort((a, b) => {
            const dateTimeA = new Date(`${a.date}T${a.time || '00:00'}`);
            const dateTimeB = new Date(`${b.date}T${b.time || '00:00'}`);
            if (isNaN(dateTimeA) || isNaN(dateTimeB)) return 0;
            return dateTimeA - dateTimeB;
        });

        const totalRows = filteredAndSortedUsers.length;
        const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
        currentPage = Math.max(1, Math.min(currentPage, totalPages));

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const usersToDisplay = filteredAndSortedUsers.slice(startIndex, endIndex);

        renderTableRows(usersToDisplay);
        renderPaginationControls(totalPages);
    }

    function renderTableRows(usersToDisplay) {
        reservationsTbody.innerHTML = '';
        const colCount = 9;

        if (usersToDisplay.length === 0 && allUsers.length > 0) {
             const row = reservationsTbody.insertRow();
             const cell = row.insertCell();
             cell.colSpan = colCount;
             cell.textContent = 'Nebyly nalezeny žádné rezervace odpovídající filtru.';
             cell.style.textAlign = 'center'; cell.style.fontStyle = 'italic'; cell.style.padding = '20px';
             return;
        } else if (usersToDisplay.length === 0) {
             const row = reservationsTbody.insertRow();
             const cell = row.insertCell();
             cell.colSpan = colCount;
             cell.textContent = 'Načítání rezervací...';
             cell.style.textAlign = 'center'; cell.style.fontStyle = 'italic'; cell.style.padding = '20px';
             return;
        }

        usersToDisplay.forEach(user => {
            const row = reservationsTbody.insertRow();
            // Přidání tříd pro barvení celého řádku
            row.classList.remove('status-row-arrived', 'status-row-not-arrived'); // Reset
            if (user.zaplaceno === 'Dostavil se') {
                row.classList.add('status-row-arrived');
            } else if (user.zaplaceno === 'Nedostavil se') {
                row.classList.add('status-row-not-arrived');
            }

            let formattedDate = user.date;
            try {
                if (user.date) {
                    const dateObj = new Date(user.date + 'T00:00:00');
                    if (!isNaN(dateObj)) {
                        formattedDate = dateObj.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    }
                }
            } catch (e) { console.error("Date formatting error", e); formattedDate = user.date; }

            row.insertCell().textContent = user.jmeno || 'N/A';
            row.insertCell().textContent = user.telefon || 'N/A';
            row.insertCell().textContent = user.email || 'N/A';
            row.insertCell().textContent = user.cisloBytu ? `Zóna ${user.cisloBytu}` : 'N/A';
            row.insertCell().textContent = formattedDate || 'N/A';
            row.insertCell().textContent = user.time ? user.time.substring(0, 5) : 'N/A';
            row.insertCell().textContent = user.timeEnd ? user.timeEnd.substring(0, 5) : 'N/A';

            const statusCell = row.insertCell();
            statusCell.textContent = user.zaplaceno || 'Dostavil se'; // Text zůstává, barva je na řádku

            const notesCell = row.insertCell();
            const noteText = user.poznamky || '';
            notesCell.textContent = noteText.length > 30 ? noteText.substring(0, 27) + '...' : noteText;
            if (noteText.length > 30) { notesCell.title = noteText; }

            const actionCell = row.insertCell();
            actionCell.style.whiteSpace = 'nowrap';
            const editButton = document.createElement('button');
            editButton.textContent = 'Editovat';
            editButton.classList.add('btn', 'btn-edit');
            editButton.addEventListener('click', () => {
                populateFormForEdit(user);
                document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            actionCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Smazat';
            deleteButton.classList.add('btn', 'btn-danger');
            deleteButton.addEventListener('click', () => {
                if (confirm(`Opravdu chcete smazat rezervaci pro "${user.jmeno}" (${formattedDate || user.date})?`)) {
                    deleteReservation(user.id);
                }
            });
            actionCell.appendChild(deleteButton);
        });
    }

    function renderPaginationControls(totalPages) {
        pageInfoSpan.textContent = `Stránka ${currentPage} z ${totalPages}`;
        prevPageButton.disabled = (currentPage === 1);
        nextPageButton.disabled = (currentPage === totalPages);
    }

    // --- Event Listeners for Controls ---
    rowsSelect.addEventListener('change', () => {
        rowsPerPage = parseInt(rowsSelect.value, 10);
        currentPage = 1;
        updatePaginatedView();
    });
    prevPageButton.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; updatePaginatedView(); }
    });
    nextPageButton.addEventListener('click', () => {
         const totalPages = Math.ceil(filteredAndSortedUsers.length / rowsPerPage) || 1;
        if (currentPage < totalPages) { currentPage++; updatePaginatedView(); }
    });

    // --- Form Handling & API Calls ---
    function setInputError(inputElement, isError) {
        if (isError) { inputElement.style.borderColor = 'red'; inputElement.classList.add('input-error'); }
        else { inputElement.style.borderColor = ''; inputElement.classList.remove('input-error'); }
    }
    function showFormError(message) {
        formErrorMessage.textContent = message; formErrorMessage.style.display = 'block';
        formSuccessMessage.style.display = 'none';
    }
    function hideFormError() { formErrorMessage.style.display = 'none'; }
    function showFormSuccess(message) {
        formSuccessMessage.textContent = message; formSuccessMessage.style.display = 'block';
        formErrorMessage.style.display = 'none';
        setTimeout(() => { hideFormSuccess(); }, 4000);
    }
    function hideFormSuccess() { formSuccessMessage.style.display = 'none'; }

    function populateFormForEdit(user) {
        hideFormError(); hideFormSuccess();
        jmenoInput.value = user.jmeno;
        telefonInput.value = user.telefon;
        emailInput.value = user.email || "";
        cisloBytuSelect.value = user.cisloBytu || "";
        timeSelect.value = user.time || "";
        timeEndSelect.value = user.timeEnd || "";
        dateInput.value = user.date;
        zaplacenoSelect.value = user.zaplaceno || 'Dostavil se';
        poznamkyInput.value = user.poznamky || "";

        formSectionTitle.textContent = 'Upravit rezervaci';
        addUserButton.textContent = 'Uložit změny';
        addUserButton.onclick = () => saveUserChanges(user.id);
    }

    function resetForm() {
        jmenoInput.value = ''; telefonInput.value = ''; emailInput.value = '';
        populateZoneSelect();
        populateTimeSelects();
        dateInput.value = '';
        zaplacenoSelect.value = 'Dostavil se';
        poznamkyInput.value = '';

        formSectionTitle.textContent = 'Přidat rezervaci';
        addUserButton.textContent = 'Přidat rezervaci';
        addUserButton.onclick = addUser;

        setInputError(jmenoInput, false); setInputError(telefonInput, false); setInputError(emailInput, false);
        setInputError(cisloBytuSelect, false); setInputError(timeSelect, false); setInputError(timeEndSelect, false);
        setInputError(dateInput, false); setInputError(zaplacenoSelect, false);
        hideFormError(); hideFormSuccess();
    }

    function validateForm(data) {
         let hasError = false;
         setInputError(jmenoInput, false); setInputError(telefonInput, false); setInputError(emailInput, false);
         setInputError(cisloBytuSelect, false); setInputError(timeSelect, false); setInputError(timeEndSelect, false);
         setInputError(dateInput, false); setInputError(zaplacenoSelect, false);

         if (!data.jmeno) { setInputError(jmenoInput, true); hasError = true; }
         if (!data.telefon) { setInputError(telefonInput, true); hasError = true; }
         if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            setInputError(emailInput, true); hasError = true;
            if (!(hasError && ( !data.jmeno || !data.telefon || !data.cisloBytu || !data.time || !data.timeEnd || !data.date || !data.zaplaceno ) )) {
                 showFormError('Zadejte platný formát e-mailu nebo nechte pole prázdné.');
                 showFormError.calledForEmailFormat = true;
            }
         } else {
            showFormError.calledForEmailFormat = false;
         }
         if (!data.cisloBytu) { setInputError(cisloBytuSelect, true); hasError = true; }
         if (!data.time) { setInputError(timeSelect, true); hasError = true; }
         if (!data.timeEnd) { setInputError(timeEndSelect, true); hasError = true; }
         if (!data.date) { setInputError(dateInput, true); hasError = true; }
         if (!data.zaplaceno) { setInputError(zaplacenoSelect, true); hasError = true; }

        if (hasError && !showFormError.calledForEmailFormat) {
             showFormError('Prosím vyplňte všechna povinná pole (*) a opravte chyby.');
        }
        return !hasError;
    }
    showFormError.calledForEmailFormat = false;

    async function addUser() {
        const newUser = {
            jmeno: jmenoInput.value.trim(),
            telefon: telefonInput.value.trim(),
            email: emailInput.value.trim(),
            cisloBytu: cisloBytuSelect.value,
            time: timeSelect.value,
            timeEnd: timeEndSelect.value,
            date: dateInput.value,
            zaplaceno: zaplacenoSelect.value,
            poznamky: poznamkyInput.value.trim()
        };

        if (!validateForm(newUser)) { return; }
        hideFormError();
        console.log('Odesílání (POST):', newUser);
        try {
            const response = await fetch(`${API_BASE_URL}/uzivatele`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });
            if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(`Nepodařilo se přidat rezervaci: ${response.status} ${response.statusText} ${errorData.error || ''}`); }
            await fetchUsers();
            resetForm(); showFormSuccess('Rezervace byla úspěšně přidána.');
        } catch (error) { console.error('Chyba při přidávání rezervace:', error); showFormError(`Chyba při ukládání: ${error.message}`); }
    }

    async function saveUserChanges(userId) {
        const updatedUser = {
            jmeno: jmenoInput.value.trim(),
            telefon: telefonInput.value.trim(),
            email: emailInput.value.trim(),
            cisloBytu: cisloBytuSelect.value,
            time: timeSelect.value,
            timeEnd: timeEndSelect.value,
            date: dateInput.value,
            zaplaceno: zaplacenoSelect.value,
            poznamky: poznamkyInput.value.trim()
        };
        if (!validateForm(updatedUser)) { return; }
        hideFormError();
        console.log(`Odesílání (PUT) pro ID ${userId}:`, updatedUser);
        try {
            const response = await fetch(`${API_BASE_URL}/uzivatele/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedUser) });
            if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(`Nepodařilo se aktualizovat rezervaci: ${response.status} ${response.statusText} ${errorData.error || ''}`); }
            await fetchUsers();
            resetForm(); showFormSuccess('Změny byly úspěšně uloženy.');
        } catch (error) { console.error('Chyba při aktualizaci rezervace:', error); showFormError(`Chyba při ukládání: ${error.message}`); }
    }

     async function deleteReservation(userId) {
        console.log(`Pokus o smazání rezervace ID: ${userId}`); showFormSuccess(''); hideFormError();
        try {
            const response = await fetch(`${API_BASE_URL}/uzivatele/${userId}`, { method: 'DELETE' });
            if (response.ok || response.status === 204) {
                 console.log(`Rezervace ID: ${userId} úspěšně smazána.`);
                 await fetchUsers();
                 showFormSuccess('Rezervace byla úspěšně smazána.');
                 if (addUserButton.textContent === 'Uložit změny') { const handlerString = addUserButton.onclick ? addUserButton.onclick.toString() : ''; const match = handlerString.match(/saveUserChanges\((\d+)\)/); if (match && parseInt(match[1]) === userId) { console.log('Resetting form because the deleted item was being edited.'); resetForm(); } }
            } else { const errorData = await response.json().catch(() => ({ error: `Chyba serveru (${response.status})` })); throw new Error(errorData.error || `Nepodařilo se smazat rezervaci (${response.status})`); }
        } catch (error) { console.error('Chyba při mazání rezervace:', error); showFormError(`Chyba při mazání: ${error.message}`); }
    }

    // --- Filtering ---
    function applyFilter() {
        const filterNameValue = filterNameInput.value.toLowerCase().trim();
        const filterPhoneValue = filterPhoneInput.value.toLowerCase().replace(/\s/g, '').trim();
        const filterEmailValue = filterEmailInput.value.toLowerCase().trim();

        filteredAndSortedUsers = allUsers.filter(user => {
            const nameMatch = user.jmeno.toLowerCase().includes(filterNameValue);
            const phoneMatch = (user.telefon || '').toLowerCase().replace(/\s/g, '').includes(filterPhoneValue);
            const emailMatch = (user.email || '').toLowerCase().includes(filterEmailValue);
            return nameMatch && phoneMatch && emailMatch;
        });
        currentPage = 1;
        updatePaginatedView();
    }

    filterNameInput.addEventListener('input', applyFilter);
    filterPhoneInput.addEventListener('input', applyFilter);
    filterEmailInput.addEventListener('input', applyFilter);

    // --- Initial Load ---
    async function fetchUsers() {
        console.log(`Načítání dat z: ${API_BASE_URL}/uzivatele`);
        try {
            const response = await fetch(`${API_BASE_URL}/uzivatele`);
            if (!response.ok) {
                throw new Error(`Nepodařilo se načíst rezervace: ${response.status} ${response.statusText} (URL: ${response.url})`);
            }
            const data = await response.json();
            console.log('Načtené rezervace:', data);
            allUsers = data;
            applyFilter();
        } catch (error) {
            console.error('Chyba při načítání rezervací:', error);
            reservationsTbody.innerHTML = `<tr><td colspan="9" style="color: red; text-align: center; padding: 20px;">Chyba při načítání dat. Zkontrolujte konzoli a backend (${error.message}).</td></tr>`;
            pageInfoSpan.textContent = 'Chyba';
            prevPageButton.disabled = true;
            nextPageButton.disabled = true;
        }
    }

    addUserButton.onclick = addUser;
    fetchUsers();

}); // End DOMContentLoaded
