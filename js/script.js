
const GAMES = {
    hl1: { name: 'Half-Life', repo: 'sourcesounds/hl1', host: 'github' },
    bshift: { name: 'Half-Life: Blue Shift', repo: 'sourcesounds/bshift', host: 'github' },
	hl2: { name: 'Half-Life 2', repo: 'sourcesounds/hl2', host: 'github' },
    episodic: { name: 'Half-Life 2: Episode One', repo: 'sourcesounds/episodic', host: 'github' },
    ep2: { name: 'Half-Life 2: Episode Two', repo: 'sourcesounds/ep2', host: 'github' },
    hl2dm: { name: 'Half-Life 2: Deathmatch', repo: 'sourcesounds/hl2dm', host: 'github' },
    lostcoast: { name: 'Half-Life 2: Lost Coast', repo: 'sourcesounds/lostcoast', host: 'github' },
    tf2: { name: 'Team Fortress 2', repo: 'sourcesounds/tf2', host: 'github' },
    tfc: { name: 'Team Fortress Classic', repo: 'sourcesounds/tfc', host: 'github' },
    cstrike: { name: 'Counter-Strike: Source', repo: 'sourcesounds/cstrike', host: 'github' },
    csgo: { name: 'Counter-Strike: Global Offensive', repo: 'sourcesounds/csgo', host: 'github' },
    czero: { name: 'Counter-Strike: Condition Zero', repo: 'sourcesounds/czero', host: 'github' },
    portal: { name: 'Portal', repo: 'sourcesounds/portal', host: 'github' },
    portal2: { name: 'Portal 2', repo: 'sourcesounds/portal2', host: 'github' },
    left4dead: { name: 'Left 4 Dead', repo: 'sourcesounds/left4dead', host: 'github' },
    left4dead2: { name: 'Left 4 Dead 2', repo: 'sourcesounds/left4dead2', host: 'github' },
    dod: { name: 'Day of Defeat', repo: 'sourcesounds/dod', host: 'github' },
    dods: { name: 'Day of Defeat: Source', repo: 'sourcesounds/dods', host: 'github' },
    garrysmod: { name: "Garry's Mod", repo: 'sourcesounds/garrysmod', host: 'github' },
    zps: { name: 'Zombie Panic! Source', repo: 'sourcesounds/zps', host: 'github' },
	ricochet: { name: 'Ricochet', repo: '', host: 'cdn' },
	treason: { name: 'Klaus Veen\'s Treason', repo: '', host: 'cdn' },	
};


let currentGame = 'hl1';
let allSounds = [];
let filteredSounds = [];
let displayedSounds = [];
let currentAudioUrl = null;
let currentAudioBlob = null;
let currentAudioFileName = null;
let isSeeking = false;
let fuse = null;

let rafId = null;
let lastTimeDisplayUpdate = 0;


let currentPage = 0;
const ITEMS_PER_PAGE = 50;
let isLoadingMore = false;
let hasMoreToLoad = true;
let isSearching = false;


let currentMidiUrl = null;
let currentMidiBlob = null;
let currentMidiFileName = null;
let midiPlayer = null;
let midiVisualizer = null;


