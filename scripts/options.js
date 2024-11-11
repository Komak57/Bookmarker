// Function to load domain settings into options.html
function loadDomainSettings() {
    const domainList = document.getElementById('domainList');
    domainList.innerHTML = ''; // Clear any existing content

    // const trackedDomains = getDomains();
    getDomains().then((trackedDomains) => {
        // Loop through each domain and create the settings form
        Object.keys(trackedDomains).forEach(domain => {
            const settings = trackedDomains[domain];

            // Create container for domain header
            const _header = document.createElement('div');
            _header.classList.add('domain-header');

            const _title = document.createElement('div');
            _title.classList.add('domain-title');
            _title.innerHTML = domain;
            _header.appendChild(_title);

            const _delete = document.createElement('button');
            _delete.textContent = 'Delete Domain';
            _delete.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();

                delete trackedDomains[domain];
                saveDomains(trackedDomains);
                window.location.reload();
                //chrome.storage.local.set({ trackedDomains: domainList }, displayTrackedDomains);
            });
            _header.appendChild(_delete);

            // Create container for domain header
            const _settings = document.createElement('div');
            _settings.classList.add('domain-settings');

            const _groupMain = document.createElement('div');
            _groupMain.classList.add('settings-group');

            // ====================================
            // Add Media Type select
            // ====================================
            const _mediaTypeLabel = document.createElement('label');
            _mediaTypeLabel.textContent = "Media Type:";
            _groupMain.appendChild(_mediaTypeLabel);
            const _mediaTypeSelect = document.createElement('select');

            for (i = 0; i < categories.length; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = categories[i];
                if (settings.c == i) opt.selected = true;
                _mediaTypeSelect.appendChild(opt);
            }
            _groupMain.appendChild(_mediaTypeSelect);

            // ====================================
            // Add Sort By select
            // ====================================
            const _sortByLabel = document.createElement('label');
            _sortByLabel.textContent = "Sort By:";
            _groupMain.appendChild(_sortByLabel);
            const _sortBySelect = document.createElement('select');

            for (i = 0; i < sortBy.length; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = sortBy[i];
                if (settings.s == i) opt.selected = true;
                _sortBySelect.appendChild(opt);
            };
            _groupMain.appendChild(_sortBySelect);
            _settings.appendChild(_groupMain);

            const _groupObtain = document.createElement('div');
            _groupObtain.classList.add('settings-group');

            const _groupTitlePair = document.createElement('div');
            _groupTitlePair.classList.add('settings-pair');
            // ====================================
            // Create "Obtain Title From" dropdown
            // ====================================
            const _obtainTitleFromLabel = document.createElement('label');
            _obtainTitleFromLabel.textContent = 'Obtain Title From:';
            _groupTitlePair.appendChild(_obtainTitleFromLabel);

            const _obtainTitleFromSelect = document.createElement('select');
            for (i = 0; i < fromOptions.length; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = fromOptions[i];
                if (settings.ot == i) opt.selected = true;
                _obtainTitleFromSelect.appendChild(opt);
            }
            _obtainTitleFromSelect.addEventListener('change', () => {
                updateDomainSetting(trackedDomains, domain, 'ot', parseInt(_obtainTitleFromSelect.value))
                if (settings.ot == 2) {
                    queryTitleMatchLabel.style.display = 'block';
                    queryTitleMatchTextarea.style.display = 'block';
                } else {
                    queryTitleMatchLabel.style.display = 'none';
                    queryTitleMatchTextarea.style.display = 'none';
                }
            });
            _groupTitlePair.appendChild(_obtainTitleFromSelect);

            const queryTitleMatchLabel = document.createElement('label');
            queryTitleMatchLabel.textContent = 'Query Title (CSS Selector or Regex):';
            _groupTitlePair.appendChild(queryTitleMatchLabel);

            const queryTitleMatchTextarea = document.createElement('textarea');
            queryTitleMatchTextarea.value = settings.otm; // Load existing query or leave blank
            queryTitleMatchTextarea.addEventListener('input', () => updateDomainSetting(trackedDomains, domain, 'otm', queryTitleMatchTextarea.value));
            if (settings.ot == 2) {
                queryTitleMatchLabel.style.display = 'block';
                queryTitleMatchTextarea.style.display = 'block';
            } else {
                queryTitleMatchLabel.style.display = 'none';
                queryTitleMatchTextarea.style.display = 'none';
            }
            _groupTitlePair.appendChild(queryTitleMatchTextarea);
            _groupObtain.appendChild(_groupTitlePair);

            const _groupSeasonPair = document.createElement('div');
            _groupSeasonPair.classList.add('settings-pair');

            // ====================================
            // Create "Obtain Season From" dropdown
            // ====================================
            const _obtainSeasonFromLabel = document.createElement('label');
            _obtainSeasonFromLabel.textContent = 'Obtain Season From:';
            _groupSeasonPair.appendChild(_obtainSeasonFromLabel);

            const _obtainSeasonFromSelect = document.createElement('select');
            for (i = 0; i < fromOptions.length; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = fromOptions[i];
                if (settings.os == i) opt.selected = true;
                _obtainSeasonFromSelect.appendChild(opt);
            }
            _obtainSeasonFromSelect.addEventListener('change', () => {
                updateDomainSetting(trackedDomains, domain, 'os', parseInt(_obtainSeasonFromSelect.value))
                if (settings.os == 2) {
                    querySeasonMatchLabel.style.display = 'block';
                    querySeasonMatchTextarea.style.display = 'block';
                } else {
                    querySeasonMatchLabel.style.display = 'none';
                    querySeasonMatchTextarea.style.display = 'none';
                }
            });
            _groupSeasonPair.appendChild(_obtainSeasonFromSelect);

            const querySeasonMatchLabel = document.createElement('label');
            querySeasonMatchLabel.textContent = 'Query Session (CSS Selector or Regex):';
            _groupSeasonPair.appendChild(querySeasonMatchLabel);

            const querySeasonMatchTextarea = document.createElement('textarea');
            querySeasonMatchTextarea.value = settings.osm; // Load existing query or leave blank
            querySeasonMatchTextarea.addEventListener('input', () => updateDomainSetting(trackedDomains, domain, 'osm', querySeasonMatchTextarea.value));
            if (settings.os == 2) {
                querySeasonMatchLabel.style.display = 'block';
                querySeasonMatchTextarea.style.display = 'block';
            } else {
                querySeasonMatchLabel.style.display = 'none';
                querySeasonMatchTextarea.style.display = 'none';
            }
            _groupSeasonPair.appendChild(querySeasonMatchTextarea);
            _groupObtain.appendChild(_groupSeasonPair);

            const _groupEpisodePair = document.createElement('div');
            _groupEpisodePair.classList.add('settings-pair');

            // ====================================
            // Create "Obtain Episode From" dropdown
            // ====================================
            const _obtainEpisodeFromLabel = document.createElement('label');
            _obtainEpisodeFromLabel.textContent = 'Obtain Episode From:';
            _groupEpisodePair.appendChild(_obtainEpisodeFromLabel);

            const _obtainEpisodeFromSelect = document.createElement('select');
            for (i = 0; i < fromOptions.length; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = fromOptions[i];
                if (settings.oe == i) opt.selected = true;
                _obtainEpisodeFromSelect.appendChild(opt);
            }
            _obtainEpisodeFromSelect.addEventListener('change', () => {
                updateDomainSetting(trackedDomains, domain, 'oe', parseInt(_obtainEpisodeFromSelect.value))
                if (settings.oe == 2) {
                    queryEpisodeMatchLabel.style.display = 'block';
                    queryEpisodeMatchTextarea.style.display = 'block';
                } else {
                    queryEpisodeMatchLabel.style.display = 'none';
                    queryEpisodeMatchTextarea.style.display = 'none';
                }
            });
            _groupEpisodePair.appendChild(_obtainEpisodeFromSelect);

            const queryEpisodeMatchLabel = document.createElement('label');
            queryEpisodeMatchLabel.textContent = 'Query Episode (CSS Selector or Regex):';
            _groupEpisodePair.appendChild(queryEpisodeMatchLabel);

            const queryEpisodeMatchTextarea = document.createElement('textarea');
            queryEpisodeMatchTextarea.value = settings.oem; // Load existing query or leave blank
            queryEpisodeMatchTextarea.addEventListener('input', () => updateDomainSetting(trackedDomains, domain, 'oem', queryEpisodeMatchTextarea.value));
            if (settings.oe == 2) {
                queryEpisodeMatchLabel.style.display = 'block';
                queryEpisodeMatchTextarea.style.display = 'block';
            } else {
                queryEpisodeMatchLabel.style.display = 'none';
                queryEpisodeMatchTextarea.style.display = 'none';
            }
            _groupEpisodePair.appendChild(queryEpisodeMatchTextarea);
            _groupObtain.appendChild(_groupEpisodePair);
            _settings.appendChild(_groupObtain);

            // ====================================
            // Create "Extra" options
            // ====================================
            const _groupExtras = document.createElement('div');
            _groupExtras.classList.add('settings-group');

            // Create "Ignore Episode Match" checkbox
            const _ignoreEpisodeLabel = document.createElement('label');
            _ignoreEpisodeLabel.textContent = 'Ignore Episode Match:';
            _groupExtras.appendChild(_ignoreEpisodeLabel);

            const _ignoreEpisodeCheckbox = document.createElement('input');
            _ignoreEpisodeCheckbox.type = 'checkbox';
            _ignoreEpisodeCheckbox.checked = settings.ie;
            _ignoreEpisodeCheckbox.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 'ie', _ignoreEpisodeCheckbox.checked));
            _groupExtras.appendChild(_ignoreEpisodeCheckbox);

            // Create "Notify on Episode Skip" checkbox
            const _notifyLabel = document.createElement('label');
            _notifyLabel.textContent = 'Notify on Episode Skip:';
            _groupExtras.appendChild(_notifyLabel);

            const _notifyCheckbox = document.createElement('input');
            _notifyCheckbox.type = 'checkbox';
            _notifyCheckbox.checked = settings.n;
            _notifyCheckbox.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 'n', _notifyCheckbox.checked));
            _groupExtras.appendChild(_notifyCheckbox);
            _settings.appendChild(_groupExtras);

            // Add "Move To" domain transfer functionality
            const _moveToLabel = document.createElement('label');
            _moveToLabel.textContent = 'Move Episodes To:';
            _settings.appendChild(_moveToLabel);

            const _moveToSelect = document.createElement('select');
            _moveToSelect.innerHTML = `<option value="">Select Domain</option>`;
            Object.keys(trackedDomains).forEach(otherDomain => {
                if (otherDomain !== domain) {
                    const opt = document.createElement('option');
                    opt.value = otherDomain;
                    opt.textContent = otherDomain;
                    _moveToSelect.appendChild(opt);
                }
            });
            // moveToSelect.addEventListener('change', () => moveEpisodes(trackedDomains, domain, moveToSelect.value));
            _settings.appendChild(_moveToSelect);

            // ====================================
            // Create "Move All" options
            // ====================================
            const _moveToButton = document.createElement('button');
            _moveToButton.textContent = 'Move All';
            _moveToButton.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();

                moveEpisodes(trackedDomains, domain, _moveToSelect.value);
                window.location.reload();
            });
            _settings.appendChild(_moveToButton);

            _header.addEventListener('click', (event) => {
                _settings.style.display = _settings.style.display === 'block' ? 'none' : 'block';
            });
            // Add the header to the page.
            domainList.appendChild(_header);

            // Add the settings to the page.
            domainList.appendChild(_settings);
        });
    });
}

