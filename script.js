const addItemForm = document.getElementById('addItemForm');
const itemInput = document.getElementById('ItemInput');
const artInput = document.getElementById('ArtInput');
const storyInput = document.getElementById('StoryInput');
const charactersInput = document.getElementById('CharactersInput');
const enjoymentInput = document.getElementById('EnjoymentInput');
const tagsInput = document.getElementById('TagsInput');
const reviewInput = document.getElementById('ReviewInput');
const rankedList = document.getElementById('rankedList');
const searchInput = document.getElementById('searchInput');
const tagFilter = document.getElementById('tagFilter');
const scoreFilter = document.getElementById('scoreFilter');
const collectionSummary = document.getElementById('collectionSummary');
const emptyState = document.getElementById('emptyState');
const itemFormStatus = document.getElementById('itemFormStatus');
let items = [];
let editingItemId = null;
let activeUserId = null;
let collectionReady = false;
let cloudCollectionLoadFailed = false;
let collectionLoadGeneration = 0;
let itemSubmissionInProgress = false;
const pendingCollectionActions = new Set();
const collectionStatus = document.getElementById('collectionStatus');
const retryCollectionButton = document.getElementById('retryCollectionButton');

class Item {
    constructor(id, name, art, story, characters, enjoyment, tags, review) {
        this.id = id;   
        this.name = name;
        this.art = art;
        this.story = story;
        this.characters = characters;
        this.enjoyment = enjoyment;
        this.tags = tags;
        this.review = review;
        this.score = calculateWeightedScore({art, story, characters, enjoyment});  
    }
}

function calculateWeightedScore(ratings) {
    const weights = { art: 0.3, story: 0.3, characters: 0.2, enjoyment: 0.2 };
    let score = (ratings.art * weights.art) +
                (ratings.story * weights.story) +
                (ratings.characters * weights.characters) +
                (ratings.enjoyment * weights.enjoyment);
    return score.toFixed(2); // Ensure the score is a string with two decimal places
}

function showCollectionStatus(message, state = 'info', canRetry = false) {
    collectionStatus.textContent = message;
    collectionStatus.dataset.state = state;
    collectionStatus.hidden = !message;
    retryCollectionButton.hidden = !canRetry;
}

function showItemFormStatus(message) {
    itemFormStatus.textContent = message;
    itemFormStatus.hidden = !message;
}

function sortedItems(collection) {
    return [...collection].sort((a, b) => Number(b.score) - Number(a.score));
}

function canAddRanking() {
    return collectionReady || (Boolean(activeUserId) && cloudCollectionLoadFailed);
}

function saveGuestItems(collection) {
    try {
        sessionStorage.setItem('rankedItems', JSON.stringify(sortedItems(collection)));
    } catch (error) {
        throw new Error(`Could not save your guest collection in this browser session: ${error.message}`);
    }
}

async function loadCollection(userId) {
    if (activeUserId !== userId && addItemForm.classList.contains('active')) {
        off();
    }

    const generation = ++collectionLoadGeneration;
    activeUserId = userId;
    collectionReady = false;
    cloudCollectionLoadFailed = false;
    items = [];
    showCollectionStatus(userId ? 'Loading your account rankings…' : 'Loading your guest collection…');
    renderList();

    try {
        let loadedItems;
        if (userId) {
            loadedItems = await fetchRankings(userId);
        } else {
            const savedItems = sessionStorage.getItem('rankedItems');
            loadedItems = savedItems ? JSON.parse(savedItems) : [];
            if (!Array.isArray(loadedItems)) {
                throw new Error('Saved guest rankings are not in a valid format.');
            }
        }

        if (generation !== collectionLoadGeneration) return;
        items = loadedItems;
        collectionReady = true;
        cloudCollectionLoadFailed = false;
        showCollectionStatus('');
        renderList();
    } catch (error) {
        if (generation !== collectionLoadGeneration) return;
        collectionReady = false;
        cloudCollectionLoadFailed = Boolean(userId);
        showCollectionStatus(`Could not load rankings. ${error.message}`, 'error', true);
        renderList();
    }
}

