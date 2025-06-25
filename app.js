document.addEventListener('DOMContentLoaded', function() {
    // Variabili globali
    let timerInterval;
    let seconds = 0;
    let currentUser = null;
    let studySessions = [];
    let flashcards = [];
    let calendarEvents = [];
    let notes = [];
    let currentReviewIndex = -1;
    let isFlipped = false;
    let calendar, studyChart;

    // ======================
    // 1. FUNZIONI DI UTILITY
    // ======================
    function showAlert(title, message, type = 'warning') {
        const alertModal = new bootstrap.Modal(document.getElementById('customAlert'));
        const icon = document.getElementById('alert-icon');
        const alertTitle = document.getElementById('alert-title');
        const alertMsg = document.getElementById('alert-message');
        
        if (type === 'success') {
            icon.className = 'bi bi-check-circle-fill text-success fs-1 mb-3';
        } else if (type === 'error') {
            icon.className = 'bi bi-exclamation-triangle-fill text-danger fs-1 mb-3';
        } else {
            icon.className = 'bi bi-info-circle-fill text-primary fs-1 mb-3';
        }
        
        alertTitle.textContent = title;
        alertMsg.textContent = message;
        alertModal.show();
    }

    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    function saveUserData() {
        if (!currentUser) return;
        
        localStorage.setItem('studyTimeManagerUser', JSON.stringify({
            username: currentUser,
            data: { studySessions, flashcards, calendarEvents, notes }
        }));
        
        localStorage.setItem(`studyTimeManager_${currentUser}`, JSON.stringify({
            password: JSON.parse(localStorage.getItem(`studyTimeManager_${currentUser}`)).password,
            data: { studySessions, flashcards, calendarEvents, notes }
        }));
    }

    function isLocalStorageAvailable() {
        try {
            const testKey = 'test';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch(e) {
            return false;
        }
    }

    // ======================
    // 2. AUTENTICAZIONE
    // ======================
    function checkAuth() {
        if (!isLocalStorageAvailable()) {
            showAlert('Errore', 'LocalStorage non disponibile', 'error');
            return;
        }

        const userData = localStorage.getItem('studyTimeManagerUser');
        if (userData) {
            try {
                const { username, data } = JSON.parse(userData);
                currentUser = username;
                studySessions = data.studySessions || [];
                flashcards = data.flashcards || [];
                calendarEvents = data.calendarEvents || [];
                notes = data.notes || [];
                
                document.getElementById('auth-section').classList.add('d-none');
                document.getElementById('app-container').classList.remove('d-none');
                showSection('timer-section');
            } catch (e) {
                showAlert('Errore', 'Dati utente corrotti', 'error');
            }
        }
    }

    function handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            showAlert('Errore', 'Inserisci username e password', 'error');
            return;
        }
        
        const userData = localStorage.getItem(`studyTimeManager_${username}`);
        
        if (userData) {
            try {
                const { password: storedPassword, data } = JSON.parse(userData);
                
                if (password === storedPassword) {
                    currentUser = username;
                    studySessions = data.studySessions || [];
                    flashcards = data.flashcards || [];
                    calendarEvents = data.calendarEvents || [];
                    notes = data.notes || [];
                    
                    localStorage.setItem('studyTimeManagerUser', JSON.stringify({
                        username,
                        data: { studySessions, flashcards, calendarEvents, notes }
                    }));
                    
                    document.getElementById('auth-section').classList.add('d-none');
                    document.getElementById('app-container').classList.remove('d-none');
                    showSection('timer-section');
                    
                    document.getElementById('username').value = '';
                    document.getElementById('password').value = '';
                } else {
                    showAlert('Errore', 'Password errata', 'error');
                }
            } catch (e) {
                showAlert('Errore', 'Dati utente corrotti', 'error');
            }
        } else {
            showAlert('Errore', 'Utente non trovato', 'error');
        }
    }

    function showAuthModal(mode = 'register') {
        const modal = new bootstrap.Modal(document.getElementById('authModal'));
        const title = document.getElementById('authModalTitle');
        const registerForm = document.getElementById('register-form');
        const recoverForm = document.getElementById('recover-form');
        const switchToRecover = document.getElementById('switch-to-recover');
        const switchToRegister = document.getElementById('switch-to-register');
        
        if (mode === 'register') {
            title.textContent = 'Registrazione';
            registerForm.classList.remove('d-none');
            recoverForm.classList.add('d-none');
            switchToRecover.classList.remove('d-none');
            switchToRegister.classList.add('d-none');
            
            // Reset form
            document.getElementById('reg-username').value = '';
            document.getElementById('reg-password').value = '';
        } else {
            title.textContent = 'Recupero Password';
            registerForm.classList.add('d-none');
            recoverForm.classList.remove('d-none');
            switchToRecover.classList.add('d-none');
            switchToRegister.classList.remove('d-none');
            
            // Reset form
            document.getElementById('recover-username').value = '';
            document.getElementById('new-password').value = '';
        }
        
        modal.show();
    }

    function handleRegister() {
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value.trim();
        
        if (!username || !password) {
            showAlert('Errore', 'Inserisci username e password', 'error');
            return;
        }
        
        if (localStorage.getItem(`studyTimeManager_${username}`)) {
            showAlert('Errore', 'Username già esistente', 'error');
            return;
        }
        
        const userData = {
            password,
            data: {
                studySessions: [],
                flashcards: [],
                calendarEvents: [],
                notes: []
            }
        };
        
        try {
            localStorage.setItem(`studyTimeManager_${username}`, JSON.stringify(userData));
            showAlert('Successo', 'Registrazione completata!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
        } catch (e) {
            showAlert('Errore', 'Spazio di archiviazione esaurito', 'error');
            console.error('LocalStorage error:', e);
        }
    }

    function handlePasswordRecovery() {
        const username = document.getElementById('recover-username').value.trim();
        const newPassword = document.getElementById('new-password').value.trim();
        
        if (!username || !newPassword) {
            showAlert('Errore', 'Inserisci username e nuova password', 'error');
            return;
        }
        
        const userData = localStorage.getItem(`studyTimeManager_${username}`);
        
        if (!userData) {
            showAlert('Errore', 'Utente non trovato', 'error');
            return;
        }
        
        try {
            const userObj = JSON.parse(userData);
            userObj.password = newPassword;
            localStorage.setItem(`studyTimeManager_${username}`, JSON.stringify(userObj));
            showAlert('Successo', 'Password reimpostata con successo!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
        } catch (e) {
            showAlert('Errore', 'Errore nel reset password', 'error');
            console.error('Recovery error:', e);
        }
    }

    function handleLogout() {
        localStorage.removeItem('studyTimeManagerUser');
        currentUser = null;
        studySessions = [];
        flashcards = [];
        calendarEvents = [];
        notes = [];
        
        document.getElementById('auth-section').classList.remove('d-none');
        document.getElementById('app-container').classList.add('d-none');
    }

    // ======================
    // 3. TIMER DI STUDIO
    // ======================
    function startTimer() {
        if (timerInterval) return;
        
        document.getElementById('start-timer').disabled = true;
        document.getElementById('stop-timer').disabled = false;
        
        timerInterval = setInterval(() => {
            seconds++;
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() {
        if (!timerInterval) return;
        
        clearInterval(timerInterval);
        timerInterval = null;
        
        document.getElementById('start-timer').disabled = false;
        document.getElementById('stop-timer').disabled = true;
        
        const session = {
            id: Date.now(),
            startTime: new Date(new Date() - seconds * 1000).toISOString(),
            endTime: new Date().toISOString(),
            duration: seconds
        };
        
        studySessions.unshift(session);
        saveUserData();
        addSessionToList(session, document.getElementById('recent-sessions'));
        
        seconds = 0;
        updateTimerDisplay();
    }

    function updateTimerDisplay() {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        document.getElementById('timer-display').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function addSessionToList(session, listElement) {
        const sessionElement = document.createElement('div');
        sessionElement.className = 'list-group-item';
        sessionElement.innerHTML = `
            <div class="d-flex justify-content-between">
                <div>
                    <strong>${new Date(session.startTime).toLocaleDateString()} ${new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>
                    <div class="text-muted small">Durata: ${formatDuration(session.duration)}</div>
                </div>
                <button class="btn btn-sm btn-outline-danger delete-session" data-id="${session.id}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        if (listElement.children.length > 0) {
            listElement.insertBefore(sessionElement, listElement.firstChild);
        } else {
            listElement.appendChild(sessionElement);
        }
        
        sessionElement.querySelector('.delete-session').addEventListener('click', function() {
            studySessions = studySessions.filter(s => s.id !== parseInt(this.getAttribute('data-id')));
            saveUserData();
            sessionElement.remove();
        });
    }

    // ======================
    // 4. FLASHCARDS
    // ======================
    function saveFlashcard() {
        const front = document.getElementById('flashcard-front').value.trim();
        const back = document.getElementById('flashcard-back').value.trim();
        
        if (!front || !back) {
            showAlert('Errore', 'Inserisci sia il fronte che il retro', 'error');
            return;
        }
        
        const flashcard = {
            id: Date.now(),
            front,
            back,
            createdAt: new Date().toISOString()
        };
        
        flashcards.unshift(flashcard);
        saveUserData();
        addFlashcardToList(flashcard);
        
        document.getElementById('flashcard-front').value = '';
        document.getElementById('flashcard-back').value = '';
    }

    function addFlashcardToList(flashcard) {
        const flashcardElement = document.createElement('div');
        flashcardElement.className = 'list-group-item';
        flashcardElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-bold">${flashcard.front}</div>
                    <div class="text-muted small">${new Date(flashcard.createdAt).toLocaleString()}</div>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-danger delete-flashcard" data-id="${flashcard.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        const listElement = document.getElementById('flashcards-list');
        if (listElement.children.length > 0) {
            listElement.insertBefore(flashcardElement, listElement.firstChild);
        } else {
            listElement.appendChild(flashcardElement);
        }
        
        flashcardElement.querySelector('.delete-flashcard').addEventListener('click', function() {
            flashcards = flashcards.filter(card => card.id !== parseInt(this.getAttribute('data-id')));
            saveUserData();
            flashcardElement.remove();
        });
    }

    function startReview() {
        if (flashcards.length === 0) {
            showAlert('Attenzione', 'Nessuna flashcard disponibile', 'warning');
            return;
        }
        
        currentReviewIndex = 0;
        isFlipped = false;
        
        document.getElementById('flashcard-content').textContent = flashcards[currentReviewIndex].front;
        document.getElementById('review-flashcard').className = 'card mb-3 mx-auto flashcard-front';
        
        document.getElementById('start-review').classList.add('d-none');
        document.getElementById('flip-card').classList.remove('d-none');
        document.getElementById('next-card').classList.remove('d-none');
    }

    function flipCard() {
        isFlipped = !isFlipped;
        const card = flashcards[currentReviewIndex];
        
        if (isFlipped) {
            document.getElementById('flashcard-content').textContent = card.back;
            document.getElementById('review-flashcard').className = 'card mb-3 mx-auto flashcard-back';
        } else {
            document.getElementById('flashcard-content').textContent = card.front;
            document.getElementById('review-flashcard').className = 'card mb-3 mx-auto flashcard-front';
        }
    }

    function nextCard() {
        currentReviewIndex = (currentReviewIndex + 1) % flashcards.length;
        isFlipped = false;
        
        document.getElementById('flashcard-content').textContent = flashcards[currentReviewIndex].front;
        document.getElementById('review-flashcard').className = 'card mb-3 mx-auto flashcard-front';
    }

    // ======================
    // 5. STATISTICHE
    // ======================
    function loadStats() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        
        document.getElementById('stats-start-date').valueAsDate = startDate;
        document.getElementById('stats-end-date').valueAsDate = endDate;
        
        updateStats();
    }

    function updateStats() {
        const startDate = new Date(document.getElementById('stats-start-date').value);
        const endDate = new Date(document.getElementById('stats-end-date').value);
        
        if (startDate > endDate) {
            showAlert('Errore', 'La data di inizio deve essere precedente', 'error');
            return;
        }
        
        // Filtra sessioni per periodo
        const filteredSessions = studySessions.filter(session => {
            const sessionDate = new Date(session.startTime);
            return sessionDate >= startDate && sessionDate <= endDate;
        });
        
        // Statistiche giornaliere
        const today = new Date().toISOString().split('T')[0];
        const todaySessions = studySessions.filter(session => session.startTime.split('T')[0] === today);
        const todaySeconds = todaySessions.reduce((total, session) => total + session.duration, 0);
        document.getElementById('today-stats').textContent = formatDuration(todaySeconds);
        
        // Media settimanale
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const lastWeekSessions = studySessions.filter(session => new Date(session.startTime) >= oneWeekAgo);
        const weeklyAverage = lastWeekSessions.length > 0 
            ? lastWeekSessions.reduce((total, session) => total + session.duration, 0) / lastWeekSessions.length 
            : 0;
        document.getElementById('weekly-stats').textContent = formatDuration(weeklyAverage);
        
        // Media mensile
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const lastMonthSessions = studySessions.filter(session => new Date(session.startTime) >= oneMonthAgo);
        const monthlyAverage = lastMonthSessions.length > 0 
            ? lastMonthSessions.reduce((total, session) => total + session.duration, 0) / lastMonthSessions.length 
            : 0;
        document.getElementById('monthly-stats').textContent = formatDuration(monthlyAverage);
        
        updateChart(filteredSessions, startDate, endDate);
    }

    function updateChart(sessions, startDate, endDate) {
        // Raggruppa sessioni per giorno
        const sessionsByDay = {};
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateKey = currentDate.toISOString().split('T')[0];
            sessionsByDay[dateKey] = 0;
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        sessions.forEach(session => {
            const dateKey = session.startTime.split('T')[0];
            if (sessionsByDay[dateKey] !== undefined) {
                sessionsByDay[dateKey] += session.duration / 3600; // Converti in ore
            }
        });
        
        // Prepara dati per il grafico
        const labels = Object.keys(sessionsByDay).map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
        });
        
        const data = Object.values(sessionsByDay);
        
        // Crea o aggiorna grafico
        const ctx = document.getElementById('study-chart').getContext('2d');
        
        if (studyChart) {
            studyChart.data.labels = labels;
            studyChart.data.datasets[0].data = data;
            studyChart.update();
        } else {
            studyChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Ore di studio',
                        data: data,
                        backgroundColor: 'rgba(220, 53, 69, 0.7)',
                        borderColor: 'rgba(220, 53, 69, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Ore' }
                        },
                        x: {
                            title: { display: true, text: 'Data' }
                        }
                    }
                }
            });
        }
    }

    // ======================
    // 6. CALENDARIO
    // ======================
    function loadCalendar() {
        if (typeof FullCalendar === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.js';
            script.onload = initializeCalendar;
            document.head.appendChild(script);
        } else {
            initializeCalendar();
        }
    }

    function initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        
        if (calendar) {
            calendar.destroy();
        }
        
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: calendarEvents.map(event => ({
                id: event.id,
                title: event.title,
                start: event.date,
                extendedProps: {
                    type: event.type,
                    notes: event.notes
                },
                backgroundColor: getEventColor(event.type),
                borderColor: getEventColor(event.type)
            })),
           eventClick: function(info) {
    console.log("Evento cliccato:", info.event); // Debug
    try {
        if (!info.event) throw new Error("Event object is null");
        showEventDetails(info.event);
    } catch (error) {
        console.error("Errore nel click:", error);
        showAlert('Errore', "Impossibile visualizzare l'evento", 'error');
    }
}
        });
        
        calendar.render();
        document.getElementById('event-date').valueAsDate = new Date();
        loadUpcomingEvents();
    }

    function getEventColor(type) {
        switch (type) {
            case 'exam': return '#dc3545';
            case 'work': return '#0d6efd';
            default: return '#6c757d';
        }
    }

function showEventDetails(event) {
    // Crea modal solo una volta
    const modalId = 'event-details-modal';
    let modalElement = document.getElementById(modalId);
    
    if (!modalElement) {
        modalElement = document.createElement('div');
        modalElement.id = modalId;
        modalElement.className = 'modal fade';
        modalElement.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Dettagli Evento</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="event-details-content"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modalElement);
    }

    const typeMap = {
        'exam': 'Esame',
        'work': 'Lavoro',
        'other': 'Altro'
    };
    
    const eventData = event.extendedProps || {};
    const eventDate = event.start ? new Date(event.start) : new Date();
    
    document.getElementById('event-details-content').innerHTML = `
        <h5>${event.title || 'Nessun titolo'}</h5>
        <p><strong>Data:</strong> ${eventDate.toLocaleDateString()}</p>
        <p><strong>Tipo:</strong> ${typeMap[eventData.type] || eventData.type || 'Nessun tipo'}</p>
        <p><strong>Note:</strong> ${eventData.notes || 'Nessuna nota'}</p>
        <div class="d-flex justify-content-between mt-3">
            <button class="btn btn-sm btn-outline-danger" id="edit-event">Modifica</button>
            <button class="btn btn-sm btn-danger" id="delete-event">Elimina</button>
        </div>
    `;
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    // Gestione pulsanti
    modalElement.querySelector('#edit-event').onclick = () => {
        modal.hide();
        editEvent(event.id);
    };
    
    modalElement.querySelector('#delete-event').onclick = () => {
        modal.hide();
        deleteEvent(event.id);
    };
}

    function saveEvent() {
        const date = document.getElementById('event-date').value;
        const title = document.getElementById('event-title').value.trim();
        const type = document.getElementById('event-type').value;
        const notes = document.getElementById('event-notes').value.trim();
        
        if (!date || !title) {
            showAlert('Errore', 'Inserisci almeno data e titolo', 'error');
            return;
        }
        
        const event = {
            id: Date.now(),
            date,
            title,
            type,
            notes,
            createdAt: new Date().toISOString()
        };
        
        calendarEvents.push(event);
        saveUserData();
        
        if (calendar) {
            calendar.addEvent({
                id: event.id,
                title: event.title,
                start: event.date,
                extendedProps: {
                    type: event.type,
                    notes: event.notes
                },
                backgroundColor: getEventColor(event.type),
                borderColor: getEventColor(event.type)
            });
        }
        
        addEventToList(event);
        
        document.getElementById('event-title').value = '';
        document.getElementById('event-notes').value = '';
    }

  function editEvent(eventId) {
    try {
        // Converti in numero se necessario
        eventId = typeof eventId === 'string' ? parseInt(eventId) : eventId;
        
        const event = calendarEvents.find(e => e.id === eventId);
        if (!event) {
            showAlert('Errore', 'Evento non trovato', 'error');
            return;
        }
        
        // Compila il form
        document.getElementById('event-date').value = event.date.split('T')[0];
        document.getElementById('event-title').value = event.title || '';
        document.getElementById('event-type').value = event.type || 'other';
        document.getElementById('event-notes').value = event.notes || '';
        
        // Rimuovi l'evento vecchio
        calendarEvents = calendarEvents.filter(e => e.id !== eventId);
        if (calendar) {
            const calendarEvent = calendar.getEventById(eventId.toString());
            if (calendarEvent) calendarEvent.remove();
        }
        
        // Mostra la sezione calendario
        showSection('calendar-section');
        
    } catch (error) {
        console.error("Errore durante la modifica:", error);
        showAlert('Errore', "Impossibile modificare l'evento", 'error');
    }
}
  function deleteEvent(eventId) {
    try {
        // Converti in numero se necessario
        eventId = typeof eventId === 'string' ? parseInt(eventId) : eventId;
        
        // Rimuovi dall'array
        calendarEvents = calendarEvents.filter(e => e.id !== eventId);
        saveUserData();
        
        // Rimuovi dal calendario FullCalendar
        if (calendar) {
            const eventToRemove = calendar.getEventById(eventId.toString());
            if (eventToRemove) eventToRemove.remove();
        }
        
        // Rimuovi dalla lista eventi prossimi
        document.querySelectorAll(`.event-item[data-id="${eventId}"]`).forEach(el => el.remove());
        
    } catch (error) {
        console.error("Errore durante l'eliminazione:", error);
        showAlert('Errore', "Impossibile eliminare l'evento", 'error');
    }
}

    function loadUpcomingEvents() {
        const listElement = document.getElementById('upcoming-events');
        listElement.innerHTML = '';
        
        const sortedEvents = [...calendarEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(today.getDate() + 30);
        
        const upcomingEvents = sortedEvents.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= today && eventDate <= nextMonth;
        });
        
        upcomingEvents.forEach(event => addEventToList(event));
    }

    function addEventToList(event) {
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (eventDate < today) return;
        
        const eventElement = document.createElement('div');
        eventElement.className = 'list-group-item event-item';
        eventElement.setAttribute('data-id', event.id);
        eventElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <span class="badge event-badge-${event.type} me-2">${
                        event.type === 'exam' ? 'Esame' : 
                        event.type === 'work' ? 'Lavoro' : 'Altro'
                    }</span>
                    <strong>${event.title}</strong>
                    <div class="text-muted small">${eventDate.toLocaleDateString()}</div>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-danger delete-event" data-id="${event.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('upcoming-events').appendChild(eventElement);
        
        eventElement.querySelector('.delete-event').addEventListener('click', function(e) {
            e.stopPropagation();
            deleteEvent(parseInt(this.getAttribute('data-id')));
        });
        
        eventElement.addEventListener('click', function() {
            const eventId = parseInt(this.getAttribute('data-id'));
            const event = calendarEvents.find(e => e.id === eventId);
            if (event) {
                showEventDetails({
                    id: event.id.toString(),
                    title: event.title,
                    start: new Date(event.date),
                    extendedProps: {
                        type: event.type,
                        notes: event.notes
                    }
                });
            }
        });
    }

    // ======================
    // 7. APPUNTI
    // ======================
    function saveNote() {
        const title = document.getElementById('note-title').value.trim();
        const content = document.getElementById('note-content').value.trim();
        
        if (!title || !content) {
            showAlert('Errore', 'Inserisci titolo e contenuto', 'error');
            return;
        }
        
        const note = {
            id: Date.now(),
            title,
            content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        notes.unshift(note);
        saveUserData();
        addNoteToList(note);
        
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';
    }

    function addNoteToList(note, isSearchResult = false) {
        const noteDate = new Date(note.createdAt);
        const updatedDate = new Date(note.updatedAt);
        
        const noteElement = document.createElement('div');
        noteElement.className = 'list-group-item note-item';
        noteElement.setAttribute('data-id', note.id);
        noteElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="note-title">${note.title}</div>
                    <div class="note-date">Creato: ${noteDate.toLocaleString()}${
                        noteDate.getTime() !== updatedDate.getTime() ? 
                        `<br>Modificato: ${updatedDate.toLocaleString()}` : ''
                    }</div>
                </div>
                <div class="d-flex">
                    <button class="btn btn-sm btn-outline-secondary copy-note me-2" data-id="${note.id}" title="Copia">
                        <i class="bi bi-clipboard"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-note" data-id="${note.id}" title="Elimina">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        const listElement = document.getElementById('notes-list');
        if (isSearchResult || listElement.children.length === 0) {
            listElement.appendChild(noteElement);
        } else {
            listElement.insertBefore(noteElement, listElement.firstChild);
        }
        
        noteElement.addEventListener('click', function(e) {
            if (!e.target.closest('.copy-note, .delete-note')) {
                editNote(note.id);
            }
        });
        
        noteElement.querySelector('.copy-note').addEventListener('click', function(e) {
            e.stopPropagation();
            copyNoteToClipboard(note.id);
        });
        
        noteElement.querySelector('.delete-note').addEventListener('click', function(e) {
            e.stopPropagation();
            deleteNote(note.id);
        });
    }

    function editNote(noteId) {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;
        
        document.getElementById('note-title').value = note.title;
        document.getElementById('note-content').value = note.content;
        
        const noteIndex = notes.findIndex(n => n.id === noteId);
        if (noteIndex !== -1) {
            notes.splice(noteIndex, 1);
        }
        
        const noteElement = document.querySelector(`.note-item[data-id="${noteId}"]`);
        if (noteElement) noteElement.remove();
    }

    function copyNoteToClipboard(noteId) {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;
        
        const textToCopy = `${note.title}\n\n${note.content}`;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            const tooltip = new bootstrap.Tooltip(document.querySelector(`.copy-note[data-id="${noteId}"]`), {
                title: 'Copiato!',
                trigger: 'manual'
            });
            
            tooltip.show();
            
            setTimeout(() => {
                tooltip.hide();
                setTimeout(() => tooltip.dispose(), 150);
            }, 1000);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }

    function deleteNote(noteId) {
        const noteIndex = notes.findIndex(n => n.id === noteId);
        if (noteIndex === -1) return;
        
        notes.splice(noteIndex, 1);
        saveUserData();
        
        const noteElement = document.querySelector(`.note-item[data-id="${noteId}"]`);
        if (noteElement) noteElement.remove();
    }

    function searchNotesHandler() {
        const searchTerm = document.getElementById('search-notes').value.trim().toLowerCase();
        
        if (!searchTerm) {
            clearSearchHandler();
            return;
        }
        
        const listElement = document.getElementById('notes-list');
        listElement.innerHTML = '';
        
        const filteredNotes = notes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) || 
            note.content.toLowerCase().includes(searchTerm)
        );
        
        filteredNotes.forEach(note => addNoteToList(note, true));
    }

    function clearSearchHandler() {
        document.getElementById('search-notes').value = '';
        const listElement = document.getElementById('notes-list');
        listElement.innerHTML = '';
        notes.forEach(note => addNoteToList(note));
    }

    // ======================
    // 8. GESTIONE INTERFACCIA
    // ======================
    function showSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.toggle('d-none', section.id !== sectionId);
        });
        
        // Aggiorna stato attivo nella sidebar
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-section') === sectionId);
        });
        
        // Carica dati sezione specifica
        if (sectionId === 'timer-section') loadRecentSessions();
        if (sectionId === 'flashcards-section') loadFlashcards();
        if (sectionId === 'stats-section') loadStats();
        if (sectionId === 'calendar-section') loadCalendar();
        if (sectionId === 'notes-section') loadNotes();
    }

    function loadRecentSessions() {
        const listElement = document.getElementById('recent-sessions');
        listElement.innerHTML = '';
        studySessions.slice(0, 5).forEach(session => addSessionToList(session, listElement));
    }

    function loadFlashcards() {
        const listElement = document.getElementById('flashcards-list');
        listElement.innerHTML = '';
        flashcards.forEach(card => addFlashcardToList(card));
    }

    function loadNotes() {
        const listElement = document.getElementById('notes-list');
        listElement.innerHTML = '';
        notes.forEach(note => addNoteToList(note));
    }

    // ======================
    // 9. ESPORTAZIONE/IMPORTAZIONE
    // ======================
    function exportData() {
        const exportData = {
            studySessions: document.getElementById('export-sessions').checked ? studySessions : [],
            flashcards: document.getElementById('export-flashcards').checked ? flashcards : [],
            calendarEvents: document.getElementById('export-events').checked ? calendarEvents : [],
            notes: document.getElementById('export-notes').checked ? notes : [],
            exportedAt: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileName = `study_time_manager_export_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
        
        bootstrap.Modal.getInstance(document.getElementById('exportModal')).hide();
    }

    function importData() {
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];
        
        if (!file) {
            showAlert('Errore', 'Seleziona un file', 'error');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (document.getElementById('import-sessions').checked && importedData.studySessions) {
                    studySessions = importedData.studySessions;
                }
                
                if (document.getElementById('import-flashcards').checked && importedData.flashcards) {
                    flashcards = importedData.flashcards;
                }
                
                if (document.getElementById('import-events').checked && importedData.calendarEvents) {
                    calendarEvents = importedData.calendarEvents;
                }
                
                if (document.getElementById('import-notes').checked && importedData.notes) {
                    notes = importedData.notes;
                }
                
                saveUserData();
                showAlert('Successo', 'Dati importati con successo', 'success');
                
                // Ricarica le sezioni
                loadRecentSessions();
                loadFlashcards();
                loadCalendar();
                loadNotes();
                
                bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
                fileInput.value = '';
            } catch (error) {
                showAlert('Errore', 'File JSON non valido', 'error');
                console.error('Import error:', error);
            }
        };
        
        reader.onerror = function() {
            showAlert('Errore', 'Errore nella lettura del file', 'error');
        };
        
        reader.readAsText(file);
    }

    // ======================
    // 10. INIZIALIZZAZIONE
    // ======================
    function initEventListeners() {
        // Autenticazione
        document.getElementById('login-btn').addEventListener('click', handleLogin);
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
        document.getElementById('register-btn').addEventListener('click', () => showAuthModal('register'));
        document.getElementById('forgot-password').addEventListener('click', (e) => {
            e.preventDefault();
            showAuthModal('recover');
        });
        document.getElementById('confirm-register').addEventListener('click', handleRegister);
        document.getElementById('confirm-recover').addEventListener('click', handlePasswordRecovery);
        document.getElementById('switch-to-recover').addEventListener('click', (e) => {
            e.preventDefault();
            showAuthModal('recover');
        });
        document.getElementById('switch-to-register').addEventListener('click', (e) => {
            e.preventDefault();
            showAuthModal('register');
        });
        
        // Timer
        document.getElementById('start-timer').addEventListener('click', startTimer);
        document.getElementById('stop-timer').addEventListener('click', stopTimer);
        
        // Flashcards
        document.getElementById('save-flashcard').addEventListener('click', saveFlashcard);
        document.getElementById('start-review').addEventListener('click', startReview);
        document.getElementById('flip-card').addEventListener('click', flipCard);
        document.getElementById('next-card').addEventListener('click', nextCard);
        
        // Statistiche
        document.getElementById('show-stats').addEventListener('click', updateStats);
        
        // Calendario
        document.getElementById('save-event').addEventListener('click', saveEvent);
        
        // Appunti
        document.getElementById('save-note').addEventListener('click', saveNote);
        document.getElementById('search-notes').addEventListener('input', searchNotesHandler);
        document.getElementById('clear-search').addEventListener('click', clearSearchHandler);
        
        // Navigazione
        document.querySelectorAll('.nav-link[data-section]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showSection(this.getAttribute('data-section'));
            });
        });
        
        // Mobile navigation
        document.querySelectorAll('.fixed-bottom .btn-link').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const section = this.getAttribute('data-section');
                showSection(section);
                
                // Update active state
                document.querySelectorAll('.fixed-bottom .btn-link').forEach(b => {
                    b.classList.toggle('text-danger', b === this);
                    b.classList.toggle('text-muted', b !== this);
                });
            });
        });
        
        // Export/Import
        document.getElementById('confirm-export').addEventListener('click', exportData);
        document.getElementById('confirm-import').addEventListener('click', importData);
    }

    // Avvia l'applicazione
    initEventListeners();
    checkAuth();
});
window.addEventListener('resize', () => {
  document.body.style.height = window.innerHeight + 'px';
});
// Aggiungi alla fine di app.js
function adjustViewport() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', adjustViewport);
window.addEventListener('orientationchange', adjustViewport);
adjustViewport();