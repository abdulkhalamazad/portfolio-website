// Daily Stories Logic
// Handles fetching, caching, and rendering of daily stories.

(function () {
    const STORIES_BASE_URL = 'assets/stories/';

    // Selectors
    let profileTrigger;
    let heroFlipper;
    let heroFlipContainer;
    let storyOverlay;
    let storyContentContainer;
    let closeBtn;
    let storyPreviewCard;

    // State
    let isFlipped = false;
    let activeStoriesList = []; // Array of active story objects
    let currentStoryIndex = 0; // 0 = Newest
    let storiesIndex = []; // Holds the fetched index

    // Image Carousel State
    let currentImageIndex = 0;
    let currentStoryImages = [];

    async function initStories() {
        // Inject UI Structure if not present
        if (!document.getElementById('story-overlay')) {
            injectStoryUI();
        }

        profileTrigger = document.querySelector('.profile-img');
        heroFlipper = document.querySelector('.hero-flipper');
        heroFlipContainer = document.querySelector('.hero-flip-container');
        storyOverlay = document.getElementById('story-overlay');
        storyContentContainer = document.querySelector('.story-content-wrapper');
        closeBtn = document.querySelector('.story-close-btn');
        const backBtn = document.getElementById('story-back-btn');
        storyPreviewCard = document.querySelector('.story-preview-card');

        if (profileTrigger && heroFlipper) {
            profileTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isFlipped) {
                    toggleFlip();
                }
            });

            // Click anywhere on the flipper to flip back
            heroFlipper.addEventListener('click', (e) => {
                if (isFlipped && !profileTrigger.contains(e.target)) {
                    toggleFlip();
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', closeStoryViewer);
        }

        if (backBtn) {
            backBtn.addEventListener('click', loadArchive);
        }

        // Check for active story and update preview
        await checkActiveStory();

        // Setup buttons in preview card
        setupPreviewButtons();

        // Scroll Shadow Logic
        if (storyContentContainer) {
            const stickyHeader = document.querySelector('.story-sticky-header');
            storyContentContainer.addEventListener('scroll', () => {
                if (storyContentContainer.scrollTop > 10) {
                    stickyHeader.classList.add('has-shadow');
                } else {
                    stickyHeader.classList.remove('has-shadow');
                }
            });
        }
    }

    function toggleFlip() {
        if (heroFlipper) {
            isFlipped = !isFlipped;
            if (isFlipped) {
                heroFlipper.classList.add('flipped');
            } else {
                heroFlipper.classList.remove('flipped');
            }
        }
    }

    function setupPreviewButtons() {
        const viewStoryBtn = document.getElementById('btn-flip-view');
        const archiveBtn = document.getElementById('btn-flip-archive');

        // Card Navigation Buttons
        const cardPrevBtn = document.getElementById('card-prev-btn');
        const cardNextBtn = document.getElementById('card-next-btn');

        if (viewStoryBtn) {
            viewStoryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openFullStoryPopup();
            });
        }

        if (archiveBtn) {
            archiveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openArchivePage();
            });
        }

        if (cardPrevBtn) {
            cardPrevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                prevStory();
            });
        }

        if (cardNextBtn) {
            cardNextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                nextStory();
            });
        }
    }

    function injectStoryUI() {
        const uiHTML = `
            <div id="story-overlay" class="story-overlay hidden">
                <div class="story-backdrop"></div>
                <div class="story-modal">
                    <div class="story-sticky-header">
                        <button class="btn-back-archive hidden" id="story-back-btn"><i class="fas fa-reply"></i></button>
                        <span class="sticky-date"></span>
                        <button class="story-close-btn">&times;</button>
                    </div>
                    <div class="story-content-wrapper">
                        <!-- Content injected here -->
                        <div class="story-loading">
                            <div class="spinner"></div>
                            <p>Loading story...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', uiHTML);
    }

    // Nav Actions (Operates on Preview Card)
    function prevStory() {
        // Left arrow: Go to NEWER story (decrement index)
        if (currentStoryIndex > 0) {
            currentStoryIndex--;
            updatePreviewWithStory(activeStoriesList[currentStoryIndex]);
        }
    }

    async function nextStory() {
        // Right arrow: Go to OLDER story (increment index)
        if (currentStoryIndex < activeStoriesList.length - 1) {
            currentStoryIndex++;
            updatePreviewWithStory(activeStoriesList[currentStoryIndex]);
        } else if (activeStoriesList.length < activeStoryEntries.length) {
            // Need to load more!
            updatePreviewLoading();
            await loadMoreStories();

            // After loading, if we have more stories, advance
            if (currentStoryIndex < activeStoriesList.length - 1) {
                currentStoryIndex++;
                updatePreviewWithStory(activeStoriesList[currentStoryIndex]);
            } else {
                // Should not happen if load succeeded and there were entries
                updatePreviewWithStory(activeStoriesList[currentStoryIndex]);
            }
        }
    }

    function updatePreviewLoading() {
        const previewTitle = document.querySelector('.preview-title');
        const previewDesc = document.querySelector('.preview-desc');

        if (previewTitle) previewTitle.textContent = "Loading...";
        if (previewDesc) previewDesc.textContent = "Fetching more stories...";
    }

    // Helper to parse date+time and check 24h window
    function isStoryActive(dateStr, timeStr) {
        if (!dateStr || !timeStr) return false;

        const now = new Date();
        const storyDate = new Date(`${dateStr}T${timeStr}`);

        // Calculate difference in milliseconds
        const diff = now - storyDate;

        // Check if story is in the past and within 24 hours
        // 24 hours * 60 minutes * 60 seconds * 1000 ms
        const twentyFourHours = 24 * 60 * 60 * 1000;

        return diff >= 0 && diff < twentyFourHours;
    }

    // Pagination State
    let activeStoryEntries = []; // Metadata of all active stories
    const BATCH_SIZE = 5;
    let isLoadingMore = false;

    async function checkActiveStory() {
        try {
            const response = await fetch(`${STORIES_BASE_URL}index.json?t=${Date.now()}`);
            if (!response.ok) {
                updatePreviewNoStory();
                return;
            }
            const data = await response.json();
            storiesIndex = data.stories || [];

            // Sort stories by date descending (newest first)
            storiesIndex.sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time}`);
                const dateB = new Date(`${b.date}T${b.time}`);
                return dateB - dateA;
            });

            // Find ALL active stories METADATA
            activeStoryEntries = [];
            for (const storyEntry of storiesIndex) {
                if (isStoryActive(storyEntry.date, storyEntry.time)) {
                    activeStoryEntries.push(storyEntry);
                }
            }

            activeStoriesList = []; // Reset loaded list

            if (activeStoryEntries.length > 0) {
                // Load first batch
                await loadMoreStories();

                if (activeStoriesList.length > 0) {
                    currentStoryIndex = 0;
                    updatePreviewWithStory(activeStoriesList[0]);
                } else {
                    updatePreviewNoStory();
                }
            } else {
                updatePreviewNoStory();
            }

        } catch (e) {
            console.warn('Failed to check stories:', e);
            updatePreviewNoStory();
        }
    }

    async function loadMoreStories() {
        if (isLoadingMore) return;
        isLoadingMore = true;

        const startIndex = activeStoriesList.length;
        const endIndex = Math.min(startIndex + BATCH_SIZE, activeStoryEntries.length);

        // If we have loaded everything, return
        if (startIndex >= activeStoryEntries.length) {
            isLoadingMore = false;
            return;
        }

        const batchPromises = [];
        for (let i = startIndex; i < endIndex; i++) {
            const entry = activeStoryEntries[i];
            const filename = entry.file || entry.date;

            const p = fetch(`${STORIES_BASE_URL}${filename}.json`)
                .then(res => res.json())
                .then(storyData => {
                    storyData.time = entry.time;
                    return storyData;
                })
                .catch(err => {
                    console.warn('Failed to load active story', entry.date);
                    return null;
                });
            batchPromises.push(p);
        }

        const results = await Promise.all(batchPromises);
        const validStories = results.filter(s => s !== null);

        // Maintain order (Promise.all does this, but validStories filters nulls)
        // Since we fetch in order, appending in order is correct.
        activeStoriesList = activeStoriesList.concat(validStories);

        isLoadingMore = false;
    }

    function updatePreviewWithStory(story) {
        const previewImg = document.querySelector('.preview-story-img');
        const previewTitle = document.querySelector('.preview-title');
        const previewDesc = document.querySelector('.preview-desc');
        const previewDate = document.querySelector('.preview-date');
        const viewBtn = document.getElementById('btn-flip-view');

        const cardPrevBtn = document.getElementById('card-prev-btn');
        const cardNextBtn = document.getElementById('card-next-btn');

        if (previewImg) {
            if (Array.isArray(story.image) && story.image.length > 0) {
                previewImg.src = story.image[0];
            } else if (story.image) {
                previewImg.src = story.image;
            }
        }
        if (previewTitle) {
            previewTitle.textContent = story.title;
        }
        if (previewDesc) {
            // Truncate description for preview if needed
            previewDesc.textContent = story.description;
        }
        if (previewDate) {
            // Show count if multiple?
            if (activeStoryEntries.length > 1) {
                // e.g. "Story 1 of 8"
                previewDate.textContent = `Story ${currentStoryIndex + 1} of ${activeStoryEntries.length}`;
            } else {
                previewDate.textContent = "New Story";
            }
        }
        if (viewBtn) {
            viewBtn.style.display = ''; // Let CSS handle
            viewBtn.textContent = 'View Full Story';
        }

        // Navigation Buttons Visibility
        // Show Left (Prev/Newer) if index > 0
        if (cardPrevBtn) {
            if (currentStoryIndex > 0) cardPrevBtn.classList.remove('hidden');
            else cardPrevBtn.classList.add('hidden');
        }

        // Show Right (Next/Older) if we are not at the very end of ALL potential stories
        if (cardNextBtn) {
            if (currentStoryIndex < activeStoriesList.length - 1 || activeStoriesList.length < activeStoryEntries.length) {
                cardNextBtn.classList.remove('hidden');
            } else {
                cardNextBtn.classList.add('hidden');
            }
        }
    }

    function updatePreviewNoStory() {
        const previewTitle = document.querySelector('.preview-title');
        const previewDesc = document.querySelector('.preview-desc');
        const previewDate = document.querySelector('.preview-date');
        const viewBtn = document.getElementById('btn-flip-view');
        const cardPrevBtn = document.getElementById('card-prev-btn');
        const cardNextBtn = document.getElementById('card-next-btn');

        if (previewTitle) {
            previewTitle.textContent = 'No active story';
        }
        if (previewDesc) {
            previewDesc.textContent = 'Check back later for new updates!';
        }
        if (previewDate) {
            previewDate.textContent = 'Status';
        }
        if (viewBtn) {
            viewBtn.style.display = 'none';
        }

        if (cardPrevBtn) cardPrevBtn.classList.add('hidden');
        if (cardNextBtn) cardNextBtn.classList.add('hidden');
    }

    function openFullStoryPopup() {
        if (activeStoriesList.length === 0) return;

        // Show popup
        storyOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Open the currently selected story (from preview)
        renderStory(activeStoriesList[currentStoryIndex]);
    }

    function openArchivePage() {
        // Show popup with archive
        storyOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        loadArchive();
    }

    function renderStory(story, fromArchive = false) {
        if (!story) return;

        // Handle Image(s)
        currentImageIndex = 0;
        if (Array.isArray(story.image)) {
            currentStoryImages = story.image;
        } else if (story.image) {
            currentStoryImages = [story.image];
        } else {
            currentStoryImages = ['https://placehold.co/600x400/0ea5e9/ffffff?text=Daily+Story'];
        }

        const imageSrc = currentStoryImages[0];

        // Format display date
        const dateObj = new Date(story.date + (story.time ? 'T' + story.time : ''));
        const displayDate = isNaN(dateObj.getTime()) ? story.date :
            dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

        // Toggle fixed back button
        const fixedBackBtn = document.getElementById('story-back-btn');
        if (fixedBackBtn) {
            if (fromArchive) {
                fixedBackBtn.classList.remove('hidden');
            } else {
                fixedBackBtn.classList.add('hidden');
            }
        }

        // Update Sticky Date
        const stickyDateEl = document.querySelector('.sticky-date');
        if (stickyDateEl) {
            stickyDateEl.textContent = displayDate;
        }

        const html = `
            <div class="story-view-mode">
                <div class="story-header center-text">
                    <h2 class="story-title">${story.title}</h2>
                    ${story.time ? `<span class="story-time-badge">${formatTime(story.time)}</span>` : ''}
                </div>
                <div class="story-body">
                    <div class="story-image-container">
                        <img src="${imageSrc}" alt="${story.title}" class="story-image" id="active-story-img">
                        ${currentStoryImages.length > 1 ? `
                            <button class="img-nav-btn img-nav-prev hidden" id="img-prev-btn"><i class="fas fa-chevron-left"></i></button>
                            <button class="img-nav-btn img-nav-next" id="img-next-btn"><i class="fas fa-chevron-right"></i></button>
                        ` : ''}
                    </div>
                    <div class="story-text">
                        <p class="story-desc">${story.description}</p>
                        <div class="story-full-content">${story.content || ''}</div>
                    </div>
                </div>
            </div>
        `;
        storyContentContainer.innerHTML = html;

        // Reset scroll position
        storyContentContainer.scrollTop = 0;

        // Attach Image Nav Listeners
        if (currentStoryImages.length > 1) {
            const imgPrevBtn = document.getElementById('img-prev-btn');
            const imgNextBtn = document.getElementById('img-next-btn');

            if (imgPrevBtn) {
                imgPrevBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    prevImage();
                });
            }
            if (imgNextBtn) {
                imgNextBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    nextImage();
                });
            }
        }
    }

    // Image Caresoul Actions
    function prevImage() {
        // Left goes to NEWER/LOWER index (Latest)
        if (currentImageIndex > 0) {
            currentImageIndex--;
            updateImageDisplay();
        }
    }

    function nextImage() {
        // Right goes to OLDER/HIGHER index (Oldest)
        if (currentImageIndex < currentStoryImages.length - 1) {
            currentImageIndex++;
            updateImageDisplay();
        }
    }

    function updateImageDisplay() {
        const imgEl = document.getElementById('active-story-img');
        const prevBtn = document.getElementById('img-prev-btn');
        const nextBtn = document.getElementById('img-next-btn');

        if (imgEl) {
            imgEl.src = currentStoryImages[currentImageIndex];
        }

        // Logic: Index 0 is Latest. 
        // Prev (Left) -> Newer (Index --)
        // Next (Right) -> Older (Index ++)

        if (prevBtn) {
            if (currentImageIndex > 0) prevBtn.classList.remove('hidden');
            else prevBtn.classList.add('hidden');
        }

        if (nextBtn) {
            if (currentImageIndex < currentStoryImages.length - 1) nextBtn.classList.remove('hidden');
            else nextBtn.classList.add('hidden');
        }
    }

    function formatTime(timeStr) {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    }

    // Archive Pagination State
    const ARCHIVE_BATCH_SIZE = 10;
    let loadedArchiveCount = 0;
    let isArchiveLoading = false;
    let archiveStoryEntries = []; // Full list for archive

    async function loadArchive() {
        const fixedBackBtn = document.getElementById('story-back-btn');
        const prevBtn = document.getElementById('story-prev-btn');
        const nextBtn = document.getElementById('story-next-btn');

        if (fixedBackBtn) fixedBackBtn.classList.add('hidden');
        if (prevBtn) prevBtn.classList.add('hidden');
        if (nextBtn) nextBtn.classList.add('hidden');

        // Set sticky header title for archive
        const stickyDateEl = document.querySelector('.sticky-date');
        if (stickyDateEl) {
            stickyDateEl.textContent = 'Recent Stories';
        }

        // Reset Container
        storyContentContainer.innerHTML = '<div class="story-archive-list"><div class="archive-grid"></div><div class="archive-loader hidden"><div class="spinner"></div></div></div>';

        // Remove existing scroll listeners to avoid duplicates (naive approach: cloning)
        // Better: We handle scroll in a single place or use a flag. 
        // valid way: checking if we are in archive mode via state or simply checking content.

        // Initialize Data
        try {
            if (!storiesIndex || storiesIndex.length === 0) {
                const indexResponse = await fetch(`${STORIES_BASE_URL}index.json?t=${Date.now()}`);
                const indexData = await indexResponse.json();
                storiesIndex = indexData.stories || [];
                storiesIndex.sort((a, b) => {
                    const dateA = new Date(`${a.date}T${a.time}`);
                    const dateB = new Date(`${b.date}T${b.time}`);
                    return dateB - dateA;
                });
            }

            archiveStoryEntries = storiesIndex; // All stories
            loadedArchiveCount = 0;

            // Load first batch
            await loadMoreArchive();

            // Attach Infinite Scroll Listener
            storyContentContainer.onscroll = () => {
                // Check if we are near bottom
                if (storyContentContainer.scrollTop + storyContentContainer.clientHeight >= storyContentContainer.scrollHeight - 50) {
                    loadMoreArchive();
                }

                // Also Update Sticky Shadow
                const stickyHeader = document.querySelector('.story-sticky-header');
                if (storyContentContainer.scrollTop > 10) {
                    stickyHeader.classList.add('has-shadow');
                } else {
                    stickyHeader.classList.remove('has-shadow');
                }
            };

        } catch (e) {
            console.error('Error loading archive:', e);
            renderError();
        }
    }

    async function loadMoreArchive() {
        if (isArchiveLoading) return;
        if (loadedArchiveCount >= archiveStoryEntries.length) return;

        isArchiveLoading = true;

        // Show Loader
        const loader = document.querySelector('.archive-loader');
        if (loader) loader.classList.remove('hidden');

        try {
            const startIndex = loadedArchiveCount;
            const endIndex = Math.min(startIndex + ARCHIVE_BATCH_SIZE, archiveStoryEntries.length);
            const grid = document.querySelector('.archive-grid');

            const batchPromises = [];
            for (let i = startIndex; i < endIndex; i++) {
                const entry = archiveStoryEntries[i];
                const filename = entry.file || entry.date;

                const p = fetch(`${STORIES_BASE_URL}${filename}.json`)
                    .then(res => res.json())
                    .then(storyData => {
                        storyData.time = entry.time;
                        storyData.filename = filename; // Pass filename for click handler
                        return storyData;
                    })
                    .catch(e => null);
                batchPromises.push(p);
            }

            const results = await Promise.all(batchPromises);

            // Append elements
            results.forEach(s => {
                if (s) {
                    const item = document.createElement('div');
                    item.className = 'archive-item';
                    item.dataset.file = s.filename;
                    item.innerHTML = `
                        <div class="archive-date">
                            ${formatDate(s.date)} 
                            <span class="archive-time">${formatTime(s.time)}</span>
                        </div>
                        <div class="archive-info">
                            <h4>${s.title}</h4>
                            <p>${s.description}</p>
                        </div>
                    `;
                    item.addEventListener('click', () => {
                        renderStory(s, true);
                        // Remove scroll listener when leaving archive view logic is handled by renderStory overriding content
                        storyContentContainer.onscroll = null;
                    });
                    grid.appendChild(item);
                }
            });

            loadedArchiveCount = endIndex;
        } finally {
            isArchiveLoading = false;

            // Check if we reached the end
            if (loadedArchiveCount >= archiveStoryEntries.length) {
                if (loader) loader.remove(); // Remove completely
                storyContentContainer.onscroll = null; // Detach listener
            } else {
                if (loader) loader.classList.add('hidden');
            }
        }
    }

    function renderError() {
        storyContentContainer.innerHTML = `
            <div class="story-error">
                <p>Something went wrong loading the story.</p>
                <button class="btn-secondary" onclick="document.querySelector('.story-close-btn').click()">Close</button>
            </div>
        `;
    }

    function closeStoryViewer() {
        storyOverlay.classList.add('hidden');
        document.body.style.overflow = '';
        setTimeout(() => {
            storyContentContainer.innerHTML = `
                <div class="story-loading">
                    <div class="spinner"></div>
                    <p>Loading...</p>
                </div>
            `;
        }, 300);
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStories);
    } else {
        initStories();
    }

})();