async function initializeCollectionFromAuth() {
    const generation = ++collectionLoadGeneration;
    collectionReady = false;
    cloudCollectionLoadFailed = false;
    items = [];
    showCollectionStatus('Checking your account…');
    renderList();

    try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        if (generation !== collectionLoadGeneration) return;
        await loadCollection(data.session?.user?.id ?? null);
    } catch (error) {
        if (generation !== collectionLoadGeneration) return;
        activeUserId = null;
        collectionReady = false;
        showCollectionStatus(`Could not check your account. ${error.message}`, 'error', true);
        renderList();
    }
}

function isCurrentCollection(generation, userId) {
    return generation === collectionLoadGeneration && userId === activeUserId;
}

//move item to correct position in the list
function moveItem(id, newScore) {
    let item = items.find(item => item.id === id);
    if (item) {
        item.score = newScore;
        renderList();
    }
}


//get index of item
function getItemIndex(id) {
    return items.findIndex(item => item.id === id);
}

// Render the ranked list 
function renderList() {
    rankedList.replaceChildren();

    items.sort((a, b) => b.score - a.score); 
    const searchTerm = searchInput.value.trim().toLocaleLowerCase();
    const selectedScore = scoreFilter.value;
    const availableTags = [...new Set(items.flatMap(item => Array.isArray(item.tags) ? item.tags : [])
        .map(tag => tag.trim())
        .filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const previousTag = tagFilter.value;

    const allTagsOption = document.createElement('option');
    allTagsOption.value = '';
    allTagsOption.textContent = 'All tags';
    tagFilter.replaceChildren(allTagsOption);
    availableTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilter.appendChild(option);
    });
    tagFilter.value = availableTags.some(tag => tag.toLocaleLowerCase() === previousTag.toLocaleLowerCase())
        ? availableTags.find(tag => tag.toLocaleLowerCase() === previousTag.toLocaleLowerCase())
        : '';

    const activeTag = tagFilter.value.toLocaleLowerCase();
    const visibleItems = items.map((item, index) => ({item, index})).filter(({item}) => {
        const tags = Array.isArray(item.tags) ? item.tags : [];
        const searchableText = [item.name, item.review, ...tags].join(' ').toLocaleLowerCase();
        const score = Number(item.score);
        const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
        const matchesTag = !activeTag || tags.some(tag => tag.trim().toLocaleLowerCase() === activeTag);
        const matchesScore = !selectedScore
            || (selectedScore === 'high' && score >= 8)
            || (selectedScore === 'mid' && score >= 6 && score < 8)
            || (selectedScore === 'low' && score < 6);
        return matchesSearch && matchesTag && matchesScore;
    });

    const hasFilters = Boolean(searchTerm || activeTag || selectedScore);
    collectionSummary.textContent = hasFilters
        ? `${visibleItems.length} of ${items.length} ${items.length === 1 ? 'title' : 'titles'} shown`
        : `${items.length} ${items.length === 1 ? 'title' : 'titles'} ranked`;
    emptyState.hidden = visibleItems.length > 0;
    emptyState.textContent = items.length === 0
        ? 'Your collection is empty. Add a title to get started.'
        : 'No titles match your search and filters.';
    const clearButton = document.getElementById('clearButton');
    clearButton.textContent = pendingCollectionActions.has('clear') ? 'Clearing…' : 'Clear all items';
    clearButton.disabled = !collectionReady || items.length === 0 || pendingCollectionActions.size > 0;
    document.getElementById('addButton').disabled = !canAddRanking()
        || pendingCollectionActions.size > 0 || itemSubmissionInProgress;

    visibleItems.forEach(({item, index}) => {
        const tags = Array.isArray(item.tags) ? item.tags : [];
        const li = document.createElement('li');
        li.className = 'ranking-card';

        const rank = document.createElement('div');
        rank.className = 'rank-index';
        rank.setAttribute('aria-label', `Rank ${index + 1}`);
        const rankNumber = document.createElement('span');
        rankNumber.textContent = index + 1;
        const rankLabel = document.createElement('small');
        rankLabel.textContent = 'RANK';
        rank.append(rankNumber, rankLabel);

        const content = document.createElement('div');
        content.className = 'item-content';

        const heading = document.createElement('div');
        heading.className = 'item-heading';
        const title = document.createElement('h3');
        title.className = 'item-title';
        title.textContent = item.name;
        const score = document.createElement('span');
        score.className = 'score-display';
        const scoreLabel = document.createElement('small');
        scoreLabel.textContent = 'SCORE';
        const scoreValue = document.createElement('strong');
        scoreValue.textContent = item.score;
        score.append(scoreLabel, scoreValue);
        heading.append(title, score);
        content.appendChild(heading);

        if (tags.length > 0) {
            const tagsDisplay = document.createElement('div');
            tagsDisplay.className = 'tags';
            tags.forEach(tag => {
                const chip = document.createElement('span');
                chip.className = 'tag';
                chip.textContent = tag.trim();
                tagsDisplay.appendChild(chip);
            });
            content.appendChild(tagsDisplay);
        }

        const actions = document.createElement('div');
        actions.className = 'item-actions';
        const detailButton = document.createElement('button');
        detailButton.className = 'detail-btn';
        detailButton.type = 'button';
        detailButton.textContent = 'View details';
        detailButton.setAttribute('aria-label', `View details for ${item.name}`);
        detailButton.addEventListener('click', () => showItemDetails(item));

        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.type = 'button';
        editButton.textContent = 'Edit';
        editButton.disabled = pendingCollectionActions.size > 0;
        editButton.addEventListener('click', () => editItem(item.id));

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.type = 'button';
        const deletingItem = pendingCollectionActions.has(`delete:${item.id}`);
        deleteButton.textContent = deletingItem ? 'Deleting…' : 'Delete';
        deleteButton.disabled = pendingCollectionActions.size > 0;
        deleteButton.addEventListener('click', () => deleteItem(item.id));
        actions.append(detailButton, editButton, deleteButton);

        li.append(rank, content, actions);

        rankedList.appendChild(li);
    });

}

