const addItemForm = document.getElementById('addItemForm');
const itemInput = document.getElementById('ItemInput');
const artInput = document.getElementById('ArtInput');
const storyInput = document.getElementById('StoryInput');
const charactersInput = document.getElementById('CharactersInput');
const enjoymentInput = document.getElementById('EnjoymentInput');
const tagsInput = document.getElementById('TagsInput');
const reviewInput = document.getElementById('ReviewInput');
let items = [];

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
    rankedList.innerHTML = '';

    items.sort((a, b) => b.score - a.score); 

    items.forEach((item, index) => {
        const li = document.createElement('li');
        
        // Create tags display
        const tagsDisplay = item.tags && item.tags.length > 0 
            ? `<div class="tags">${item.tags.map(tag => `<span class="tag">${tag.trim()}</span>`).join('')}</div>`
            : '';
        
        li.innerHTML = `  
          <div class="item-content">
            <span class="item-title">${index + 1}: ${item.name} - Score: ${item.score}</span>
            ${tagsDisplay}
            <div class="item-actions">
              <button class="edit-btn" onclick="editItem(${item.id})">Edit</button>
              <button class="delete-btn" onclick="deleteItem(${item.id})">Delete</button>
            </div>
          </div>
        `;
        
        // Add click event to show details (only for the item content, not buttons)
        const itemContent = li.querySelector('.item-content');
        itemContent.addEventListener('click', (e) => {
            // Don't show details if clicking on edit or delete buttons
            if (e.target.classList.contains('edit-btn') || e.target.classList.contains('delete-btn')) {
                return;
            }
            
            // Create overlay content
            const tagsDisplay = item.tags && item.tags.length > 0 
                ? `<p>Tags: ${item.tags.map(tag => `<span class="tag">${tag.trim()}</span>`).join(' ')}</p>`
                : '<p>Tags: None</p>';
                
            const overlayContent = `
                <div id="overlay-content">
                    <h2>${item.name}</h2>
                    <p>Art: ${item.art}</p>
                    <p>Story: ${item.story}</p>
                    <p>Characters: ${item.characters}</p>
                    <p>Enjoyment: ${item.enjoyment}</p>
                    ${tagsDisplay}
                    <p>Review: ${item.review}</p>
                    <div class="overlay-actions">
                        <button id="editOverlayBtn" onclick="editItem(${item.id})">Edit</button>
                        <button id="deleteOverlayBtn" onclick="deleteItem(${item.id})">Delete</button>
                        <button id="closeOverlay">Close</button>
                    </div>
                </div>
            `;
            // Set overlay HTML
            const overlay = document.getElementById("overlay");
            overlay.innerHTML = overlayContent;
            overlay.style.display = "block"; // Show overlay

            // Close overlay event
            document.getElementById("closeOverlay").addEventListener("click", () => {
                overlay.style.display = "none"; // Hide overlay
                overlay.innerHTML = ""; // Clear overlay content
            });
        });

        rankedList.appendChild(li);
    });

    localStorage.setItem('rankedItems', JSON.stringify(items));
}


function addItem() {
    const itemName = itemInput.value.trim();
    const art = parseInt(artInput.value, 10);
    const story = parseInt(storyInput.value, 10);
    const characters = parseInt(charactersInput.value, 10);
    const enjoyment = parseInt(enjoymentInput.value, 10);
    const tagsText = tagsInput.value.trim();
    const review = reviewInput.value.trim();
    
    // Parse tags from comma-separated input
    const tags = tagsText ? tagsText.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

    // Validate input values
    if (itemName && !isNaN(art) && !isNaN(story) && !isNaN(characters) && !isNaN(enjoyment) && art >= 1 && story >= 1 && characters >= 1 && enjoyment >= 1) {
        const newItem = new Item(Date.now(), itemName, art, story, characters, enjoyment, tags, review);
        items.push(newItem);
        
        // Recalculate scores for all items
        items.forEach(item => {
            item.score = calculateWeightedScore({
                art: item.art,
                story: item.story,
                characters: item.characters,
                enjoyment: item.enjoyment
            });
            console.log(`Item: ${item.name}, Score: ${item.score}`); // Debugging line
        });

        renderList();
        clearInputs(); // Clear inputs after adding the item

    } else {
        console.log('Please enter valid ratings between 1 and 10.');
    }
}

function clearItems() {
    items = []; 
    renderList(); 
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
        item.score = Math.max(0, item.score + change);
        renderList();
    }
}

function editItem(id) {
    const item = items.find(item => item.id === id);
    if (!item) return;
    
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
    overlay.innerHTML = "";
    
    const addForm = document.querySelector("#addItemForm");
    addForm.classList.add('active');
    overlay.style.display = "block";
    
    // Change the form title and button
    const addNewTitle = document.getElementById("addNew");
    const addButton = addForm.querySelector('button[type="submit"]');
    
    addNewTitle.textContent = "Edit Item:";
    addButton.textContent = "Update";
    addButton.onclick = () => updateItem(id);
}

function updateItem(id) {
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

    // Validate input values
    if (itemName && !isNaN(art) && !isNaN(story) && !isNaN(characters) && !isNaN(enjoyment) && art >= 1 && story >= 1 && characters >= 1 && enjoyment >= 1) {
        // Update the item
        item.name = itemName;
        item.art = art;
        item.story = story;
        item.characters = characters;
        item.enjoyment = enjoyment;
        item.tags = tags;
        item.review = review;
        item.score = calculateWeightedScore({art, story, characters, enjoyment});
        
        // Recalculate scores for all items
        items.forEach(item => {
            item.score = calculateWeightedScore({
                art: item.art,
                story: item.story,
                characters: item.characters,
                enjoyment: item.enjoyment
            });
        });

        renderList();
        clearInputs();
        off(); // Close the form
        
        // Reset form title and button
        const addNewTitle = document.getElementById("addNew");
        const addButton = document.querySelector('#addItemForm button[type="submit"]');
        addNewTitle.textContent = "Add New:";
        addButton.textContent = "Add";
        addButton.onclick = () => addItem();

    } else {
        console.log('Please enter valid ratings between 1 and 10.');
    }
}

function deleteItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        items = items.filter(item => item.id !== id);
        renderList();
        
        // Close overlay if it's open
        const overlay = document.getElementById("overlay");
        if (overlay.style.display === "block") {
            overlay.style.display = "none";
            overlay.innerHTML = "";
        }
    }
}


function on() {
        // Clear any existing overlay content first
        const overlay = document.getElementById("overlay");
        overlay.innerHTML = "";
        
        const addForm = document.querySelector("#addItemForm");
        addForm.classList.add('active');
        overlay.style.display = "block";
    }
      
    function off() {
        const addForm = document.querySelector("#addItemForm");
        addForm.classList.remove('active');
        const overlay = document.getElementById("overlay");
        overlay.style.display = "none";
        overlay.innerHTML = ""; // Clear overlay content
        
        // Reset form title and button
        const addNewTitle = document.getElementById("addNew");
        const addButton = document.querySelector('#addItemForm button[type="submit"]');
        addNewTitle.textContent = "Add New:";
        addButton.textContent = "Add";
        addButton.onclick = () => addItem();
    }

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("addButton").addEventListener("click", on);

    
    const savedItems = localStorage.getItem('rankedItems');
    items = savedItems ? JSON.parse(savedItems) : [];
    renderList();
});