// Function to update domain setting
function updateDomainSetting(trackedDomains, domain, settingKey, newValue) {
    log('log', `Updating ${settingKey} to ${newValue}`);
    if (trackedDomains[domain]) {
        trackedDomains[domain][settingKey] = newValue;
        saveDomains(trackedDomains);
        // saveToStorage(trackedDomains);
    }
    switch (settingKey) {
        case 'otm':
        case 'osm':
        case 'oem':
            break;
        default:
            // window.location.reload();
    }
    //
}

// Function to move episodes to another domain
function moveEpisodes(Domains, fromDomain, toDomain) {
    // Get Domain ID's
    if (fromDomain && toDomain) {
        // Logic to transfer episodes between domains
        const fID = Domains[fromDomain].i;
        const tID = Domains[toDomain].i;
        log('log', `Moving episodes from ${fromDomain}(${fID}) to ${toDomain}(${tID})`);
        // You can implement logic here to update the stored data and transfer the episodes
        getEpisodes()
            .then((episodes) => {
                for (let id in episodes) {
                    if (episodes[id].d == fID) {
                        episodes[id].d = tID; // Transfer domain control
                        // episodes[id].c = Domains[toDomain].c; // Transfer category
                    }
                }
                log('log', `Episodes in ${fromDomain} after transfer:`, Object.fromEntries(Object.entries(episodes).filter(([id, ep]) => ep.d === Domains[fromDomain].i)));
                log('log', `Episodes in ${toDomain} after transfer:`, Object.fromEntries(Object.entries(episodes).filter(([id, ep]) => ep.d === Domains[toDomain].i)));
                saveEpisodes(episodes);
            });
    }
}

// Load the list of tracked domains when the page loads
document.addEventListener('DOMContentLoaded', loadDomainSettings);