function showItemDetails(item) {
    const overlay = document.getElementById('overlay');
    const content = document.createElement('div');
    content.id = 'overlay-content';
    content.setAttribute('role', 'dialog');
    content.setAttribute('aria-modal', 'true');

    const title = document.createElement('h2');
    title.id = 'itemDetailsTitle';
    title.textContent = item.name;
    content.setAttribute('aria-labelledby', title.id);
    content.appendChild(title);

    [
        ['Art', item.art],
        ['Story', item.story],
        ['Characters', item.characters],
        ['Enjoyment', item.enjoyment]
    ].forEach(([label, value]) => {
        const rating = document.createElement('p');
        rating.textContent = `${label}: ${value}`;
        content.appendChild(rating);
    });

    const tags = document.createElement('p');
    tags.append('Tags: ');
    if (Array.isArray(item.tags) && item.tags.length > 0) {
        item.tags.forEach((tag, index) => {
            if (index > 0) tags.append(' ');
            const chip = document.createElement('span');
            chip.className = 'tag';
            chip.textContent = tag.trim();
            tags.appendChild(chip);
        });
    } else {
        tags.append('None');
    }
    content.appendChild(tags);

    const review = document.createElement('p');
    review.textContent = `Review: ${item.review || 'None'}`;
    content.appendChild(review);

    const actions = document.createElement('div');
    actions.className = 'overlay-actions';
    const editButton = document.createElement('button');
    editButton.id = 'editOverlayBtn';
    editButton.type = 'button';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => editItem(item.id));
    const deleteButton = document.createElement('button');
    deleteButton.id = 'deleteOverlayBtn';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => deleteItem(item.id));
    const closeButton = document.createElement('button');
    closeButton.id = 'closeOverlay';
    closeButton.type = 'button';
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.replaceChildren();
    });
    actions.append(editButton, deleteButton, closeButton);
    content.appendChild(actions);

    overlay.replaceChildren(content);
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    closeButton.focus();
}

