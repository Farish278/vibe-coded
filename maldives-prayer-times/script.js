document.addEventListener('DOMContentLoaded', () => {
    let prayerData = null;
    let selectedIsland = null;
    let use24Hour = false;
    let settingsModal = null;

    let selectedDate = new Date();
    let currentCalendarDate = new Date(); // To track which month we are viewing in calendar

    const prayerNames = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
    const prayerKeys = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

    // Initialize UI Elements
    const locationDisplay = document.getElementById('location-display');
    const prayerTimesList = document.getElementById('prayer-times-list');
    const astronomyList = document.getElementById('astronomy-list');
    const atollSelect = document.getElementById('atollSelect');
    const islandSelect = document.getElementById('islandSelect');
    const timeFormatToggle = document.getElementById('timeFormatToggle');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const moonPhaseIcon = document.getElementById('moon-phase-icon');
    const moonPhaseName = document.getElementById('moon-phase-name');

    const darkModeToggle = document.getElementById('darkModeToggle');
    const colorSwatchesContainer = document.getElementById('colorSwatches');

    let currentPrimaryColor = "#6200ee";
    const presetColors = [
        "#6200ee", "#3700b3", "#03dac6", "#b00020", // Material defaults
        "#2196f3", "#009688", "#4caf50", "#ff9800", // Standard colors
        "#9c27b0", "#e91e63", "#795548", "#607d8b"  // More variety
    ];

    // Calendar Elements
    const calendarMonthYear = document.getElementById('calendar-month-year');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const todayBtn = document.getElementById('todayBtn');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const nextPrayerCountdown = document.getElementById('next-prayer-countdown');

    settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));

    // 1. Load Data
    fetch('salat.json')
        .then(response => response.json())
        .then(data => {
            prayerData = data;
            populateAtolls();
            initApp();
        })
        .catch(err => console.error('Error loading prayer data:', err));

    function initApp() {
        const savedSettings = localStorage.getItem('mvPrayerSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            selectedIsland = prayerData.islands.find(i => i.islandId === settings.islandId);
            use24Hour = settings.use24Hour;
            timeFormatToggle.checked = use24Hour;

            if (settings.darkMode) {
                document.documentElement.setAttribute('data-bs-theme', 'dark');
                darkModeToggle.checked = true;
            }
            if (settings.primaryColor) {
                applyThemeColor(settings.primaryColor);
            }

            updateUI();
        } else {
            detectLocation();
        }
        renderCalendar();
        renderColorSwatches();
    }

    function detectLocation() {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    findClosestIsland(latitude, longitude);
                },
                (error) => {
                    console.warn('Geolocation error:', error);
                    settingsModal.show();
                }
            );
        } else {
            settingsModal.show();
        }
    }

    function findClosestIsland(lat, lon) {
        let minDistance = Infinity;
        let closest = null;
        prayerData.islands.forEach(island => {
            if (island.location && island.location.lat && island.location.long) {
                const dist = Math.sqrt(Math.pow(island.location.lat - lat, 2) + Math.pow(island.location.long - lon, 2));
                if (dist < minDistance) {
                    minDistance = dist;
                    closest = island;
                }
            }
        });

        if (closest) {
            selectedIsland = closest;
            updateUI();
            saveSettings();
        } else {
            settingsModal.show();
        }
    }

    function updateUI() {
        if (!selectedIsland) return;

        locationDisplay.textContent = `${selectedIsland.atoll} ${selectedIsland.island}`;

        // Format Selected Date Display
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const isToday = selectedDate.toDateString() === new Date().toDateString();
        selectedDateDisplay.textContent = isToday ? "Today" : selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        selectedDateDisplay.title = selectedDate.toLocaleDateString(undefined, dateOptions);

        // Get Day of Year for Prayer Times
        const start = new Date(selectedDate.getFullYear(), 0, 0);
        const diff = selectedDate - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        const atollTimes = prayerData.atolls[selectedIsland.atollId];
        const dayTimes = atollTimes.find(t => t.day === dayOfYear) || atollTimes[0];
        const offset = selectedIsland.offset || 0;

        // Current time highlights (only if today)
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        let nextPrayerIndex = -1;

        if (isToday) {
            for (let i = 0; i < prayerKeys.length; i++) {
                if ((dayTimes[prayerKeys[i]] + offset) > currentMinutes) {
                    nextPrayerIndex = i;
                    break;
                }
            }
            if (nextPrayerIndex === -1) nextPrayerIndex = 0; // Roll over to Fajr

            // Calculate Time to Next Prayer
            const nextMinutes = dayTimes[prayerKeys[nextPrayerIndex]] + offset;
            let diffMins = nextMinutes - currentMinutes;

            // If it rolled over to tomorrow's Fajr
            if (diffMins <= 0) diffMins += 1440;

            const h = Math.floor(diffMins / 60);
            const m = diffMins % 60;
            const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
            nextPrayerCountdown.textContent = `${prayerNames[nextPrayerIndex]} in ${timeStr}`;
            nextPrayerCountdown.style.display = 'block';
        } else {
            nextPrayerCountdown.style.display = 'none';
        }

        // Render Prayer Times
        prayerTimesList.innerHTML = '';
        prayerKeys.forEach((key, index) => {
            const minutes = dayTimes[key] + offset;
            const timeStr = formatTime(minutes);
            const isNext = isToday && (index === nextPrayerIndex);

            const item = document.createElement('div');
            item.className = `list-group-item border-0 ${isNext ? 'prayer-active-container' : ''}`;
            item.innerHTML = `
                ${isNext ? '<div class="prayer-active-bg"></div>' : ''}
                <div class="prayer-time-row">
                    <span class="prayer-name">${prayerNames[index]}</span>
                    <span class="prayer-time">${timeStr}</span>
                </div>
            `;
            prayerTimesList.appendChild(item);
        });

        // Render Astronomy Info
        renderAstronomy(selectedDate);
    }

    // --- Calendar Logic ---
    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const month = currentCalendarDate.getMonth();
        const year = currentCalendarDate.getFullYear();

        calendarMonthYear.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentCalendarDate);

        // Day Headers
        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
            const div = document.createElement('div');
            div.className = 'calendar-day-header';
            div.textContent = day;
            calendarGrid.appendChild(div);
        });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty slots
        for (let i = 0; i < firstDay; i++) {
            const div = document.createElement('div');
            div.className = 'calendar-day empty';
            calendarGrid.appendChild(div);
        }

        // Days
        const today = new Date();
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const div = document.createElement('div');
            div.className = 'calendar-day';
            div.textContent = d;

            if (date.toDateString() === today.toDateString()) div.classList.add('today');
            if (date.toDateString() === selectedDate.toDateString()) div.classList.add('selected');

            div.addEventListener('click', () => {
                selectedDate = new Date(date);
                updateUI();
                renderCalendar();
            });

            calendarGrid.appendChild(div);
        }
    }

    prevMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setDate(1);
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });
    nextMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setDate(1);
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
    todayBtn.addEventListener('click', () => {
        selectedDate = new Date();
        currentCalendarDate = new Date();
        updateUI();
        renderCalendar();
    });

    // --- Color Swatches ---
    function renderColorSwatches() {
        colorSwatchesContainer.innerHTML = '';
        presetColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = `color-swatch ${color === currentPrimaryColor ? 'active' : ''}`;
            swatch.style.backgroundColor = color;
            swatch.title = color;

            swatch.addEventListener('click', () => {
                applyThemeColor(color);
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
            });

            colorSwatchesContainer.appendChild(swatch);
        });
    }

    // --- Astronomy & Helpers ---
    function renderAstronomy(date) {
        const lat = (selectedIsland && selectedIsland.location) ? selectedIsland.location.lat : 4.175;
        const lon = (selectedIsland && selectedIsland.location) ? selectedIsland.location.long : 73.509;

        const sunTimes = SunCalc.getTimes(date, lat, lon);
        const moonTimes = SunCalc.getMoonTimes(date, lat, lon);
        const moonIllum = SunCalc.getMoonIllumination(date);

        const astroData = [
            { label: 'Sunrise', time: sunTimes.sunrise, icon: 'wb_sunny', color: 'text-warning' },
            { label: 'Sunset', time: sunTimes.sunset, icon: 'nights_stay', color: 'text-primary' },
            { label: 'Moonrise', time: moonTimes.rise, icon: 'arrow_upward', color: 'text-secondary' },
            { label: 'Moonset', time: moonTimes.set, icon: 'arrow_downward', color: 'text-secondary' }
        ];

        astronomyList.innerHTML = '';
        astroData.forEach(item => {
            const timeStr = item.time ? formatJSDate(item.time) : '--:--';
            const col = document.createElement('div');
            col.className = 'col-6 col-sm-3';
            col.innerHTML = `
                <div class="astronomy-item">
                    <span class="material-icons astronomy-icon ${item.color}">${item.icon}</span>
                    <div class="small text-muted">${item.label}</div>
                    <div class="fw-medium">${timeStr}</div>
                </div>
            `;
            astronomyList.appendChild(col);
        });

        // Moon Phase SVG Logic
        const phase = moonIllum.phase;
        let phaseName = "";
        if (phase <= 0.03 || phase >= 0.97) phaseName = "New Moon";
        else if (phase < 0.22) phaseName = "Waxing Crescent";
        else if (phase < 0.28) phaseName = "First Quarter";
        else if (phase < 0.47) phaseName = "Waxing Gibbous";
        else if (phase < 0.53) phaseName = "Full Moon";
        else if (phase < 0.72) phaseName = "Waning Gibbous";
        else if (phase < 0.78) phaseName = "Last Quarter";
        else phaseName = "Waning Crescent";

        const r = 50;
        let sweep1 = phase <= 0.5 ? 1 : 0;
        let sweep2 = (phase <= 0.25 || phase >= 0.75) ? 0 : 1;
        let xfactor = Math.cos(phase * 2 * Math.PI) * r;
        const path = `M 50 0 A 50 50 0 1 ${sweep1} 50 100 A ${Math.abs(xfactor)} 50 0 1 ${sweep2} 50 0`;

        moonPhaseIcon.innerHTML = `<div class="moon-svg-container"><svg viewBox="0 0 100 100"><path d="${path}" class="moon-lit" /></svg></div>`;
        moonPhaseName.textContent = phaseName;
    }

    function formatTime(totalMinutes) {
        let h = Math.floor(totalMinutes / 60);
        let m = totalMinutes % 60;
        if (use24Hour) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    function formatJSDate(date) {
        let h = date.getHours();
        let m = date.getMinutes();
        if (use24Hour) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    function populateAtolls() {
        const atolls = [...new Set(prayerData.islands.map(i => i.atoll))].sort();
        atolls.forEach(atoll => {
            const opt = document.createElement('option');
            opt.value = atoll; opt.textContent = atoll;
            atollSelect.appendChild(opt);
        });
    }

    atollSelect.addEventListener('change', () => {
        const atoll = atollSelect.value;
        islandSelect.innerHTML = '<option value="">Choose Island...</option>';
        if (atoll) {
            const islands = prayerData.islands.filter(i => i.atoll === atoll).sort((a, b) => a.island.localeCompare(b.island));
            islands.forEach(isl => {
                const opt = document.createElement('option');
                opt.value = isl.islandId; opt.textContent = isl.island;
                islandSelect.appendChild(opt);
            });
            islandSelect.disabled = false;
        } else {
            islandSelect.disabled = true;
        }
    });

    saveSettingsBtn.addEventListener('click', () => {
        const id = parseInt(islandSelect.value);
        if (id) {
            selectedIsland = prayerData.islands.find(i => i.islandId === id);
            use24Hour = timeFormatToggle.checked;

            if (darkModeToggle.checked) {
                document.documentElement.setAttribute('data-bs-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-bs-theme');
            }

            applyThemeColor(currentPrimaryColor);

            updateUI();
            saveSettings();
            settingsModal.hide();
        } else alert('Please select an island.');
    });

    function saveSettings() {
        if (selectedIsland) {
            localStorage.setItem('mvPrayerSettings', JSON.stringify({
                islandId: selectedIsland.islandId,
                use24Hour: use24Hour,
                darkMode: darkModeToggle.checked,
                primaryColor: currentPrimaryColor
            }));
        }
    }

    function syncSettingsModal() {
        if (!selectedIsland) return;
        atollSelect.value = selectedIsland.atoll;
        atollSelect.dispatchEvent(new Event('change'));
        islandSelect.value = selectedIsland.islandId;
        timeFormatToggle.checked = use24Hour;
        darkModeToggle.checked = document.documentElement.getAttribute('data-bs-theme') === 'dark';

        // Sync color highlights with actually applied primary color
        const rootStyle = getComputedStyle(document.documentElement);
        const activeColor = rootStyle.getPropertyValue('--primary-color').trim();
        if (activeColor) {
            currentPrimaryColor = activeColor;
            document.querySelectorAll('.color-swatch').forEach(s => {
                const swatchColor = s.getAttribute('title');
                s.classList.toggle('active', swatchColor.toLowerCase() === activeColor.toLowerCase());
            });
        }
    }

    document.getElementById('settingsModal').addEventListener('show.bs.modal', syncSettingsModal);

    function applyThemeColor(hex) {
        currentPrimaryColor = hex;
        const root = document.documentElement;
        root.style.setProperty('--primary-color', hex);

        // RGB for shadows
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        root.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);

        // Variant (darker) for hover
        const darken = (c, amt) => Math.max(0, c - amt);
        const variant = `rgb(${darken(r, 20)}, ${darken(g, 20)}, ${darken(b, 20)})`;
        root.style.setProperty('--primary-variant', variant);
    }

    setInterval(() => { if (selectedDate.toDateString() === new Date().toDateString()) updateUI(); }, 60000);
});