const gameSelect = document.getElementById('gameSelect');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const characterFilter = document.getElementById('characterFilter');
const soundList = document.getElementById('soundList');
const soundCount = document.getElementById('soundCount');
const loadingMessage = document.getElementById('loadingMessage');
const loadingMoreIndicator = document.getElementById('loadingMoreIndicator');
const errorMessage = document.getElementById('errorMessage');
const audioPlayer = document.getElementById('audioPlayer');
const audioPlayerContainer = document.getElementById('audioPlayerContainer');
const nowPlaying = document.getElementById('nowPlaying');
const downloadBtn = document.getElementById('downloadBtn');
const closePlayer = document.getElementById('closePlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const progressBar = document.getElementById('progressBar');
const progressBarContainer = document.getElementById('progressBarContainer');
const timeDisplay = document.getElementById('timeDisplay');
const autoplayToggle = document.getElementById('autoplayToggle');
const volumeSlider = document.getElementById('volumeSlider');
const volumeBtn = document.getElementById('volumeBtn');
const volumeIcon = document.getElementById('volumeIcon');
const mutedIcon = document.getElementById('mutedIcon');
let audioContext = null;
let gainNode = null;
let audioSource = null;


const midiPlayerContainer = document.getElementById('midiPlayerContainer');
const midiNowPlaying = document.getElementById('midiNowPlaying');
const closeMidiPlayer = document.getElementById('closeMidiPlayer');
const downloadMidiBtn = document.getElementById('downloadMidiBtn');
const midiPlayPauseBtn = document.getElementById('midiPlayPauseBtn');
const midiPlayIcon = document.getElementById('midiPlayIcon');
const midiPauseIcon = document.getElementById('midiPauseIcon');
const midiTimeDisplay = document.getElementById('midiTimeDisplay');
const toggleVisualizerBtn = document.getElementById('toggleVisualizerBtn');
const midiVisualizerPane = document.getElementById('midiVisualizerPane');
const closeVisualizerBtn = document.getElementById('closeVisualizerBtn');
const midiProgressBar = document.getElementById('midiProgressBar');
const midiProgressBarContainer = document.getElementById('midiProgressBarContainer');


document.addEventListener('DOMContentLoaded', () => {
    initCustomSelects();
    loadSounds();
    setupEventListeners();
    initializeVolume();
    initMidiPlayer();
    setupInfiniteScroll();
});

function setupEventListeners() {
    gameSelect.addEventListener('change', onGameChange);
    searchInput.addEventListener('input', debounce(filterSounds, 300));
    categoryFilter.addEventListener('change', filterSounds);
    characterFilter.addEventListener('change', filterSounds);
    closePlayer.addEventListener('click', closeAudioPlayer);
    downloadBtn.addEventListener('click', downloadCurrentSound);
    playPauseBtn.addEventListener('click', togglePlayPause);
    progressBarContainer.addEventListener('pointerdown', startSeek);
    volumeSlider.addEventListener('input', onVolumeChange);
    volumeBtn.addEventListener('click', toggleMute);
    
    const searchCaptionsToggle = document.getElementById('searchCaptionsToggle');
    const displayCaptionsToggle = document.getElementById('displayCaptionsToggle');
    
    if (searchCaptionsToggle) {
        searchCaptionsToggle.addEventListener('change', () => {
            initializeFuse(searchCaptionsToggle.checked);
            filterSounds();
        });
    }
    
    if (displayCaptionsToggle) {
        displayCaptionsToggle.addEventListener('change', () => {
            displaySounds();
        });
    }

    
    audioPlayer.addEventListener('loadedmetadata', updateDuration);

    
    audioPlayer.addEventListener('timeupdate', onTimeUpdateThrottled);

    audioPlayer.addEventListener('ended', onAudioEnded);

    
    audioPlayer.addEventListener('error', onAudioError);

    
    audioPlayer.addEventListener('play', () => {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        playPauseBtn.setAttribute('aria-label', 'Pause');
        startProgressLoop();
    });
    audioPlayer.addEventListener('pause', () => {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        playPauseBtn.setAttribute('aria-label', 'Play');
        stopProgressLoop();
        
        updateTimeDisplay(true);
    });

    
    closeMidiPlayer.addEventListener('click', closeMidiAudioPlayer);
    downloadMidiBtn.addEventListener('click', downloadCurrentMidi);
    midiPlayPauseBtn.addEventListener('click', toggleMidiPlayPause);
    toggleVisualizerBtn.addEventListener('click', toggleVisualizer);
    closeVisualizerBtn.addEventListener('click', hideVisualizer);
    midiProgressBarContainer.addEventListener('click', seekMidiTo);
}


function onGameChange() {
    currentGame = gameSelect.value;
    closeAudioPlayer();
    closeMidiAudioPlayer();
    loadSounds();
}


function isMidiFile(fileName) {
    const extension = fileName.toLowerCase().split('.').pop();
    return extension === 'mid' || extension === 'midi';
}


async function loadSounds() {
    try {
        loadingMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        soundList.innerHTML = '';

        
        const jsonFile = `../data/sounds-${currentGame}.json`;

        const response = await fetch(jsonFile);
        if (!response.ok) {
            throw new Error(`Failed to fetch sounds-${currentGame}.json`);
        }

        allSounds = await response.json();
        
        allSounds.forEach(sound => {
            if (!sound.category || sound.category.trim() === '' || sound.category.endsWith('.wav') || sound.category.endsWith('.mp3')) {
                sound.category = 'uncategorized';
            }
        });
        
        filteredSounds = [...allSounds];
        

        currentPage = 0;
        displayedSounds = [];
        hasMoreToLoad = true;
        isSearching = false;
        
        initializeFuse();

        loadingMessage.style.display = 'none';
        displaySounds();
        updateStats();
        populateCategories();
        populateCharacters();

    } catch (error) {
        console.error('Error loading sounds:', error);
        loadingMessage.style.display = 'none';
        errorMessage.style.display = 'block';
    }
}





function initializeFuse(searchCaptions = true) {
    const keys = [
        { name: 'fileName', weight: 2 },      
        { name: 'path', weight: 1 },          
        { name: 'displayName', weight: 2 },
        { name: 'category', weight: 0.5 }
    ];
    
    if (searchCaptions) {
        keys.push({ name: 'caption', weight: 4 });
    }
    
    const fuseOptions = {
        keys: keys,
        threshold: 0.15,
        distance: 500,
        minMatchCharLength: 2,
        includeScore: true,
        findAllMatches: false,
        shouldSort: true
    };
    
    fuse = new Fuse(allSounds, fuseOptions);
}

function populateCategories() {
    const categories = [...new Set(allSounds.map(sound => sound.category))].sort();
    
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categoryFilter.appendChild(option);
    });
    
    
    updateCustomSelect('categoryFilter');
}