function showRankingInfo() {
    const overlay = document.getElementById('overlay');
    const content = document.createElement('div');
    content.id = 'overlay-content';
    content.setAttribute('role', 'dialog');
    content.setAttribute('aria-modal', 'true');
    content.setAttribute('aria-labelledby', 'rankingInfoTitle');

    const title = document.createElement('h2');
    title.id = 'rankingInfoTitle';
    title.textContent = 'How scoring works';

    const explanation = document.createElement('p');
    explanation.textContent = 'Each title is rated from 1 to 10 in four categories. The overall score is a weighted average:';

    const formula = document.createElement('p');
    formula.textContent = 'Art × 30% + Story × 30% + Characters × 20% + Enjoyment × 20%';

    const example = document.createElement('p');
    example.textContent = 'For example, ratings of 8 for Art, 9 for Story, 7 for Characters, and 10 for Enjoyment give a score of 8.50.';

    const ordering = document.createElement('p');
    ordering.textContent = 'Scores are rounded to two decimal places, and titles with the highest scores appear first.';

    const actions = document.createElement('div');
    actions.className = 'overlay-actions';
    const closeButton = document.createElement('button');
    closeButton.id = 'closeOverlay';
    closeButton.type = 'button';
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.replaceChildren();
        document.getElementById('rankingInfoButton').focus();
    });
    actions.appendChild(closeButton);

    content.append(title, explanation, formula, example, ordering, actions);
    overlay.replaceChildren(content);
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    closeButton.focus();
}



async function addItem() {
    if (!canAddRanking() || itemSubmissionInProgress || pendingCollectionActions.size > 0) return;

    const itemName = itemInput.value.trim();
    const art = parseInt(artInput.value, 10);
    const story = parseInt(storyInput.value, 10);
    const characters = parseInt(charactersInput.value, 10);
    const enjoyment = parseInt(enjoymentInput.value, 10);
    const tagsText = tagsInput.value.trim();
    const review = reviewInput.value.trim();
    
    // Parse tags from comma-separated input
    const tags = tagsText ? tagsText.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

    if (!itemName || ![art, story, characters, enjoyment].every(rating => Number.isInteger(rating) && rating >= 1 && rating <= 10)) {
        showItemFormStatus('Enter a title and valid ratings from 1 to 10.');
        return;
    }

    showItemFormStatus('');
    itemSubmissionInProgress = true;
    const submitButton = document.getElementById('submitItemButton');
    const originalButtonText = submitButton.textContent;
    const generation = collectionLoadGeneration;
    const userId = activeUserId;
    submitButton.disabled = true;
    submitButton.textContent = 'Saving…';

    try {
        const newItem = new Item(userId ? null : Date.now(), itemName, art, story, characters, enjoyment, tags, review);
        const savedItem = userId ? await addRanking(newItem, userId) : newItem;
        if (!userId) saveGuestItems([...items, savedItem]);
        if (!isCurrentCollection(generation, userId)) return;

        items = sortedItems([...items, savedItem]);
        renderList();
        clearInputs();
        off();
        if (cloudCollectionLoadFailed) {
            showCollectionStatus('Ranking saved, but the rest of your collection could not be loaded.', 'error', true);
        } else {
            showCollectionStatus('');
        }
    } catch (error) {
        if (isCurrentCollection(generation, userId)) {
            showItemFormStatus(`Could not save this ranking. ${error.message}`);
        }
    } finally {
        itemSubmissionInProgress = false;
        submitButton.disabled = !collectionReady;
        submitButton.textContent = editingItemId === null ? originalButtonText : 'Save changes';
        renderList();
    }
}

