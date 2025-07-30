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
          </div>
        `;
        
        // Add click event to show details
        li.addEventListener('click', () => {
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
                    <button id="closeOverlay">Close</button>
                </div>
            `;
            // Set overlay HTML
            const overlay = document.getElementById("overlay");
            overlay.innerHTML = overlayContent;
            overlay.style.display = "block"; // Show overlay

            // Close overlay event
            document.getElementById("closeOverlay").addEventListener("click", () => {
                overlay.style.display = "none"; // Hide overlay
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


function on() {
        document.getElementById("addItemForm").style.display = "block";
        const addForm = document.querySelector("#addItemForm");
        addForm.classList.add('active');
        document.getElementById("overlay").style.display = "block";
    }
      
    function off() {
        document.getElementById("addItemForm").style.display = "none";
        document.getElementById("overlay").style.display = "none";
    }

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("addButton").addEventListener("click", on);

    
    const savedItems = localStorage.getItem('rankedItems');
    items = savedItems ? JSON.parse(savedItems) : [];
    renderList();
});