function populateCharacters() {
    const characters = [...new Set(allSounds
        .filter(sound => sound.character)
        .map(sound => sound.character)
    )].sort();
    
    characterFilter.innerHTML = '<option value="all">All Characters</option>';
    
    if (characters.length > 0) {
        characters.forEach(character => {
            const option = document.createElement('option');
            option.value = character;
            option.textContent = character;
            characterFilter.appendChild(option);
        });
        
        characterFilter.parentElement.style.display = 'block';
    } else {
        characterFilter.parentElement.style.display = 'none';
    }
    
    updateCustomSelect('characterFilter');
}


function filterSounds() {
    const searchTerm = searchInput.value.trim();
    const selectedCategory = categoryFilter.value;
    const selectedCharacter = characterFilter.value;
    
    let searchResults;
    
    
    if (searchTerm.length >= 2) {
        
        const fuseResults = fuse.search(searchTerm);
        
        searchResults = fuseResults.map(result => result.item);
        isSearching = true;
    } else if (searchTerm.length === 0) {
        
        searchResults = [...allSounds];
        isSearching = false;
    } else {
        
        searchResults = [];
        isSearching = false;
    }
    
    
    filteredSounds = searchResults.filter(sound => {
        const soundCategory = sound.category || 'uncategorized';
        const matchesCategory = selectedCategory === 'all' || soundCategory === selectedCategory;
        const matchesCharacter = selectedCharacter === 'all' || sound.character === selectedCharacter;
        return matchesCategory && matchesCharacter;
    });
    

    currentPage = 0;
    displayedSounds = [];
    hasMoreToLoad = true;
    
    displaySounds();
    updateStats();
}