async function clearItems() {
    if (!collectionReady || items.length === 0 || pendingCollectionActions.size > 0 || itemSubmissionInProgress) return;
    if (!confirm('Clear all ranked items? This cannot be undone.')) return;

    const generation = collectionLoadGeneration;
    const userId = activeUserId;
    pendingCollectionActions.add('clear');
    renderList();

    try {
        if (userId) {
            await clearRankings(userId);
        } else {
            saveGuestItems([]);
        }

        if (!isCurrentCollection(generation, userId)) return;
        items = [];
        renderList();
        showCollectionStatus('');
    } catch (error) {
        if (isCurrentCollection(generation, userId)) {
            showCollectionStatus(`Could not clear rankings. ${error.message}`, 'error');
        }
    } finally {
        pendingCollectionActions.delete('clear');
        renderList();
    }
}

function clearInputs() {
    itemInput.value = '';
    artInput.value = '';
    storyInput.value = '';
    charactersInput.value = '';
    enjoymentInput.value = '';
    tagsInput.value = '';
    reviewInput.value = '';
}
// Update the rank of an item
function updateScore(id, change) {
    let item = items.find(item => item.id === id);
    if (item) {
        item.score = Math.min(10, Math.max(0, Number(item.score) + change));
        renderList();
    }
}

function editItem(id) {
    if (!collectionReady) return;
    const item = items.find(item => item.id === id);
    if (!item) return;
    showItemFormStatus('');
    
    // Populate the form with existing data
    itemInput.value = item.name;
    artInput.value = item.art;
    storyInput.value = item.story;
    charactersInput.value = item.characters;
    enjoymentInput.value = item.enjoyment;
    tagsInput.value = item.tags ? item.tags.join(', ') : '';
    reviewInput.value = item.review;
    
    // Show the form
    const overlay = document.getElementById("overlay");
    overlay.replaceChildren();

    editingItemId = id;
    const addForm = document.querySelector("#addItemForm");
    addForm.classList.add('active');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    
    // Change the form title and button
    const addNewTitle = document.getElementById("addNew");
    const addButton = addForm.querySelector('button[type="submit"]');
    
    addNewTitle.textContent = "Edit item";
    addButton.textContent = "Save changes";
    itemInput.focus();
}

async function updateItem(id) {
    if (!collectionReady || itemSubmissionInProgress || pendingCollectionActions.size > 0) return;
    const item = items.find(item => item.id === id);
    if (!item) return;
    
    const itemName = itemInput.value.trim();
    const art = parseInt(artInput.value, 10);
    const story = parseInt(storyInput.value, 10);
    const characters = parseInt(charactersInput.value, 10);
    const enjoyment = parseInt(enjoymentInput.value, 10);
    const tagsText = tagsInput.value.trim();
    const review = reviewInput.value.trim();
    
    // Parse tags from comma-separated input
    const tags = tagsText ? tagsText.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

    if (!itemName || ![art, story, characters, enjoyment].every(rating => Number.isInteger(rating) && rating >= 1 && rating <= 10)) {
        showItemFormStatus('Enter a title and valid ratings from 1 to 10.');
        return;
    }

    showItemFormStatus('');
    itemSubmissionInProgress = true;
    const submitButton = document.getElementById('submitItemButton');
    const generation = collectionLoadGeneration;
    const userId = activeUserId;
    submitButton.disabled = true;
    submitButton.textContent = 'Saving…';

    try {
        const updatedItem = new Item(item.id, itemName, art, story, characters, enjoyment, tags, review);
        updatedItem.coverUrl = item.coverUrl ?? null;
        updatedItem.mediaType = item.mediaType ?? null;
        updatedItem.externalMediaId = item.externalMediaId ?? null;
        updatedItem.legacyId = item.legacyId ?? null;
        updatedItem.createdAt = item.createdAt ?? null;
        updatedItem.updatedAt = item.updatedAt ?? null;

        const savedItem = userId
            ? await updateRanking(updatedItem, userId)
            : updatedItem;
        const nextItems = items.map(existing => existing.id === id ? savedItem : existing);
        if (!userId) saveGuestItems(nextItems);
        if (!isCurrentCollection(generation, userId)) return;

        items = sortedItems(nextItems);
        renderList();
        clearInputs();
        off();
        showCollectionStatus('');
    } catch (error) {
        if (isCurrentCollection(generation, userId)) {
            showItemFormStatus(`Could not update this ranking. ${error.message}`);
        }
    } finally {
        itemSubmissionInProgress = false;
        submitButton.disabled = !collectionReady;
        submitButton.textContent = editingItemId === null ? 'Add item' : 'Save changes';
        renderList();
    }
}

