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
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
    let isFlipped = false;
    let todayStoryData = null;

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

        // Check for today's story and update preview
        await checkTodayStory();

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

    async function checkTodayStory() {
        try {
            const response = await fetch(`${STORIES_BASE_URL}index.json`);
            if (!response.ok) {
                updatePreviewNoStory();
                return;
            }
            const data = await response.json();

            if (data.stories.includes(today)) {
                // Fetch today's story
                const storyResponse = await fetch(`${STORIES_BASE_URL}${today}.json`);
                todayStoryData = await storyResponse.json();
                updatePreviewWithStory(todayStoryData);
            } else {
                updatePreviewNoStory();
            }
        } catch (e) {
            console.warn('Failed to check stories:', e);
            updatePreviewNoStory();
        }
    }

    function updatePreviewWithStory(story) {
        const previewImg = document.querySelector('.preview-story-img');
        const previewTitle = document.querySelector('.preview-title');
        const previewDesc = document.querySelector('.preview-desc');
        const viewBtn = document.getElementById('btn-flip-view');

        if (previewImg && story.image) {
            previewImg.src = story.image;
        }
        if (previewTitle) {
            previewTitle.textContent = story.title;
        }
        if (previewDesc) {
            previewDesc.textContent = story.description;
        }
        if (viewBtn) {
            viewBtn.textContent = 'View Full Story';
        }
    }

    function updatePreviewNoStory() {
        const previewTitle = document.querySelector('.preview-title');
        const previewDesc = document.querySelector('.preview-desc');
        const viewBtn = document.getElementById('btn-flip-view');

        if (previewTitle) {
            previewTitle.textContent = 'No story for today';
        }
        if (previewDesc) {
            previewDesc.textContent = 'Check back tomorrow for new updates!';
        }
        if (viewBtn) {
            viewBtn.style.display = 'none';
        }
    }

    function openFullStoryPopup() {
        if (!todayStoryData) return;

        // Flip back to normal
        if (isFlipped) {
            toggleFlip();
        }

        // Show popup
        storyOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        renderStory(todayStoryData);
    }

    function openArchivePage() {
        // Flip back to normal
        if (isFlipped) {
            toggleFlip();
        }

        // Show popup with archive
        storyOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        loadArchive();
    }

    function renderStory(story, fromArchive = false) {
        const imageSrc = story.image ? story.image : 'https://placehold.co/600x400/0ea5e9/ffffff?text=Daily+Story';

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
            stickyDateEl.textContent = formatDate(story.date);
        }

        const html = `
            <div class="story-view-mode">
                <div class="story-header">
                    <!-- Date moved to sticky header -->
                    <h2 class="story-title">${story.title}</h2>
                </div>
                <div class="story-body">
                    <div class="story-image-container">
                        <img src="${imageSrc}" alt="${story.title}" class="story-image">
                    </div>
                    <div class="story-text">
                        <p class="story-desc">${story.description}</p>
                        <div class="story-full-content">${story.content || ''}</div>
                    </div>
                </div>
                <!-- View Recent Stories button removed -->
            </div>
        `;
        storyContentContainer.innerHTML = html;

        if (!fromArchive) {
            // No bottom button action needed anymore
        }
    }

    // Cache state
    let archiveCache = null;

    async function loadArchive() {
        // Hide fixed back button in archive view
        const fixedBackBtn = document.getElementById('story-back-btn');
        if (fixedBackBtn) {
            fixedBackBtn.classList.add('hidden');
        }

        // Set sticky header title for archive
        const stickyDateEl = document.querySelector('.sticky-date');
        if (stickyDateEl) {
            stickyDateEl.textContent = 'Recent Stories';
        }

        // Use cache if available
        if (archiveCache) {
            storyContentContainer.innerHTML = archiveCache;
            attachArchiveListeners(); // Re-attach listeners after innerHTML replacement
            return;
        }

        try {
            // Fetch index
            const indexResponse = await fetch(`${STORIES_BASE_URL}index.json?t=${Date.now()}`);
            const indexData = await indexResponse.json();
            const availableDates = indexData.stories;

            // Sort dates descending
            const sortedDates = availableDates.sort((a, b) => new Date(b) - new Date(a));

            let listHtml = `<div class="story-archive-list"><div class="archive-grid">`;

            // We need to fetch each story to get the title/desc
            // In a real app, this data should be in index.json to avoid N+1 requests
            for (const date of sortedDates) {
                try {
                    const sRes = await fetch(`${STORIES_BASE_URL}${date}.json`);
                    const s = await sRes.json();

                    listHtml += `
                        <div class="archive-item" data-date="${date}">
                            <div class="archive-date">${formatDate(s.date)}</div>
                            <div class="archive-info">
                                <h4>${s.title}</h4>
                                <p>${s.description}</p>
                            </div>
                        </div>
                    `;
                } catch (e) {
                    console.warn(`Failed to load archive item for ${date}`);
                }
            }
            listHtml += `</div></div>`;

            // Save to cache
            archiveCache = listHtml;
            storyContentContainer.innerHTML = listHtml;
            attachArchiveListeners();

        } catch (e) {
            console.error('Error loading archive:', e);
            renderError();
        }
    }

    function attachArchiveListeners() {
        document.querySelectorAll('.archive-item').forEach(item => {
            item.addEventListener('click', async () => {
                const date = item.dataset.date;
                // Here we fetch the single story again. 
                // Since individual JSON are small and likely browser-cached, this is acceptable.
                // Optimizing this further would require a data-cache object mapping date -> storyData.
                try {
                    const sRes = await fetch(`${STORIES_BASE_URL}${date}.json`);
                    const story = await sRes.json();
                    renderStory(story, true);
                } catch (e) {
                    console.error('Failed to load story', e);
                }
            });
        });
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
        // Clear content after delay to reset state
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