function displaySounds() {
    if (isSearching) {
        soundList.innerHTML = '';
        
        if (filteredSounds.length === 0) {
            soundList.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">
                    No sounds found matching your criteria.
                </div>
            `;
            return;
        }
        
        filteredSounds.forEach(sound => {
            const soundItem = createSoundItem(sound);
            soundList.appendChild(soundItem);
        });
        displayedSounds = [...filteredSounds];
        hasMoreToLoad = false;
        return;
    }
    

    if (currentPage === 0) {
        soundList.innerHTML = '';
        displayedSounds = [];
    }
    
    if (filteredSounds.length === 0) {
        soundList.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">
                No sounds found matching your criteria.
            </div>
        `;
        hasMoreToLoad = false;
        return;
    }
    
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const soundsToDisplay = filteredSounds.slice(startIndex, endIndex);
    
    if (soundsToDisplay.length === 0) {
        hasMoreToLoad = false;
        return;
    }
    
    soundsToDisplay.forEach(sound => {
        const soundItem = createSoundItem(sound);
        soundList.appendChild(soundItem);
        displayedSounds.push(sound);
    });
    
    hasMoreToLoad = endIndex < filteredSounds.length;
}


function createSoundItem(sound) {
    const div = document.createElement('div');
    div.className = 'sound-item';

    const category = sound.category || 'uncategorized';
    const displayCaptions = document.getElementById('displayCaptionsToggle')?.checked ?? true;
    
    let categoryHtml = category;
    if (sound.commentarySpeaker) {
        const speaker = escapeHtml(sound.commentarySpeaker);
        const hiddenClass = displayCaptions ? '' : ' hidden';
        categoryHtml += `<span class="sound-commentary-speaker${hiddenClass}"> 🎙️ ${speaker}</span>`;
    }
    
    if (sound.character) {
        const escapedCharacter = escapeHtml(sound.character);
        const hiddenClass = displayCaptions ? '' : ' hidden';
        categoryHtml += `<span class="sound-commentary-speaker${hiddenClass}"> <svg class="character-icon" viewBox="0 0 24 24" width="14" height="14" style="vertical-align: middle; margin-right: 2px;"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>${escapedCharacter}</span>`;
    }
    
    let html = `
        <div class="sound-category">${categoryHtml}</div>
        <div class="sound-name">${sound.displayName}</div>
    `;
    
    if (sound.caption && sound.caption.trim() !== '') {
        const escapedCaption = escapeHtml(sound.caption);
        const hiddenClass = displayCaptions ? '' : ' hidden';
        html += `<div class="sound-caption${hiddenClass}">"${escapedCaption}"</div>`;
    }
    
    html += `<div class="sound-path">${sound.path}</div>`;
    
    div.innerHTML = html;

    div.addEventListener('click', () => playSound(sound));

    return div;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


async function getAudioUrl(gameKey, game, soundPath, isMidi = false) {
    if (game.host === 'cdn') {
        return `https://cdn.sourcesfx.com/${gameKey}/${soundPath}`;
    }
    
	if (gameKey === 'hl2' && soundPath.includes('commentary')) {
		return `https://cdn.sourcesfx.com/${gameKey}/${soundPath}`;
	}
	
    const githubUrl = `https://raw.githubusercontent.com/${game.repo}/refs/heads/master/${soundPath}`;
    
    
    if (isMidi) {
        return githubUrl;
    }
    
    
    try {
        const response = await fetch(githubUrl, { method: 'HEAD' });
        if (response.ok) {
            return githubUrl;
        }
		if (response.status === 404) {
			return `https://cdn.sourcesfx.com/${gameKey}/${soundPath}`;
		}
    } catch (error) {
        return `https://cdn.sourcesfx.com/${gameKey}/${soundPath}`;
    }
}


async function playSound(sound, forcePlay = false) {
    const game = GAMES[currentGame];
    const isMidi = isMidiFile(sound.fileName);
    const audioUrl = await getAudioUrl(currentGame, game, sound.path, isMidi);

    
    if (isMidi) {
        playMidiSound(audioUrl, sound, forcePlay);
        return;
    }

    
    currentAudioUrl = audioUrl;
    currentAudioFileName = sound.fileName;

    
    closeMidiAudioPlayer();

    
    progressBar.style.transform = 'scaleX(0)';
    timeDisplay.textContent = '0:00 / 0:00';

    
    stopProgressLoop();

    
    delete audioPlayer.dataset.decodingAttempted;

    
    fetchAudioBlob(audioUrl);

    audioPlayer.src = audioUrl;
    
    
    const shouldAutoplay = autoplayToggle.checked || forcePlay;
    
    if (shouldAutoplay) {
        initWebAudio();
        audioPlayer.play().then(() => {
            startProgressLoop(); 
        }).catch(err => {
            console.error('Error playing audio:', err);
        });
    } else {
        
        audioPlayer.load();
    }

    nowPlaying.textContent = `Now Playing: ${sound.displayName}`;
    audioPlayerContainer.style.display = 'block';
}


async function fetchAudioBlob(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch audio');
        }
        currentAudioBlob = await response.blob();
    } catch (error) {
        console.error('Error fetching audio blob:', error);
        currentAudioBlob = null;
    }
}


function closeAudioPlayer() {
    audioPlayer.pause();
    stopProgressLoop();
    audioPlayerContainer.style.display = 'none';
    currentAudioUrl = null;
    currentAudioBlob = null;
    currentAudioFileName = null;
    progressBar.style.transform = 'scaleX(0)';
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    playPauseBtn.setAttribute('aria-label', 'Play');
}


function downloadCurrentSound() {
    if (!currentAudioBlob || !currentAudioFileName) {
        console.error('Audio blob not ready yet');
        return;
    }
    
    const blobUrl = URL.createObjectURL(currentAudioBlob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = currentAudioFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
    }, 100);
}


function togglePlayPause() {
    if (audioPlayer.paused) {
        initWebAudio();
        audioPlayer.play();
    } else {
        audioPlayer.pause();
    }
}



function startProgressLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    const tick = () => {
        
        if (!audioPlayer.paused && !isSeeking && audioPlayer.duration) {
            const progress = audioPlayer.currentTime / audioPlayer.duration;
            progressBar.style.transform = `scaleX(${progress})`;

            
            updateTimeDisplay(false);

            rafId = requestAnimationFrame(tick);
        } else {
            
            rafId = null;
        }
    };
    rafId = requestAnimationFrame(tick);
}

