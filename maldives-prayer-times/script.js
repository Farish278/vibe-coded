document.addEventListener('DOMContentLoaded', () => {
    let prayerData = null;
    let selectedIsland = null;
    let use24Hour = false;
    let settingsModal = null;
    // Cached settings for performance
    let cachedNotificationSettings = {};
    let lastCheckedMinute = -1;
    let cachedIqamahToggles = {};
    let cachedIqamahOffsets = {};
    const iqamahDefaults = { fajr: 15, dhuhr: 12, asr: 12, maghrib: 8, isha: 10 };
    let manifestTemplate = null;
    let currentManifestUrl = null;

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
    const shareBgUpload = document.getElementById('shareBgUpload');
    const resetShareBgBtn = document.getElementById('resetShareBg');

    const pwaNotifSettings = document.getElementById('pwa-notification-settings');
    const prayerNotifToggles = document.getElementById('prayer-notif-toggles');
    const iqamahSettingsContainer = document.getElementById('iqamah-settings-container');

    const DEFAULT_SHARE_BG = 'snapsaga-sFfZrcEiqtc-unsplash.jpg';
    let customShareBg = localStorage.getItem('customShareBg') || null;

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
    const shareBtn = document.getElementById('shareBtn');
    // const shareModal = new bootstrap.Modal(document.getElementById('shareModal')); // Using data-bs-toggle for mobile compatibility
    const shareCanvas = document.getElementById('shareCanvas');
    const shareImageContainer = document.getElementById('shareImageContainer');
    const downloadShareImg = document.getElementById('downloadShareImg');

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

    // PWA & Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('service-worker.js')
                .then(reg => console.log('Service Worker registered:', reg))
                .catch(err => console.log('Service Worker registration failed:', err));
        });
    }

    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        // Only show custom prompt on mobile
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            e.preventDefault();
            deferredPrompt = e;
            showInstallPrompt();
        }
    });

    function showInstallPrompt(isiOS = false) {
        if (document.querySelector('.install-prompt')) return;

        const promptDiv = document.createElement('div');
        promptDiv.className = 'install-prompt';

        if (isiOS) {
            promptDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="icon-192.png" width="40" height="40" class="me-3 rounded shadow-sm">
                    <div class="text-start">
                        <div class="fw-bold small">Add to Home Screen</div>
                        <div class="text-muted" style="font-size: 0.75rem;">Tap <span class="material-icons" style="font-size: 14px; vertical-align: middle;">share</span> then "Add to Home Screen"</div>
                    </div>
                </div>
                <button id="dismiss-install" class="btn btn-sm btn-light rounded-pill px-3">Got it</button>
            `;
        } else {
            promptDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="icon-192.png" width="40" height="40" class="me-3 rounded shadow-sm">
                    <div class="text-start">
                        <div class="fw-bold small">Install MV Prayer</div>
                        <div class="text-muted" style="font-size: 0.75rem;">Fast, offline access & notifications</div>
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <button id="dismiss-install" class="btn btn-sm btn-light rounded-pill px-3">Not Now</button>
                    <button id="accept-install" class="btn btn-sm btn-primary rounded-pill px-3">Install</button>
                </div>
            `;
        }
        document.body.appendChild(promptDiv);

        const acceptBtn = document.getElementById('accept-install');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`User choice: ${outcome}`);
                    deferredPrompt = null;
                }
                promptDiv.remove();
            });
        }

        document.getElementById('dismiss-install').addEventListener('click', () => {
            promptDiv.remove();
        });
    }

    // Manual check for iOS
    function checkIOSPrompt() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        if (isIOS && !isStandalone) {
            showInstallPrompt(true);
        }
    }
    setTimeout(checkIOSPrompt, 3000);

    function initApp() {
        // Set current year in footer
        document.getElementById('current-year').innerText = new Date().getFullYear();

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
            } else {
                applyThemeColor(currentPrimaryColor);
            }

            // Load notification settings
            cachedNotificationSettings = settings.notifications || {};
            cachedIqamahToggles = settings.iqamahToggles || {};
            cachedIqamahOffsets = settings.iqamahOffsets || { ...iqamahDefaults };
            initNotificationUI(cachedNotificationSettings);

            updateUI();
        } else {
            initNotificationUI({}); // Initialize UI even without saved settings
            detectLocation();
        }
        renderCalendar();
        renderColorSwatches();
        fetchManifestTemplate();
    }

    async function fetchManifestTemplate() {
        try {
            const response = await fetch('manifest.json');
            manifestTemplate = await response.json();
            // Apply current color to manifest immediately if we already have it
            if (currentPrimaryColor) {
                updateDynamicManifest(currentPrimaryColor);
            }
        } catch (err) {
            console.error('Failed to fetch manifest template:', err);
        }
    }

    function updateDynamicManifest(hex) {
        if (!manifestTemplate) return;

        const isDarkMode = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const bgColor = isDarkMode ? '#121212' : '#ffffff';

        // Update theme_color and background_color in the template
        const dynamicManifest = {
            ...manifestTemplate,
            theme_color: hex,
            background_color: bgColor
        };

        // Create Blob and URL
        const blob = new Blob([JSON.stringify(dynamicManifest)], { type: 'application/json' });
        const newManifestUrl = URL.createObjectURL(blob);

        // Update the manifest link in head
        let manifestLink = document.querySelector('link[rel="manifest"]');
        if (!manifestLink) {
            manifestLink = document.createElement('link');
            manifestLink.rel = 'manifest';
            document.head.appendChild(manifestLink);
        }

        // Revoke old URL to save memory
        if (currentManifestUrl) {
            URL.revokeObjectURL(currentManifestUrl);
        }

        manifestLink.setAttribute('href', newManifestUrl);
        currentManifestUrl = newManifestUrl;
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
        const dayOfYear = getDayOfYear(selectedDate);

        const atollTimes = prayerData.atolls[selectedIsland.atollId];
        const dayTimes = atollTimes.find(t => t.day === dayOfYear) || atollTimes[0];
        const offset = selectedIsland.offset || 0;

        // Check for notifications
        if (isToday) {
            checkNotifications(dayTimes, offset);
        }

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

    document.getElementById('shareModal').addEventListener('shown.bs.modal', () => {
        generateShareImage();
    });

    function generateShareImage() {
        if (!selectedIsland) return;

        const ctx = shareCanvas.getContext('2d');
        const bgImg = new Image();
        bgImg.src = customShareBg || DEFAULT_SHARE_BG;

        bgImg.onload = () => {
            // Calculate Cover dimensions
            const iw = bgImg.width;
            const ih = bgImg.height;
            const ratio = iw / ih;
            const targetRatio = 1; // 1024 / 1024

            let sx, sy, sWidth, sHeight;
            if (ratio > targetRatio) {
                sWidth = ih * targetRatio;
                sHeight = ih;
                sx = (iw - sWidth) / 2;
                sy = 0;
            } else {
                sWidth = iw;
                sHeight = iw / targetRatio;
                sx = 0;
                sy = (ih - sHeight) / 2;
            }

            // 1. Draw Background with Faded Filter (Cover)
            ctx.save();
            ctx.filter = 'brightness(1.1) contrast(0.8) saturate(0.5) sepia(0.2)';
            ctx.drawImage(bgImg, sx, sy, sWidth, sHeight, 0, 0, 1024, 1024);
            ctx.restore();

            // 2. Draw Glassmorphic Overlay with Backdrop Blur
            const marginX = 60;
            const cardHeight = 780;
            const marginY = (1024 - cardHeight) / 2 - 30;
            const cardWidth = 1024 - (marginX * 2);
            const r = 60; // Softer squirkle corners

            const createRoundedRect = (c) => {
                c.beginPath();
                c.moveTo(marginX + r, marginY);
                c.lineTo(marginX + cardWidth - r, marginY);
                c.quadraticCurveTo(marginX + cardWidth, marginY, marginX + cardWidth, marginY + r);
                c.lineTo(marginX + cardWidth, marginY + cardHeight - r);
                c.quadraticCurveTo(marginX + cardWidth, marginY + cardHeight, marginX + cardWidth - r, marginY + cardHeight);
                c.lineTo(marginX + r, marginY + cardHeight);
                c.quadraticCurveTo(marginX, marginY + cardHeight, marginX, marginY + cardHeight - r);
                c.lineTo(marginX, marginY + r);
                c.quadraticCurveTo(marginX, marginY, marginX + r, marginY);
                c.closePath();
            };

            ctx.save();
            createRoundedRect(ctx);
            ctx.clip();
            ctx.filter = 'blur(5px) brightness(0.8) contrast(0.9) saturate(0.8)';
            ctx.drawImage(bgImg, sx, sy, sWidth, sHeight, 0, 0, 1024, 1024);
            ctx.restore();

            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // More translucent card
            createRoundedRect(ctx);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            // 3. Data Centering Logic
            const contentTotalHeight = 650;
            const contentStartY = marginY + (cardHeight - contentTotalHeight) / 2;
            const bodyStartY = contentStartY + 210;

            // Header Text (Premium White)
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.font = 'bold 54px Roboto, sans-serif';
            ctx.fillText(`${selectedIsland.atoll} ${selectedIsland.island}`.toUpperCase(), 512, contentStartY + 50);

            const dateStr = selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            ctx.font = '300 28px Roboto, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(dateStr, 512, contentStartY + 95);

            // Header Separator (Translucent White)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.moveTo(marginX + 80, contentStartY + 140);
            ctx.lineTo(1024 - marginX - 80, contentStartY + 140);
            ctx.stroke();

            // 4. Two-Column Layout
            const leftColX = marginX + 60;
            const bodyHeight = 500;
            const bodyCenterY = bodyStartY + (bodyHeight / 2);

            // Vertical Separator (Translucent White)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.moveTo(512, bodyStartY - 30);
            ctx.lineTo(512, bodyStartY + bodyHeight - 30); // Shortened for bottom margin
            ctx.stroke();

            // Left Column: Prayer Times
            const colPadding = 40;
            const prayerStartY = bodyCenterY - (bodyHeight / 2) + colPadding - 30; // Shifted up
            const prayerInterval = (bodyHeight - colPadding * 2) / 4;

            const dayOfYear = getDayOfYear(selectedDate);
            const atollTimes = prayerData.atolls[selectedIsland.atollId];
            const dayTimes = atollTimes.find(t => t.day === dayOfYear) || atollTimes[0];
            const offset = selectedIsland.offset || 0;

            let py = prayerStartY;
            prayerNames.forEach((name, i) => {
                if (name === "Sunrise") return;

                const minutes = dayTimes[prayerKeys[i]] + offset;
                const timeStr = formatTime(minutes);

                ctx.textAlign = 'left';
                ctx.font = '500 36px Roboto, sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillText(name, leftColX, py);

                ctx.textAlign = 'right';
                ctx.font = 'bold 36px Roboto, sans-serif';
                ctx.fillText(timeStr, 512 - 40, py);
                py += prayerInterval;
            });

            // Right Column: Astronomy Grid
            const lat = (selectedIsland && selectedIsland.location && selectedIsland.location.lat !== null) ? selectedIsland.location.lat : 4.175;
            const lon = (selectedIsland && selectedIsland.location && selectedIsland.location.long !== null) ? selectedIsland.location.long : 73.509;
            const sunTimes = SunCalc.getTimes(selectedDate, lat, lon);
            const moonTimes = SunCalc.getMoonTimes(selectedDate, lat, lon);
            const moonIllum = SunCalc.getMoonIllumination(selectedDate);

            const rcx = 512 + (1024 - marginX - 512) / 2;
            const astroTotalHeight = 320; // Approx height from phase title to sun/moon set
            const astroStartY = bodyCenterY - (astroTotalHeight / 2);

            // 1. Moon Phase (Top)
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px Roboto, sans-serif';
            ctx.fillText('🌗 Moon Phase', rcx, astroStartY);

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

            ctx.font = '400 24px Roboto, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(phaseName, rcx, astroStartY + 125); // Moved down slightly

            // Moon drawing logic corrected: sweep1=1 is waxing (right side lit)
            // Canvas CW/CCW logic is different from SVG
            let isWaxing = phase <= 0.5;
            let isTransition = (phase <= 0.25 || (phase > 0.5 && phase <= 0.75));

            const mr = 40;
            const mx = rcx;
            const my = astroStartY + 60;
            const xfactor = Math.cos(phase * 2 * Math.PI) * mr;

            ctx.save();
            ctx.translate(mx, my);

            // 1. Draw the "dark" part of the moon (base circle)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(0, 0, mr, 0, Math.PI * 2);
            ctx.fill();

            // 2. Draw the "lit" part
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            // Semi-circle (dominant side)
            // If waxing: right side (6 to 12 CCW)
            // If waning: left side (6 to 12 CW)
            ctx.arc(0, 0, mr, Math.PI / 2, -Math.PI / 2, isWaxing);

            // Terminator (ellipse)
            // If phase 0-0.25 or 0.5-0.75: needs to add/subtract to right side
            // If transition: CCW=true draws left side, CCW=false draws right
            ctx.ellipse(0, 0, Math.abs(xfactor), mr, 0, -Math.PI / 2, Math.PI / 2, !isTransition);
            ctx.fill();
            ctx.restore();

            // 2. Sun and Moon Data (Bottom)
            const subStartY = astroStartY + 230;
            const subL = 512 + 100;
            const subR = 1024 - marginX - 100;

            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 28px Roboto, sans-serif';
            ctx.fillText('☀️ Sun', subL, subStartY);

            ctx.font = '400 22px Roboto, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(`Rise: ${formatJSDate(sunTimes.sunrise)}`, subL, subStartY + 35);
            ctx.fillText(`Set:  ${formatJSDate(sunTimes.sunset)}`, subL, subStartY + 65);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 28px Roboto, sans-serif';
            ctx.fillText('🌙 Moon', subR, subStartY);

            ctx.font = '400 22px Roboto, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(`Rise: ${moonTimes.rise ? formatJSDate(moonTimes.rise) : '--:--'}`, subR, subStartY + 35);
            ctx.fillText(`Set:  ${moonTimes.set ? formatJSDate(moonTimes.set) : '--:--'}`, subR, subStartY + 65);

            // Website Credit
            ctx.textAlign = 'center';
            ctx.font = '300 20px Roboto, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillText('Maldives Prayer Times | Farish278', 512, 1000);

            const dataUrl = shareCanvas.toDataURL('image/png');
            shareImageContainer.innerHTML = `<img src="${dataUrl}" class="img-fluid rounded" alt="Shareable Prayer Times">`;
            downloadShareImg.href = dataUrl;
        };

        bgImg.onerror = () => {
            shareImageContainer.innerHTML = '<div class="alert alert-danger">Error loading background image.</div>';
        };
    }

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
        const lat = (selectedIsland && selectedIsland.location && selectedIsland.location.lat !== null) ? selectedIsland.location.lat : 4.175;
        const lon = (selectedIsland && selectedIsland.location && selectedIsland.location.long !== null) ? selectedIsland.location.long : 73.509;

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
        let sweep2;
        if (phase <= 0.25) sweep2 = 0;
        else if (phase <= 0.50) sweep2 = 1;
        else if (phase <= 0.75) sweep2 = 0;
        else sweep2 = 1;
        let xfactor = Math.cos(phase * 2 * Math.PI) * r;
        const path = `M 50 0 A 50 50 0 1 ${sweep1} 50 100 A ${Math.abs(xfactor)} 50 0 1 ${sweep2} 50 0`;

        moonPhaseIcon.innerHTML = `<div class="moon-svg-container"><svg viewBox="0 0 100 100"><path d="${path}" class="moon-lit" /></svg></div>`;
        moonPhaseName.textContent = phaseName;
    }

    function formatTime(totalMinutes) {
        let h = Math.floor(totalMinutes / 60);
        let m = totalMinutes % 60;
        return formatTimeHelper(h, m);
    }

    function formatJSDate(date) {
        let h = date.getHours();
        let m = date.getMinutes();
        return formatTimeHelper(h, m);
    }

    function formatTimeHelper(h, m) {
        if (use24Hour) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    function getDayOfYear(date) {
        const now = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const start = new Date(Date.UTC(date.getFullYear(), 0, 0));
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
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

    shareBgUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Create an off-screen canvas for resizing
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1024;
                    const MAX_HEIGHT = 1024;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG to save space in localStorage
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

                    try {
                        customShareBg = dataUrl;
                        localStorage.setItem('customShareBg', customShareBg);
                    } catch (err) {
                        alert('Could not save image. Try a smaller file or different format.');
                        console.error('Storage error:', err);
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    resetShareBgBtn.addEventListener('click', () => {
        customShareBg = null;
        localStorage.removeItem('customShareBg');
        shareBgUpload.value = '';
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

            // Save notifications
            const notifEnabled = {};
            const iqamahToggles = {};
            const iqamahOffsets = {};

            prayerKeys.forEach(key => {
                const el = document.getElementById(`notif-${key}`);
                if (el) notifEnabled[key] = el.checked;
                else notifEnabled[key] = true;

                if (key !== 'sunrise') {
                    const iqT = document.getElementById(`iqamah-toggle-${key}`);
                    const iqO = document.getElementById(`iqamah-offset-${key}`);
                    if (iqT) iqamahToggles[key] = iqT.checked;
                    if (iqO) iqamahOffsets[key] = parseInt(iqO.value) || iqamahDefaults[key];
                }
            });

            updateUI();
            saveSettings(notifEnabled, iqamahToggles, iqamahOffsets);
            settingsModal.hide();
        } else alert('Please select an island.');
    });

    function saveSettings(notifEnabled = null, iqamahToggles = null, iqamahOffsets = null) {
        if (selectedIsland) {
            const currentSettings = JSON.parse(localStorage.getItem('mvPrayerSettings') || '{}');

            cachedNotificationSettings = notifEnabled || currentSettings.notifications || (function () {
                const df = {}; prayerKeys.forEach(k => df[k] = true); return df;
            })();

            cachedIqamahToggles = iqamahToggles || currentSettings.iqamahToggles || {};
            cachedIqamahOffsets = iqamahOffsets || currentSettings.iqamahOffsets || { ...iqamahDefaults };

            const newSettings = {
                islandId: selectedIsland.islandId,
                use24Hour: use24Hour,
                darkMode: darkModeToggle.checked,
                primaryColor: currentPrimaryColor,
                notifications: cachedNotificationSettings,
                iqamahToggles: cachedIqamahToggles,
                iqamahOffsets: cachedIqamahOffsets
            };
            localStorage.setItem('mvPrayerSettings', JSON.stringify(newSettings));
        }
    }

    function initNotificationUI(notifs) {
        prayerNotifToggles.innerHTML = '';
        iqamahSettingsContainer.innerHTML = '';

        const settings = JSON.parse(localStorage.getItem('mvPrayerSettings') || '{}');
        const it = settings.iqamahToggles || {};
        const io = settings.iqamahOffsets || { ...iqamahDefaults };

        // 1. Adhan (Adhan) Notifications Section
        prayerKeys.forEach((key, i) => {
            const isEnabled = notifs[key] !== false;
            const row = document.createElement('div');
            row.className = 'form-check form-switch mb-2';
            row.innerHTML = `
                <input class="form-check-input" type="checkbox" role="switch" id="notif-${key}" ${isEnabled ? 'checked' : ''}>
                <label class="form-check-label fw-medium" for="notif-${key}">${prayerNames[i]} Adhan</label>
            `;
            prayerNotifToggles.appendChild(row);
        });

        // 2. Iqamah Section (Inside a Card-like Container)
        const iqamahKeys = prayerKeys.filter(k => k !== 'sunrise');

        const iqCard = document.createElement('div');
        iqCard.className = 'card border-0 bg-light-subtle shadow-sm rounded-4 mb-3';
        iqCard.innerHTML = `
            <div class="card-body p-3">
                <div class="form-check form-switch mb-3 pb-3 border-bottom border-light">
                    <input class="form-check-input" type="checkbox" role="switch" id="iqamah-master-toggle">
                    <label class="form-check-label fw-bold" for="iqamah-master-toggle">Iqamah Reminders</label>
                    <div class="small text-muted" style="font-size: 0.75rem;">Enable or disable all reminders at once</div>
                </div>
                <div id="iqamah-children-container"></div>
            </div>
        `;
        iqamahSettingsContainer.appendChild(iqCard);

        const masterToggle = iqCard.querySelector('#iqamah-master-toggle');
        const childrenContainer = iqCard.querySelector('#iqamah-children-container');

        iqamahKeys.forEach((key) => {
            const iqEnabled = it[key] || false;
            const iqMins = io[key] || iqamahDefaults[key];
            const iqIdx = prayerKeys.indexOf(key);

            const iqRow = document.createElement('div');
            iqRow.className = 'iqamah-row mb-3 p-2 rounded-3 border-start border-4';
            iqRow.style.borderStartColor = 'var(--primary-color)';
            iqRow.innerHTML = `
                <div class="form-check form-switch mb-1">
                    <input class="form-check-input iqamah-child-toggle" type="checkbox" role="switch" id="iqamah-toggle-${key}" ${iqEnabled ? 'checked' : ''}>
                    <label class="form-check-label fw-medium" for="iqamah-toggle-${key}">${prayerNames[iqIdx]} Iqamah</label>
                </div>
                <div class="ps-4 mt-1" id="iqamah-container-${key}" style="display: ${iqEnabled ? 'block' : 'none'}">
                    <div class="d-flex align-items-center gap-2">
                        <input type="number" id="iqamah-offset-${key}" class="form-control form-control-sm rounded-pill text-center iqamah-offset-input" style="width: 55px;" value="${iqMins}" min="1" max="60">
                        <span class="small text-muted">mins after Adhan</span>
                    </div>
                </div>
            `;
            childrenContainer.appendChild(iqRow);

            const iqToggle = iqRow.querySelector(`#iqamah-toggle-${key}`);
            const iqCont = iqRow.querySelector(`#iqamah-container-${key}`);

            iqToggle.addEventListener('change', () => {
                iqCont.style.display = iqToggle.checked ? 'block' : 'none';
                updateMasterToggleState();
            });
        });

        const childToggles = childrenContainer.querySelectorAll('.iqamah-child-toggle');

        let isBatchUpdating = false;
        function updateMasterToggleState() {
            if (isBatchUpdating) return;
            const checkedCount = Array.from(childToggles).filter(t => t.checked).length;
            masterToggle.checked = checkedCount === childToggles.length;
            masterToggle.indeterminate = checkedCount > 0 && checkedCount < childToggles.length;
        }

        masterToggle.addEventListener('change', () => {
            const target = masterToggle.checked;
            isBatchUpdating = true;
            childToggles.forEach(t => {
                if (t.checked !== target) {
                    t.checked = target;
                    t.dispatchEvent(new Event('change'));
                }
            });
            isBatchUpdating = false;
            updateMasterToggleState();
        });

        updateMasterToggleState();
        checkPWAState();
    }

    function checkPWAState() {
        // Simple check for standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        if (isStandalone) {
            pwaNotifSettings.style.display = 'block';
            requestNotificationPermission();
        }
    }

    function requestNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    console.log('Notification permission:', permission);
                });
            }
        }
    }

    function checkNotifications(dayTimes, offset) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();

        // Avoid multiple checks for the same minute
        if (currentMins === lastCheckedMinute) return;
        lastCheckedMinute = currentMins;

        prayerKeys.forEach((key, i) => {
            const prayerTime = dayTimes[key] + offset;

            // EXACT TIME NOTIFICATION
            if (cachedNotificationSettings[key] && currentMins === prayerTime) {
                sendNotification(`Time for ${prayerNames[i]}`, `It is now time for ${prayerNames[i]} in ${selectedIsland.island}.`);
            }

            // AFTER TIME NOTIFICATION (Iqamah reminder)
            const iqEnabled = cachedIqamahToggles[key];
            const iqOffset = cachedIqamahOffsets[key] || iqamahDefaults[key] || 15;
            if (key !== 'sunrise' && iqEnabled && currentMins === (prayerTime + iqOffset)) {
                sendNotification(`${prayerNames[i]} Iqamah`, `${prayerNames[i]} prayer is starting soon (Iqamah reminder).`);
            }
        });
    }

    function sendNotification(title, body) {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    body: body,
                    icon: 'favicon.png',
                    badge: 'favicon.png',
                    vibrate: [200, 100, 200]
                });
            });
        } else {
            new Notification(title, { body: body, icon: 'favicon.png' });
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

        // Update PWA theme color meta tag
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) {
            themeMeta.setAttribute('content', hex);
        }

        // Update dynamic manifest
        updateDynamicManifest(hex);
    }

    // Check more frequently to trigger exactly when minute changes
    setInterval(() => {
        if (selectedDate.toDateString() === new Date().toDateString()) updateUI();
    }, 10000);

    function updateDynamicManifest(color) {
        const manifest = {
            "name": "Maldives Prayer Times",
            "short_name": "MV Prayer",
            "start_url": ".",
            "display": "standalone",
            "background_color": color,
            "theme_color": color,
            "icons": [
                {
                    "src": "icon-192.png",
                    "sizes": "192x192",
                    "type": "image/png"
                },
                {
                    "src": "icon-512.png",
                    "sizes": "512x512",
                    "type": "image/png"
                }
            ]
        };
        const stringManifest = JSON.stringify(manifest);
        const blob = new Blob([stringManifest], { type: 'application/json' });
        const manifestURL = URL.createObjectURL(blob);
        const manifestTag = document.querySelector('link[rel="manifest"]');
        if (manifestTag) {
            manifestTag.setAttribute('href', manifestURL);
        }
    }
});
