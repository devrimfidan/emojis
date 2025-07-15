// Global variables
let allEmojis = [];
let filteredEmojis = [];
let currentPage = 1;
const emojisPerPage = 100;

// Popular emojis storage (will be managed from separate page)
let popularEmojis = JSON.parse(localStorage.getItem('popularEmojis') || '[]');

// DOM elements
const emojiGrid = document.getElementById('emojiGrid');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const resultsCount = document.getElementById('resultsCount');
const loading = document.getElementById('loading');
const noResults = document.getElementById('noResults');
const toast = document.getElementById('toast');

// Category mapping for the categories.min.json format
const categoryMapping = {
    'Smileys & Emotion': 'smileys-emotion',
    'People & Body': 'people-body', 
    'Animals & Nature': 'animals-nature',
    'Food & Drink': 'food-drink',
    'Travel & Places': 'travel-places',
    'Activities': 'activities',
    'Objects': 'objects',
    'Symbols': 'symbols',
    'Flags': 'flags'
};

// Map category from the JSON format to our dropdown format
function mapCategoryName(categoryName) {
    return categoryMapping[categoryName] || categoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Generate keywords from emoji name and categories
function generateKeywords(name, category, subcategory) {
    const keywords = [];
    
    // Add words from the emoji name
    if (name) {
        keywords.push(...name.toLowerCase().split(/[\s-]+/));
    }
    
    // Add category words
    if (category) {
        keywords.push(...category.toLowerCase().split(/[\s&-]+/));
    }
    
    // Add subcategory words
    if (subcategory) {
        keywords.push(...subcategory.toLowerCase().split(/[\s-]+/));
    }
    
    // Remove duplicates and empty strings
    return [...new Set(keywords.filter(word => word.length > 0))];
}

// Initialize the application
async function init() {
    try {
        await loadEmojis();
        setupEventListeners();
        displayEmojis();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Failed to load emoji data. Please try refreshing the page.');
    }
}

// Load emoji data from local JSON file
async function loadEmojis() {
    try {
        const response = await fetch('./src/categories.min.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Loaded emoji data version:', data['@version']);
        
        // Transform the categories structure to our format
        allEmojis = [];
        const emojiData = data.emojis;
        
        // Process each category
        Object.keys(emojiData).forEach(categoryName => {
            const categoryKey = mapCategoryName(categoryName);
            const subcategories = emojiData[categoryName];
            
            // Process each subcategory
            Object.keys(subcategories).forEach(subcategoryName => {
                const emojis = subcategories[subcategoryName];
                
                // Process each emoji in the subcategory
                emojis.forEach(emojiData => {
                    allEmojis.push({
                        emoji: emojiData.emoji,
                        name: emojiData.name || 'Unknown',
                        category: categoryKey,
                        keywords: generateKeywords(emojiData.name, categoryName, subcategoryName),
                        unicodeVersion: data['@version'] || '16.0'
                    });
                });
            });
        });
        
        console.log('Processed emojis:', allEmojis.length, 'Sample:', allEmojis.slice(0, 3));
        filteredEmojis = [...allEmojis];
        hideLoading();
    } catch (error) {
        console.error('Error loading emojis:', error);
        // Fallback to a basic emoji set if local file fails
        loadFallbackEmojis();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Category filter
    categoryFilter.addEventListener('change', handleCategoryFilter);
    
    // Clear search on escape
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            handleSearch();
        }
    });
}

// Handle search functionality
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredEmojis = [...allEmojis];
    } else {
        filteredEmojis = allEmojis.filter(emoji => {
            return emoji.name.toLowerCase().includes(searchTerm) ||
                   emoji.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm)) ||
                   emoji.category.toLowerCase().includes(searchTerm);
        });
    }
    
    // Apply category filter if active
    const selectedCategory = categoryFilter.value;
    if (selectedCategory) {
        filteredEmojis = filteredEmojis.filter(emoji => 
            emoji.category === selectedCategory
        );
    }
    
    currentPage = 1;
    displayEmojis();
}

// Handle category filter
function handleCategoryFilter() {
    const selectedCategory = categoryFilter.value;
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!selectedCategory) {
        filteredEmojis = [...allEmojis];
    } else {
        filteredEmojis = allEmojis.filter(emoji => emoji.category === selectedCategory);
    }
    
    // Apply search filter if active
    if (searchTerm) {
        filteredEmojis = filteredEmojis.filter(emoji => {
            return emoji.name.toLowerCase().includes(searchTerm) ||
                   emoji.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm));
        });
    }
    
    currentPage = 1;
    displayEmojis();
}

// Display emojis in the grid
function displayEmojis() {
    const startIndex = (currentPage - 1) * emojisPerPage;
    const endIndex = startIndex + emojisPerPage;
    const emojisToShow = filteredEmojis.slice(startIndex, endIndex);
    
    // Update results count
    resultsCount.textContent = filteredEmojis.length;
    
    // Clear the grid
    emojiGrid.innerHTML = '';
    
    // Show/hide no results message
    if (filteredEmojis.length === 0) {
        noResults.classList.remove('hidden');
        emojiGrid.classList.add('hidden');
        return;
    } else {
        noResults.classList.add('hidden');
        emojiGrid.classList.remove('hidden');
    }
    
    // Create emoji cards
    emojisToShow.forEach(emoji => {
        const emojiCard = createEmojiCard(emoji);
        emojiGrid.appendChild(emojiCard);
    });
    
    // Load more button if there are more emojis
    if (endIndex < filteredEmojis.length) {
        const loadMoreBtn = createLoadMoreButton();
        emojiGrid.appendChild(loadMoreBtn);
    }
}