function stopProgressLoop() {
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}


function onTimeUpdateThrottled() {
    updateTimeDisplay(false);
}


function updateProgress() {
    if (isSeeking) return;
    if (audioPlayer.duration) {
        const progress = audioPlayer.currentTime / audioPlayer.duration;
        progressBar.style.transform = `scaleX(${progress})`;
        updateTimeDisplay(false);
    }
}


function updateTimeDisplay(force = false) {
    const now = performance.now();
    if (!force && now - lastTimeDisplayUpdate < 150) return; 
    lastTimeDisplayUpdate = now;

    const currentTime = formatTime(audioPlayer.currentTime || 0);
    const duration = formatTime(audioPlayer.duration || 0);
    timeDisplay.textContent = `${currentTime} / ${duration}`;
}


function updateDuration() {
    updateTimeDisplay(true);
}


function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}


function eventToPercent(clientX) {
    const rect = progressBarContainer.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    return x / rect.width;
}


function seekToPercent(pct) {
    pct = clamp(pct, 0, 1);
    
    
    if (!isFinite(audioPlayer.duration) || audioPlayer.readyState < 2) {
        
        const targetTime = pct;
        const seekOnReady = () => {
            if (isFinite(audioPlayer.duration)) {
                audioPlayer.currentTime = targetTime * audioPlayer.duration;
                progressBar.style.transform = `scaleX(${targetTime})`;
                updateTimeDisplay(true);
            }
            audioPlayer.removeEventListener('loadedmetadata', seekOnReady);
            audioPlayer.removeEventListener('canplay', seekOnReady);
        };
        
        audioPlayer.addEventListener('loadedmetadata', seekOnReady);
        audioPlayer.addEventListener('canplay', seekOnReady);
        return;
    }
    
    audioPlayer.currentTime = pct * audioPlayer.duration;
    progressBar.style.transform = `scaleX(${pct})`;
    updateTimeDisplay(true);
}


function startSeek(e) {
    e.preventDefault();
    try { progressBarContainer.setPointerCapture(e.pointerId); } catch {}
    isSeeking = true;
    progressBar.classList.add('seeking');

    
    stopProgressLoop();

    const pct = eventToPercent(e.clientX);
    seekToPercent(pct);

    progressBarContainer.addEventListener('pointermove', onSeekMove);
    progressBarContainer.addEventListener('pointerup', endSeek);
    progressBarContainer.addEventListener('pointercancel', endSeek);
}


function onSeekMove(e) {
    if (!isSeeking) return;
    const pct = eventToPercent(e.clientX);
    progressBar.style.transform = `scaleX(${pct})`;
    if (isFinite(audioPlayer.duration)) {
        const t = pct * audioPlayer.duration;
        timeDisplay.textContent = `${formatTime(t)} / ${formatTime(audioPlayer.duration)}`;
    }
}


function endSeek(e) {
    if (!isSeeking) return;
    const pct = eventToPercent(e.clientX);
    seekToPercent(pct);
    isSeeking = false;
    progressBar.classList.remove('seeking');

    try { progressBarContainer.releasePointerCapture(e.pointerId); } catch {}

    progressBarContainer.removeEventListener('pointermove', onSeekMove);
    progressBarContainer.removeEventListener('pointerup', endSeek);
    progressBarContainer.removeEventListener('pointercancel', endSeek);

    
    if (!audioPlayer.paused) startProgressLoop();
}


function onAudioEnded() {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    playPauseBtn.setAttribute('aria-label', 'Play');
    stopProgressLoop();
    progressBar.style.transform = 'scaleX(0)';
    
    
    audioPlayer.currentTime = 0;
    updateTimeDisplay(true);
}


async function onAudioError(e) {
    const error = e.target.error;
    
    
    if (error && error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {        
        if (currentAudioUrl && !audioPlayer.dataset.decodingAttempted) {
            
            audioPlayer.dataset.decodingAttempted = 'true';
            
            try {
                await decodeAndPlayMsAdpcm(currentAudioUrl);
            } catch (decodeError) {
                console.error('Failed to decode MS-ADPCM:', decodeError);
                
                delete audioPlayer.dataset.decodingAttempted;
            }
        }
    } else {
        console.error('Audio playback error:', error);
    }
}


async function decodeAndPlayMsAdpcm(url) {
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch audio file');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    
    const wavBlob = msadpcmDecodeWavFile(arrayBuffer);
    const blobUrl = URL.createObjectURL(wavBlob);
    
    
    currentAudioBlob = wavBlob;
    
    
    audioPlayer.src = blobUrl;
    
    
    delete audioPlayer.dataset.decodingAttempted;
    
    
    const shouldAutoplay = autoplayToggle.checked;
    if (shouldAutoplay) {
        try {
            initWebAudio();
            await audioPlayer.play();
            startProgressLoop();
        } catch (err) {
            console.error('Error playing decoded audio:', err);
        }
    } else {
        audioPlayer.load();
    }
}


function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}


