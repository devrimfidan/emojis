// Global variables
let allEmojis = [];
let filteredEmojis = [];
let currentPage = 1;
const emojisPerPage = 100;
let popularEmojis = JSON.parse(localStorage.getItem('popularEmojis') || '[]');

// DOM elements
const emojiGrid = document.getElementById('emojiGrid');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const resultsCount = document.getElementById('resultsCount');
const loading = document.getElementById('loading');
const noResults = document.getElementById('noResults');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const currentPopular = document.getElementById('currentPopular');
const popularCount = document.getElementById('popularCount');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');

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
        displayCurrentPopular();
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
        
        console.log('Processed emojis:', allEmojis.length);
        filteredEmojis = [...allEmojis];
        hideLoading();
    } catch (error) {
        console.error('Error loading emojis:', error);
        showError('Failed to load emoji data. Please try refreshing the page.');
    }
}

// Display current popular emojis
function displayCurrentPopular() {
    currentPopular.innerHTML = '';
    popularCount.textContent = popularEmojis.length;
    
    if (popularEmojis.length === 0) {
        currentPopular.innerHTML = `
            <div class="col-span-full flex items-center justify-center text-gray-500 text-sm">
                No popular emojis selected yet
            </div>
        `;
        return;
    }
    
    popularEmojis.forEach((emoji, index) => {
        const emojiCard = document.createElement('div');
        emojiCard.className = 'popular-emoji bg-gray-50 hover:bg-red-50 rounded-lg border border-gray-200 hover:border-red-300 p-2 cursor-pointer transition-all duration-200 flex items-center justify-center text-center relative';
        
        emojiCard.innerHTML = `
            <div class="text-2xl" title="Click to remove ${emoji}">${emoji}</div>
            <div class="remove-btn" title="Remove from popular">
                <i class="fas fa-times"></i>
            </div>
        `;
        
        // Add click event to remove emoji
        emojiCard.addEventListener('click', () => removeFromPopular(index));
        
        currentPopular.appendChild(emojiCard);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Category filter
    categoryFilter.addEventListener('change', handleCategoryFilter);
    
    // Save button
    saveBtn.addEventListener('click', savePopularEmojis);
    
    // Clear button
    clearBtn.addEventListener('click', clearPopularEmojis);
    
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
    const isSelected = popularEmojis.includes(emoji.emoji);
    
    card.className = `emoji-card bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col items-center justify-center text-center ${isSelected ? 'selected' : ''}`;
    
    card.innerHTML = `
        <div class="text-3xl mb-2">${emoji.emoji}</div>
        <div class="text-xs text-gray-600 font-medium truncate w-full" title="${emoji.name}">
            ${emoji.name}
        </div>
        <div class="text-xs text-gray-400 mt-1 capitalize">
            ${formatCategory(emoji.category)}
        </div>
        ${isSelected ? '<div class="text-xs text-blue-600 font-medium mt-1">✓ Added</div>' : ''}
    `;
    
    // Add click event to add/remove emoji
    card.addEventListener('click', () => togglePopularEmoji(emoji.emoji, card));
    
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

// Toggle emoji in popular list
function togglePopularEmoji(emoji, cardElement) {
    const index = popularEmojis.indexOf(emoji);
    
    if (index > -1) {
        // Remove from popular
        popularEmojis.splice(index, 1);
        cardElement.classList.remove('selected');
        cardElement.querySelector('.text-blue-600')?.remove();
        showToast('Removed from popular emojis', 'info');
    } else {
        // Add to popular
        popularEmojis.push(emoji);
        cardElement.classList.add('selected');
        cardElement.innerHTML += '<div class="text-xs text-blue-600 font-medium mt-1">✓ Added</div>';
        showToast('Added to popular emojis', 'success');
    }
    
    displayCurrentPopular();
}

// Remove emoji from popular list
function removeFromPopular(index) {
    const removedEmoji = popularEmojis.splice(index, 1)[0];
    displayCurrentPopular();
    
    // Update the emoji card in the grid if visible
    const emojiCards = document.querySelectorAll('.emoji-card');
    emojiCards.forEach(card => {
        const emojiText = card.querySelector('.text-3xl').textContent;
        if (emojiText === removedEmoji) {
            card.classList.remove('selected');
            card.querySelector('.text-blue-600')?.remove();
        }
    });
    
    showToast('Removed from popular emojis', 'info');
}

// Save popular emojis to localStorage
function savePopularEmojis() {
    localStorage.setItem('popularEmojis', JSON.stringify(popularEmojis));
    showToast('Popular emojis saved successfully!', 'success');
}

// Clear all popular emojis
function clearPopularEmojis() {
    if (popularEmojis.length === 0) {
        showToast('No popular emojis to clear', 'info');
        return;
    }
    
    if (confirm('Are you sure you want to clear all popular emojis?')) {
        popularEmojis = [];
        displayCurrentPopular();
        
        // Update all emoji cards in the grid
        const emojiCards = document.querySelectorAll('.emoji-card');
        emojiCards.forEach(card => {
            card.classList.remove('selected');
            card.querySelector('.text-blue-600')?.remove();
        });
        
        showToast('All popular emojis cleared', 'info');
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    
    // Update toast color based on type
    if (type === 'success') {
        toast.style.backgroundColor = '#10b981';
    } else if (type === 'info') {
        toast.style.backgroundColor = '#3b82f6';
    } else if (type === 'error') {
        toast.style.backgroundColor = '#ef4444';
    }
    
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
    
    // Save on Ctrl/Cmd + S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        savePopularEmojis();
    }
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Auto-save on page unload
window.addEventListener('beforeunload', () => {
    localStorage.setItem('popularEmojis', JSON.stringify(popularEmojis));
});