// Create individual emoji card
function createEmojiCard(emoji) {
    const card = document.createElement('div');
    card.className = 'emoji-card bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col items-center justify-center text-center';
    
    card.innerHTML = `
        <div class="text-3xl mb-2">${emoji.emoji}</div>
        <div class="text-xs text-gray-600 font-medium truncate w-full" title="${emoji.name}">
            ${emoji.name}
        </div>
        <div class="text-xs text-gray-400 mt-1 capitalize">
            ${formatCategory(emoji.category)}
        </div>
    `;
    
    // Add click event to copy emoji
    card.addEventListener('click', () => copyEmoji(emoji.emoji, card));
    
    return card;
}

// Create load more button
function createLoadMoreButton() {
    const button = document.createElement('div');
    button.className = 'col-span-full flex justify-center mt-8';
    button.innerHTML = `
        <button 
            class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
            onclick="loadMore()"
        >
            Load More Emojis
        </button>
    `;
    return button;
}

// Load more emojis
function loadMore() {
    currentPage++;
    displayEmojis();
}

// Copy emoji to clipboard
async function copyEmoji(emoji, cardElement) {
    try {
        await navigator.clipboard.writeText(emoji);
        
        // Add copied animation
        cardElement.classList.add('copied');
        setTimeout(() => cardElement.classList.remove('copied'), 500);
        
        // Show toast notification
        showToast();
    } catch (error) {
        console.error('Failed to copy emoji:', error);
        // Fallback for older browsers
        fallbackCopyTextToClipboard(emoji);
        showToast();
    }
}

// Fallback copy method for older browsers
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Fallback: Unable to copy', err);
    }
    
    document.body.removeChild(textArea);
}

// Show toast notification
function showToast() {
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// Show error message
function showError(message) {
    hideLoading();
    emojiGrid.innerHTML = `
        <div class="col-span-full text-center py-12">
            <div class="text-6xl mb-4">😞</div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Oops! Something went wrong</h3>
            <p class="text-gray-600">${message}</p>
        </div>
    `;
}

// Hide loading state
function hideLoading() {
    loading.classList.add('hidden');
}

// Format category name for display
function formatCategory(category) {
    return category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Debounce function to limit API calls
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

// Fallback emoji data if external API fails
function loadFallbackEmojis() {
    console.log('Loading fallback emoji data...');
    
    allEmojis = [
        // Basic fallback emojis
        { emoji: '😀', name: 'grinning face', category: 'smileys-emotion', keywords: ['happy', 'smile', 'grin'] },
        { emoji: '😃', name: 'grinning face with big eyes', category: 'smileys-emotion', keywords: ['happy', 'smile', 'grin'] },
        { emoji: '😄', name: 'grinning face with smiling eyes', category: 'smileys-emotion', keywords: ['happy', 'smile', 'grin'] },
        { emoji: '😁', name: 'beaming face with smiling eyes', category: 'smileys-emotion', keywords: ['happy', 'smile', 'grin'] },
        { emoji: '😅', name: 'grinning face with sweat', category: 'smileys-emotion', keywords: ['happy', 'sweat', 'laugh'] },
        { emoji: '😂', name: 'face with tears of joy', category: 'smileys-emotion', keywords: ['laugh', 'cry', 'funny'] },
        { emoji: '🤣', name: 'rolling on the floor laughing', category: 'smileys-emotion', keywords: ['laugh', 'funny', 'rofl'] },
        { emoji: '😊', name: 'smiling face with smiling eyes', category: 'smileys-emotion', keywords: ['smile', 'happy'] },
        { emoji: '😍', name: 'smiling face with heart-eyes', category: 'smileys-emotion', keywords: ['love', 'heart', 'smile'] },
        { emoji: '🥰', name: 'smiling face with hearts', category: 'smileys-emotion', keywords: ['love', 'heart', 'smile'] }
    ];
    
    filteredEmojis = [...allEmojis];
    hideLoading();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Focus search input on Ctrl/Cmd + K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
    
    // Clear search on Ctrl/Cmd + /
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        searchInput.value = '';
        searchInput.focus();
        handleSearch();
    }
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Add some helpful keyboard shortcuts info to the page
document.addEventListener('DOMContentLoaded', () => {
    const shortcutsInfo = document.createElement('div');
    shortcutsInfo.className = 'fixed bottom-4 left-4 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg opacity-75 hover:opacity-100 transition-opacity';
    shortcutsInfo.innerHTML = `
        <div class="mb-1"><kbd class="bg-gray-700 px-1 rounded">Ctrl/⌘ + K</kbd> Focus search</div>
        <div><kbd class="bg-gray-700 px-1 rounded">Ctrl/⌘ + /</kbd> Clear search</div>
    `;
    document.body.appendChild(shortcutsInfo);
});