function updateStats() {
    const gameName = GAMES[currentGame].name;
    
    if (isSearching || filteredSounds.length === allSounds.length) {
        soundCount.textContent = `${gameName}: Showing ${filteredSounds.length} of ${allSounds.length} sounds`;
    } else {
        soundCount.textContent = `${gameName}: Showing ${displayedSounds.length} of ${filteredSounds.length} sounds (${allSounds.length} total)`;
    }
}


function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && hasMoreToLoad && !isLoadingMore && !isSearching) {
                loadMoreSounds();
            }
        });
    }, {
        rootMargin: '200px'
    });
    
    const observeTarget = document.createElement('div');
    observeTarget.id = 'scroll-sentinel';
    observeTarget.style.height = '1px';
    document.querySelector('.container').appendChild(observeTarget);
    observer.observe(observeTarget);
}


function loadMoreSounds() {
    if (isLoadingMore || !hasMoreToLoad || isSearching) {
        return;
    }
    
    isLoadingMore = true;
    loadingMoreIndicator.style.display = 'block';
    
    setTimeout(() => {
        currentPage++;
        
        displaySounds();
        updateStats();
        
        loadingMoreIndicator.style.display = 'none';
        isLoadingMore = false;
    }, 100);
}


function initCustomSelects() {
    const selects = document.querySelectorAll('.filter-select');
    
    selects.forEach(select => {
        createCustomSelect(select);
    });
}

function createCustomSelect(selectElement) {
    
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    
    
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    
    const triggerText = document.createElement('span');
    triggerText.className = 'custom-select-text';
    triggerText.textContent = selectElement.options[selectElement.selectedIndex].text;
    
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('class', 'custom-select-arrow');
    arrow.setAttribute('viewBox', '0 0 12 12');
    arrow.setAttribute('width', '12');
    arrow.setAttribute('height', '12');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', '#ff6600');
    path.setAttribute('d', 'M6 9L1 4h10z');
    arrow.appendChild(path);
    
    trigger.appendChild(triggerText);
    trigger.appendChild(arrow);
    
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'custom-select-options';
    
    
    let optionIndex = 0;
    Array.from(selectElement.children).forEach(child => {
        if (child.tagName === 'OPTGROUP') {
            
            const groupLabel = document.createElement('div');
            groupLabel.className = 'custom-select-option optgroup-label';
            groupLabel.textContent = child.label;
            optionsContainer.appendChild(groupLabel);
            
            
            Array.from(child.children).forEach(option => {
                const customOption = document.createElement('div');
                customOption.className = 'custom-select-option optgroup-item';
                customOption.textContent = option.text;
                customOption.dataset.value = option.value;
                customOption.dataset.index = optionIndex;
                
                if (option.selected) {
                    customOption.classList.add('selected');
                }
                
                customOption.addEventListener('click', () => {
                    selectOption(selectElement, customOption, triggerText, optionsContainer);
                });
                
                optionsContainer.appendChild(customOption);
                optionIndex++;
            });
        } else if (child.tagName === 'OPTION') {
            
            const customOption = document.createElement('div');
            customOption.className = 'custom-select-option';
            customOption.textContent = child.text;
            customOption.dataset.value = child.value;
            customOption.dataset.index = optionIndex;
            
            if (child.selected) {
                customOption.classList.add('selected');
            }
            
            customOption.addEventListener('click', () => {
                selectOption(selectElement, customOption, triggerText, optionsContainer);
            });
            
            optionsContainer.appendChild(customOption);
            optionIndex++;
        }
    });
    
    
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllSelects(wrapper);
        trigger.classList.toggle('active');
        optionsContainer.classList.toggle('active');
    });
    
    
    selectElement.parentNode.insertBefore(wrapper, selectElement);
    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsContainer);
    
    
    wrapper.dataset.selectId = selectElement.id;
}

function selectOption(selectElement, customOption, triggerText, optionsContainer) {
    
    selectElement.selectedIndex = customOption.dataset.index;
    
    
    const event = new Event('change', { bubbles: true });
    selectElement.dispatchEvent(event);
    
    
    triggerText.textContent = customOption.textContent;
    
    
    optionsContainer.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    customOption.classList.add('selected');
    
    
    optionsContainer.classList.remove('active');
    optionsContainer.previousElementSibling.classList.remove('active');
}

