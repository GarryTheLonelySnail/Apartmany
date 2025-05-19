document.addEventListener('DOMContentLoaded', () => {
    // Form Elements
    const formSectionTitle = document.querySelector('.form-section h2');
    const jmenoInput = document.getElementById('jmeno');
    const telefonInput = document.getElementById('telefon');
    const cisloBytuSelect = document.getElementById('cisloBytu');
    const timeSelect = document.getElementById('time');
    const dateInput = document.getElementById('date');
    const zaplacenoSelect = document.getElementById('zaplaceno');
    const poznamkyInput = document.getElementById('poznamky');
    const addUserButton = document.getElementById('add-user');

    // List & Filter Elements
    const reservationsTbody = document.getElementById('reservations-tbody');
    const filterNameInput = document.getElementById('filter-name');
    const filterPhoneInput = document.getElementById('filter-phone');

    // Message Elements
    const formErrorMessage = document.getElementById('form-error-message');
    const formSuccessMessage = document.getElementById('form-success-message');

    // Pagination & Rows per Page Elements
    const rowsSelect = document.getElementById('rows-select');
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const pageInfoSpan = document.getElementById('page-info');

    // State Variables
    let allUsers = []; // Holds all fetched reservations
    let filteredAndSortedUsers = []; // Holds users after filtering and sorting
    let currentPage = 1;
    let rowsPerPage = parseInt(rowsSelect.value, 10); // Initial rows per page

    // --- Initialization ---
    function populateZoneSelect() {
        cisloBytuSelect.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = ""; defaultOption.textContent = "Zvolte číslo zóny";
        defaultOption.selected = true; defaultOption.disabled = true;
        cisloBytuSelect.appendChild(defaultOption);
        for (let i = 1; i <= 18; i++) {
            const option = document.createElement('option');
            option.value = i; option.textContent = `Zóna ${i}`;
            cisloBytuSelect.appendChild(option);
        }
    }

    function populateTimeSelect() {
        timeSelect.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = ""; defaultOption.textContent = "Vyberte čas";
        defaultOption.selected = true; defaultOption.disabled = true;
        timeSelect.appendChild(defaultOption);
        const startHour = 0; const endHour = 23;
        for (let hour = startHour; hour <= endHour; hour++) {
            for (let minute of ['00', '30']) {
                const timeValue = `${String(hour).padStart(2, '0')}:${minute}`;
                const option = document.createElement('option');
                option.value = timeValue; option.textContent = timeValue;
                timeSelect.appendChild(option);
            }
        }
    }

    populateZoneSelect();
    populateTimeSelect();

    // --- Display Logic ---

    // Main function to update the list view based on current state
    function updatePaginatedView() {
        // 1. Sort the currently filtered data
        // Note: Filtering happens in applyFilter() which updates filteredAndSortedUsers
        filteredAndSortedUsers.sort((a, b) => {
            const dateTimeA = new Date(`${a.date}T${a.time || '00:00'}`);
            const dateTimeB = new Date(`${b.date}T${b.time || '00:00'}`);
            if (isNaN(dateTimeA) || isNaN(dateTimeB)) return 0;
            return dateTimeA - dateTimeB; // Sort oldest first
        });

        // 2. Calculate pagination parameters
        const totalRows = filteredAndSortedUsers.length;
        const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
        currentPage = Math.max(1, Math.min(currentPage, totalPages)); // Clamp currentPage

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const usersToDisplay = filteredAndSortedUsers.slice(startIndex, endIndex);

        // 3. Render table rows for the current page
        renderTableRows(usersToDisplay);

        // 4. Render pagination controls
        renderPaginationControls(totalPages);
    }

    // Renders only the table rows for the given array
    function renderTableRows(usersToDisplay) {
        reservationsTbody.innerHTML = ''; // Clear previous rows

        if (usersToDisplay.length === 0 && allUsers.length > 0) { // Check if filtering resulted in no matches
             const row = reservationsTbody.insertRow();
             const cell = row.insertCell();
             cell.colSpan = 8;
             cell.textContent = 'Nebyly nalezeny žádné rezervace odpovídající filtru.';
             cell.style.textAlign = 'center';
             cell.style.fontStyle = 'italic';
             cell.style.padding = '20px';
             return;
        } else if (usersToDisplay.length === 0) { // No data at all yet
             const row = reservationsTbody.insertRow();
             const cell = row.insertCell();
             cell.colSpan = 8;
             cell.textContent = 'Načítání rezervací...'; // Or 'Žádné rezervace k zobrazení.'
             cell.style.textAlign = 'center';
             cell.style.fontStyle = 'italic';
             cell.style.padding = '20px';
             return;
        }


        usersToDisplay.forEach(user => {
            const row = reservationsTbody.insertRow();

            if (user.zaplaceno === 'Zaplaceno') { row.classList.add('paid'); }
            else if (user.zaplaceno === 'Storno') { row.classList.add('cancelled'); }

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
            row.insertCell().textContent = user.cisloBytu ? `Zóna ${user.cisloBytu}` : 'N/A';
            row.insertCell().textContent = formattedDate || 'N/A';
            row.insertCell().textContent = user.time ? user.time.substring(0, 5) : 'N/A';
            row.insertCell().textContent = user.zaplaceno || 'Nezaplaceno';

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
                if (confirm(`Opravdu chcete smazat rezervaci pro ${user.jmeno} (${formattedDate || user.date})?`)) {
                    deleteReservation(user.id);
                }
            });
            actionCell.appendChild(deleteButton);
        });
    }

    // Renders the pagination controls (buttons, page info)
    function renderPaginationControls(totalPages) {
        pageInfoSpan.textContent = `Stránka ${currentPage} z ${totalPages}`;

        prevPageButton.disabled = (currentPage === 1);
        nextPageButton.disabled = (currentPage === totalPages);

        // Simple Previous/Next implementation. Could add page number buttons here for better UX.
    }


    // --- Event Listeners for Controls ---

    rowsSelect.addEventListener('change', () => {
        rowsPerPage = parseInt(rowsSelect.value, 10);
        currentPage = 1; // Reset to first page when changing rows per page
        updatePaginatedView();
    });

    prevPageButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updatePaginatedView();
        }
    });

    nextPageButton.addEventListener('click', () => {
         // Calculate total pages again in case data changed
         const totalPages = Math.ceil(filteredAndSortedUsers.length / rowsPerPage) || 1;
        if (currentPage < totalPages) {
            currentPage++;
            updatePaginatedView();
        }
    });

    // --- Form Handling & API Calls (Functions: setInputError, show/hide messages, populateFormForEdit, resetForm, validateForm, addUser, saveUserChanges, deleteReservation) ---
    // These functions remain largely the same as the previous version,
    // but ensure API success/failure updates trigger `WorkspaceUsers()` which now correctly handles pagination update.

    function setInputError(inputElement, isError) { /* ... remains the same ... */
        if (isError) {
            inputElement.style.borderColor = 'red';
            inputElement.classList.add('input-error');
        } else {
            inputElement.style.borderColor = '';
             inputElement.classList.remove('input-error');
        }
    }
    function showFormError(message) { /* ... remains the same ... */
        formErrorMessage.textContent = message;
        formErrorMessage.style.display = 'block';
        formSuccessMessage.style.display = 'none';
    }
    function hideFormError() { /* ... remains the same ... */
        formErrorMessage.style.display = 'none';
    }
     function showFormSuccess(message) { /* ... remains the same ... */
        formSuccessMessage.textContent = message;
        formSuccessMessage.style.display = 'block';
        formErrorMessage.style.display = 'none';
        setTimeout(() => { hideFormSuccess(); }, 4000);
    }
     function hideFormSuccess() { /* ... remains the same ... */
         formSuccessMessage.style.display = 'none';
     }

    function populateFormForEdit(user) { /* ... remains the same ... */
        hideFormError(); hideFormSuccess();
        jmenoInput.value = user.jmeno; telefonInput.value = user.telefon;
        cisloBytuSelect.value = user.cisloBytu || ""; timeSelect.value = user.time || "";
        dateInput.value = user.date; zaplacenoSelect.value = user.zaplaceno || 'Nezaplaceno';
        poznamkyInput.value = user.poznamky;
        formSectionTitle.textContent = 'Upravit rezervaci'; addUserButton.textContent = 'Uložit změny';
        addUserButton.onclick = () => saveUserChanges(user.id);
    }

    function resetForm() { /* ... remains the same ... */
        jmenoInput.value = ''; telefonInput.value = ''; populateZoneSelect(); populateTimeSelect();
        dateInput.value = ''; zaplacenoSelect.value = 'Nezaplaceno'; poznamkyInput.value = '';
        formSectionTitle.textContent = 'Přidat rezervaci'; addUserButton.textContent = 'Přidat rezervaci';
        addUserButton.onclick = addUser;
        setInputError(jmenoInput, false); setInputError(telefonInput, false); setInputError(cisloBytuSelect, false);
        setInputError(timeSelect, false); setInputError(dateInput, false);
        hideFormError(); hideFormSuccess();
    }

    function validateForm(data) { /* ... remains the same ... */
         let hasError = false;
         setInputError(jmenoInput, false); setInputError(telefonInput, false); setInputError(cisloBytuSelect, false);
         setInputError(timeSelect, false); setInputError(dateInput, false);
         if (!data.jmeno) { setInputError(jmenoInput, true); hasError = true; }
         if (!data.telefon) { setInputError(telefonInput, true); hasError = true; }
         if (!data.cisloBytu) { setInputError(cisloBytuSelect, true); hasError = true; }
         if (!data.time) { setInputError(timeSelect, true); hasError = true; }
         if (!data.date) { setInputError(dateInput, true); hasError = true; }
         return !hasError;
    }

    async function addUser() { /* ... remains the same, but calls fetchUsers on success ... */
        const newUser = { jmeno: jmenoInput.value.trim(), telefon: telefonInput.value.trim(), cisloBytu: cisloBytuSelect.value, time: timeSelect.value, date: dateInput.value, zaplaceno: zaplacenoSelect.value, poznamky: poznamkyInput.value.trim() };
        if (!validateForm(newUser)) { showFormError('Prosím vyplňte všechna povinná pole (označená červeně).'); return; }
        hideFormError(); console.log('Odesílání (POST):', newUser);
        try {
            const response = await fetch('https://apartmany.onrender.com', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });
            if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(`Nepodařilo se přidat rezervaci: ${response.status} ${response.statusText} ${errorData.error || ''}`); }
            await fetchUsers(); // <--- Refresh data after add
            resetForm(); showFormSuccess('Rezervace byla úspěšně přidána.');
        } catch (error) { console.error('Chyba při přidávání rezervace:', error); showFormError(`Chyba při ukládání: ${error.message}`); }
    }

    async function saveUserChanges(userId) { /* ... remains the same, but calls fetchUsers on success ... */
        const updatedUser = { jmeno: jmenoInput.value.trim(), telefon: telefonInput.value.trim(), cisloBytu: cisloBytuSelect.value, time: timeSelect.value, date: dateInput.value, zaplaceno: zaplacenoSelect.value, poznamky: poznamkyInput.value.trim() };
        if (!validateForm(updatedUser)) { showFormError('Prosím vyplňte všechna povinná pole (označená červeně).'); return; }
        hideFormError(); console.log(`Odesílání (PUT) pro ID ${userId}:`, updatedUser);
        try {
            const response = await fetch(`http://localhost:5000/uzivatele/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedUser) });
            if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(`Nepodařilo se aktualizovat rezervaci: ${response.status} ${response.statusText} ${errorData.error || ''}`); }
            await fetchUsers(); // <--- Refresh data after update
            resetForm(); showFormSuccess('Změny byly úspěšně uloženy.');
        } catch (error) { console.error('Chyba při aktualizaci rezervace:', error); showFormError(`Chyba při ukládání: ${error.message}`); }
    }

     async function deleteReservation(userId) { /* ... remains the same, but calls fetchUsers on success ... */
        console.log(`Pokus o smazání rezervace ID: ${userId}`); showFormSuccess(''); hideFormError();
        try {
            const response = await fetch(`'https://apartmany.onrender.com/uzivatele/${userId}`, { method: 'DELETE' });
            if (response.ok || response.status === 204) {
                 console.log(`Rezervace ID: ${userId} úspěšně smazána.`);
                 await fetchUsers(); // <--- Refresh data after delete
                 showFormSuccess('Rezervace byla úspěšně smazána.');
                 if (addUserButton.textContent === 'Uložit změny') { const handlerString = addUserButton.onclick ? addUserButton.onclick.toString() : ''; const match = handlerString.match(/saveUserChanges\((\d+)\)/); if (match && parseInt(match[1]) === userId) { console.log('Resetting form because the deleted item was being edited.'); resetForm(); } }
            } else { const errorData = await response.json().catch(() => ({ error: `Chyba serveru (${response.status})` })); throw new Error(errorData.error || `Nepodařilo se smazat rezervaci (${response.status})`); }
        } catch (error) { console.error('Chyba při mazání rezervace:', error); showFormError(`Chyba při mazání: ${error.message}`); }
    }


    // --- Filtering ---
    function applyFilter() {
        const filterNameValue = filterNameInput.value.toLowerCase().trim();
        const filterPhoneValue = filterPhoneInput.value.toLowerCase().replace(/\s/g, '').trim();

        // Filtrujeme z původních dat (allUsers)
        filteredAndSortedUsers = allUsers.filter(user => {
            const nameMatch = user.jmeno.toLowerCase().includes(filterNameValue);
            const phoneMatch = (user.telefon || '').toLowerCase().replace(/\s/g, '').includes(filterPhoneValue);
            return nameMatch && phoneMatch;
        });

        currentPage = 1; // Vždy začít od první stránky po filtrování
        updatePaginatedView(); // Zobrazit výsledek
    }

    filterNameInput.addEventListener('input', applyFilter);
    filterPhoneInput.addEventListener('input', applyFilter);

    // --- Initial Load ---
    async function fetchUsers() {
        try {
            const response = await fetch('http://localhost:5000/uzivatele');
            if (!response.ok) {
                throw new Error(`Nepodařilo se načíst rezervace: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log('Načtené rezervace:', data);
            allUsers = data; // Uložit všechna data
            // Na začátku jsou filtrovaná data stejná jako všechna data
            // Filtrování se aplikuje až při změně filtrů
            applyFilter(); // Aplikujeme výchozí (prázdný) filtr pro seřazení a zobrazení první stránky

        } catch (error) {
            console.error('Chyba při načítání rezervací:', error);
            reservationsTbody.innerHTML = `<tr><td colspan="8" style="color: red; text-align: center; padding: 20px;">Chyba při načítání dat. Zkontrolujte konzoli a backend (${error.message}).</td></tr>`;
             pageInfoSpan.textContent = 'Chyba'; // Update pagination info on error
             prevPageButton.disabled = true;
             nextPageButton.disabled = true;
        }
    }

    addUserButton.onclick = addUser; // Set initial handler for the add button

    fetchUsers(); // Load initial data when the page loads

}); // End DOMContentLoaded