async function deleteItem(id) {
    const item = items.find(item => item.id === id);
    if (!collectionReady || !item || pendingCollectionActions.size > 0 || itemSubmissionInProgress) return;
    if (!confirm('Are you sure you want to delete this item?')) return;

    const actionKey = `delete:${id}`;
    const generation = collectionLoadGeneration;
    const userId = activeUserId;
    const nextItems = items.filter(existing => existing.id !== id);
    pendingCollectionActions.add(actionKey);
    renderList();

    try {
        if (userId) {
            await deleteRanking(id, userId);
        } else {
            saveGuestItems(nextItems);
        }

        if (!isCurrentCollection(generation, userId)) return;
        items = nextItems;
        renderList();

        const overlay = document.getElementById('overlay');
        if (overlay.classList.contains('active')) {
            overlay.classList.remove('active');
            overlay.setAttribute('aria-hidden', 'true');
            overlay.replaceChildren();
        }
        showCollectionStatus('');
    } catch (error) {
        if (isCurrentCollection(generation, userId)) {
            showCollectionStatus(`Could not delete this ranking. ${error.message}`, 'error');
        }
    } finally {
        pendingCollectionActions.delete(actionKey);
        renderList();
    }
}


function on() {
    editingItemId = null;
    clearInputs();
    showItemFormStatus('');
    const overlay = document.getElementById("overlay");
    overlay.replaceChildren();
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');

    const addForm = document.querySelector("#addItemForm");
    addForm.classList.add('active');
    itemInput.focus();
}
      
function off() {
    const addForm = document.querySelector("#addItemForm");
    addForm.classList.remove('active');
    const overlay = document.getElementById("overlay");
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.replaceChildren();
    editingItemId = null;

    document.getElementById("addNew").textContent = "Add new item";
    document.getElementById("submitItemButton").textContent = "Add item";
    document.getElementById("addButton").focus();
}

document.addEventListener('DOMContentLoaded', () => {
    retryCollectionButton.addEventListener('click', initializeCollectionFromAuth);
    document.getElementById("addButton").addEventListener("click", on);
    document.getElementById('rankingInfoButton').addEventListener('click', showRankingInfo);
    document.getElementById("clearButton").addEventListener("click", clearItems);
    document.getElementById("closeFormButton").addEventListener("click", off);
    searchInput.addEventListener('input', renderList);
    tagFilter.addEventListener('change', renderList);
    scoreFilter.addEventListener('change', renderList);
    document.getElementById('clearButton').addEventListener('click', () => {
        document.querySelector('.overflow-menu').open = false;
    });
    addItemForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (itemSubmissionInProgress || !canAddRanking()) return;
        if (editingItemId === null) await addItem();
        else await updateItem(editingItemId);
    });

    const overlay = document.getElementById("overlay");
    overlay.addEventListener('click', event => {
        if (event.target !== overlay) return;
        if (addItemForm.classList.contains('active')) off();
        else {
            overlay.classList.remove('active');
            overlay.setAttribute('aria-hidden', 'true');
            overlay.replaceChildren();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        if (addItemForm.classList.contains('active')) off();
        else if (overlay.classList.contains('active')) {
            overlay.classList.remove('active');
            overlay.setAttribute('aria-hidden', 'true');
            overlay.replaceChildren();
        }
    });

    window.addEventListener('ranked:auth-change', event => {
        const userId = event.detail?.user?.id ?? null;
        loadCollection(userId);
    });

    initializeCollectionFromAuth();
});