function closeAllSelects(except = null) {
    document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
        if (wrapper !== except) {
            wrapper.querySelector('.custom-select-trigger')?.classList.remove('active');
            wrapper.querySelector('.custom-select-options')?.classList.remove('active');
        }
    });
}


document.addEventListener('click', () => {
    closeAllSelects();
});


function updateCustomSelect(selectId) {
    const wrapper = document.querySelector(`.custom-select-wrapper[data-select-id="${selectId}"]`);
    if (!wrapper) return;
    
    const selectElement = document.getElementById(selectId);
    const optionsContainer = wrapper.querySelector('.custom-select-options');
    const triggerText = wrapper.querySelector('.custom-select-text');
    
    
    optionsContainer.innerHTML = '';
    
    
    Array.from(selectElement.options).forEach((option, index) => {
        const customOption = document.createElement('div');
        customOption.className = 'custom-select-option';
        customOption.textContent = option.text;
        customOption.dataset.value = option.value;
        customOption.dataset.index = index;
        
        if (option.selected) {
            customOption.classList.add('selected');
            triggerText.textContent = option.text;
        }
        
        customOption.addEventListener('click', () => {
            selectOption(selectElement, customOption, triggerText, optionsContainer);
        });
        
        optionsContainer.appendChild(customOption);
    });
}



function initializeVolume() {
    
    const savedVolume = localStorage.getItem('audioVolume');
    const volumeValue = savedVolume !== null ? parseFloat(savedVolume) : 100;
    
    volumeSlider.value = volumeValue;
    audioPlayer.volume = volumeValue / 100;
    updateVolumeSliderStyle(volumeValue);
    updateVolumeIcon(volumeValue);
}

function initWebAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioContext.createGain();
            gainNode.gain.value = audioPlayer.volume;
            audioSource = audioContext.createMediaElementSource(audioPlayer);
            audioSource.connect(gainNode).connect(audioContext.destination);
        } catch (e) {
            console.warn('Web Audio API not available:', e);
        }
    }
}

function onVolumeChange(e) {
    const volumeValue = parseFloat(e.target.value);
    audioPlayer.volume = volumeValue / 100;
    if (gainNode) gainNode.gain.value = volumeValue / 100;
    
    localStorage.setItem('audioVolume', volumeValue);
    
    updateVolumeSliderStyle(volumeValue);
    updateVolumeIcon(volumeValue);
}

function updateVolumeSliderStyle(volumeValue) {
    
    volumeSlider.style.setProperty('--volume-percent', `${volumeValue}%`);
}

function updateVolumeIcon(volumeValue) {
    if (volumeValue === 0) {
        volumeIcon.style.display = 'none';
        mutedIcon.style.display = 'block';
        volumeBtn.setAttribute('aria-label', 'Unmute');
    } else {
        volumeIcon.style.display = 'block';
        mutedIcon.style.display = 'none';
        volumeBtn.setAttribute('aria-label', 'Mute');
    }
}

function toggleMute() {
    if (audioPlayer.volume > 0) {
        
        localStorage.setItem('previousVolume', volumeSlider.value);
        volumeSlider.value = 0;
        audioPlayer.volume = 0;
        if (gainNode) gainNode.gain.value = 0;
        updateVolumeSliderStyle(0);
        updateVolumeIcon(0);
    } else {
        
        const previousVolume = localStorage.getItem('previousVolume') || 100;
        volumeSlider.value = previousVolume;
        audioPlayer.volume = previousVolume / 100;
        if (gainNode) gainNode.gain.value = previousVolume / 100;
        updateVolumeSliderStyle(previousVolume);
        updateVolumeIcon(previousVolume);
    }
}




function initMidiPlayer() {
    
    if (customElements.get('midi-player') && customElements.get('midi-visualizer')) {
        midiPlayer = document.getElementById('midiPlayer');
        midiVisualizer = document.getElementById('midiVisualizer');
        
        
        if (midiPlayer && midiVisualizer) {
            midiPlayer.addVisualizer(midiVisualizer);
        }

        
        if (midiPlayer) {
            midiPlayer.addEventListener('start', onMidiStart);
            midiPlayer.addEventListener('stop', onMidiStop);
            midiPlayer.addEventListener('note', updateMidiTime);
        }
    } else {
        
        setTimeout(initMidiPlayer, 100);
    }
}

function onMidiStart() {
    midiPlayIcon.style.display = 'none';
    midiPauseIcon.style.display = 'block';
    midiPlayPauseBtn.setAttribute('aria-label', 'Pause');
}

function onMidiStop() {
    midiPlayIcon.style.display = 'block';
    midiPauseIcon.style.display = 'none';
    midiPlayPauseBtn.setAttribute('aria-label', 'Play');
}

function updateMidiTime() {
    if (midiPlayer && midiPlayer.currentTime !== undefined && midiPlayer.duration !== undefined) {
        const current = formatTime(midiPlayer.currentTime);
        const duration = formatTime(midiPlayer.duration);
        midiTimeDisplay.textContent = `${current} / ${duration}`;
        
        
        if (midiPlayer.duration > 0) {
            const progress = midiPlayer.currentTime / midiPlayer.duration;
            midiProgressBar.style.transform = `scaleX(${progress})`;
        }
    }
}

function seekMidiTo(e) {
    if (!midiPlayer || !midiPlayer.duration) return;
    
    const rect = midiProgressBarContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * midiPlayer.duration;
    
    midiPlayer.currentTime = newTime;
    midiProgressBar.style.transform = `scaleX(${percentage})`;
    updateMidiTime();
}

function toggleMidiPlayPause() {
    if (!midiPlayer) return;
    
    if (midiPlayer.playing) {
        midiPlayer.stop();
    } else {
        midiPlayer.start();
    }
}

function toggleVisualizer() {
    if (midiVisualizerPane.style.display === 'none') {
        showVisualizer();
    } else {
        hideVisualizer();
    }
}

function showVisualizer() {
    midiVisualizerPane.style.display = 'block';
    toggleVisualizerBtn.classList.add('active');
}

function hideVisualizer() {
    midiVisualizerPane.style.display = 'none';
    toggleVisualizerBtn.classList.remove('active');
}

async function playMidiSound(midiUrl, sound, forcePlay = false) {
    currentMidiUrl = midiUrl;
    currentMidiFileName = sound.fileName;

    
    closeAudioPlayer();

    
    midiTimeDisplay.textContent = '0:00 / 0:00';
    midiProgressBar.style.transform = 'scaleX(0)';
    midiPlayIcon.style.display = 'block';
    midiPauseIcon.style.display = 'none';

    
    try {
        const response = await fetch(midiUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch MIDI file');
        }
        currentMidiBlob = await response.blob();
        
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if (midiPlayer) {
                midiPlayer.src = e.target.result;
                
                
                setTimeout(() => {
                    updateMidiTime();
                    
                    const shouldAutoplay = autoplayToggle.checked || forcePlay;
                    if (shouldAutoplay) {
                        if (midiPlayer && midiPlayer.start) {
                            midiPlayer.start();
                        }
                    }
                }, 200);
            }
        };
        reader.readAsDataURL(currentMidiBlob);

        midiNowPlaying.textContent = `Now Playing: ${sound.displayName}`;
        midiPlayerContainer.style.display = 'block';
        
        
        if (midiVisualizerPane.style.display === 'none') {
            showVisualizer();
        }

    } catch (error) {
        console.error('Error loading MIDI file:', error);
        alert('Failed to load MIDI file. The file may not exist or may be corrupted.');
    }
}

const analyticsBanner = document.getElementById('analyticsBanner');
if (!localStorage.getItem('hideAnalyticsBanner') && analyticsBanner) {
    analyticsBanner.style.display = 'flex';
}

const hideAnalyticsBannerBtn = document.getElementById('hideAnalyticsBanner');
if (hideAnalyticsBannerBtn && analyticsBanner) {
    hideAnalyticsBannerBtn.onclick = function () {
        localStorage.setItem('hideAnalyticsBanner', '1');
        analyticsBanner.style.display = 'none';
    };
}

function closeMidiAudioPlayer() {
    if (midiPlayer && midiPlayer.stop) {
        midiPlayer.stop();
    }
    midiPlayerContainer.style.display = 'none';
    hideVisualizer();
    currentMidiUrl = null;
    currentMidiBlob = null;
    currentMidiFileName = null;
    midiTimeDisplay.textContent = '0:00 / 0:00';
    midiProgressBar.style.transform = 'scaleX(0)';
}

async function downloadCurrentMidi() {
    if (!currentMidiBlob || !currentMidiFileName) {
        console.error('MIDI file not ready yet');
        return;
    }
    
    const blobUrl = URL.createObjectURL(currentMidiBlob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = currentMidiFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
    }, 100);
}
