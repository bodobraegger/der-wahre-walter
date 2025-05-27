// Assumes cookies.js (providing getCookie, setCookie) is loaded before this script.

const CardGame = {
    cardsData: {}, // Changed from array to object for direct key access
    viewedNumbers: [],
    previousCardNumber: -1,
    currentCardNumber: -1,
    availableCardNumbers: [],

    domElements: {
        currentCardDisplay: null,
        flipButton: null,
        prevButton: null,
        nextButton: null,
    },

    async init() {
        try {
            const response = await fetch('data/walter_cards.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.cardsData = data.cards; // cardsData is an object { "id": card_obj, ... }
        } catch (error) {
            console.error("Failed to load card data:", error);
            alert("Fehler beim Laden der Kartendaten. Bitte versuchen Sie es später erneut.");
            return;
        }

        if (Object.keys(this.cardsData).length === 0) {
            alert("Keine Kartendaten gefunden. Das Spiel kann nicht gestartet werden.");
            return;
        }

        this.domElements.currentCardDisplay = document.getElementById("current_card");
        this.domElements.flipButton = document.getElementById("btn-flip");
        this.domElements.prevButton = document.getElementById('btn-prev');
        this.domElements.nextButton = document.getElementById('btn-next');

        this._loadOrShuffle();
        this._attachEventListeners();
    },

    _shuffleCards() {
        this.availableCardNumbers = Object.keys(this.cardsData);
        this._shuffleArray(this.availableCardNumbers);
        this.viewedNumbers = [];
        // previousCardNumber remains as is, or reset if needed
        this.currentCardNumber = -1; // Reset current card, a new one will be drawn
        this._saveStateToCookie();
    },

    _loadOrShuffle() {
        const historyCookie = getCookie("history");
        if (historyCookie) {
            try {
                const history = JSON.parse(historyCookie);
                this.viewedNumbers = Array.isArray(history.viewed_nrs) ? history.viewed_nrs : [];
                this.currentCardNumber = (history.current_nr !== undefined && this.cardsData[history.current_nr]) ? history.current_nr : -1;
                this.availableCardNumbers = Array.isArray(history.card_nrs) ? history.card_nrs.filter(nr => this.cardsData[nr]) : [];

                // If cookie state is inconsistent (e.g. refers to non-existent cards, or empty stacks when it shouldn't be)
                if (this.currentCardNumber === -1 && this.availableCardNumbers.length === 0 && this.viewedNumbers.length > 0) {
                    // All cards might have been viewed, then available became empty.
                    // Or, cookie is just in a weird state.
                    // If current is -1 and no available cards, try to get one from viewed (like a soft reset of last card)
                    // or shuffle if viewed is also empty.
                } else if (this.currentCardNumber === -1 && this.availableCardNumbers.length === 0 && this.viewedNumbers.length === 0) {
                    // Truly empty state from cookie, or invalid cookie. Reshuffle.
                    this._shuffleCards();
                }

            } catch (e) {
                console.warn("Failed to parse history cookie or cookie data invalid, shuffling anew.", e);
                this._shuffleCards();
            }
        } else {
            this._shuffleCards();
        }

        if (this.currentCardNumber !== -1) {
            this._renderCard(this.currentCardNumber);
        } else if (this.availableCardNumbers.length > 0) {
            this.showNextCard(); // Draws and renders a new card
        } else if (this.viewedNumbers.length > 0) {
            // All cards viewed, available is empty, current is -1.
            // This state implies we should probably reshuffle or indicate game end.
            alert("Alle Karten wurden angesehen. Der Stapel wird neu gemischt.");
            this._shuffleCards();
            if (this.availableCardNumbers.length > 0) this.showNextCard();
            else alert("Keine Karten zum Anzeigen nach dem Mischen.");
        } else {
            // No current card, no available cards, no viewed cards (e.g. after shuffle if cardsData was empty)
            alert("Keine Karten verfügbar. Bitte überprüfen Sie die Kartendaten.");
            if(this.domElements.currentCardDisplay) this.domElements.currentCardDisplay.innerHTML = "<p>Keine Karten.</p>";
            if(this.domElements.flipButton) this.domElements.flipButton.style.display = "none";
        }
    },

    _saveStateToCookie() {
        const history = {
            viewed_nrs: this.viewedNumbers,
            current_nr: this.currentCardNumber,
            card_nrs: this.availableCardNumbers,
        };
        setCookie("history", JSON.stringify(history), 9999);
    },

    showPreviousCard() {
        if (this.viewedNumbers.length === 0) {
            alert("Es gibt noch keine abgelegten Fichen.");
            return;
        }

        // Put the current card back into the available stack (at the beginning for immediate next)
        if (this.currentCardNumber !== -1 && this.cardsData[this.currentCardNumber]) {
            if (!this.availableCardNumbers.includes(this.currentCardNumber)) { // Avoid duplicates
                this.availableCardNumbers.unshift(this.currentCardNumber); // Add to front
            }
        }

        this.currentCardNumber = this.viewedNumbers.pop(); // Get the last viewed card
        // The card taken from viewedNumbers should not be in availableCardNumbers anymore
        this.availableCardNumbers = this.availableCardNumbers.filter(num => num !== this.currentCardNumber);

        this._renderCard(this.currentCardNumber);
    },

    showNextCard() {
        this.previousCardNumber = this.currentCardNumber;

        // Add the truly current card to viewedNumbers before getting a new one
        if (this.currentCardNumber !== -1 && this.cardsData[this.currentCardNumber]) {
            if (!this.viewedNumbers.includes(this.currentCardNumber)) {
                this.viewedNumbers.push(this.currentCardNumber);
            }
        }
        
        if (this.availableCardNumbers.length === 0) {
            alert("Der Fichen-Stapel ist leer. Er wurde erneut gemischt.");
            this._shuffleCards();
            if (this.availableCardNumbers.length === 0) { // Still no cards after shuffle (e.g. empty dataset)
                alert("Keine Karten vorhanden!");
                if(this.domElements.currentCardDisplay) this.domElements.currentCardDisplay.innerHTML = "<p>Keine Karten.</p>";
                this.currentCardNumber = -1; // Ensure no card is active
                this._saveStateToCookie();
                return;
            }
        }

        this.currentCardNumber = this.availableCardNumbers.pop();

        // Basic duplicate prevention: if new card is same as immediate previous, and more cards are available, try another.
        if (this.currentCardNumber === this.previousCardNumber && this.availableCardNumbers.length > 0) {
            this.availableCardNumbers.unshift(this.currentCardNumber); // Put it back at the start
            this._shuffleArray(this.availableCardNumbers); // Shuffle to better avoid immediate redraw
            this.currentCardNumber = this.availableCardNumbers.pop();
        }
        
        this._renderCard(this.currentCardNumber);
    },

    _renderCard(cardNumber) {
        if (cardNumber === -1 || !this.cardsData[cardNumber]) {
            console.warn("Attempted to render invalid card number:", cardNumber);
            if (this.domElements.currentCardDisplay) {
                 this.domElements.currentCardDisplay.innerHTML = "<p>Karte nicht verfügbar oder ungültig.</p>";
            }
            if (this.domElements.flipButton) this.domElements.flipButton.style.display = "none";
            // Do not save state if card is invalid, might clear a good state.
            // Or, if card truly becomes invalid, currentCardNumber should be -1 and saved.
            // For now, just display error.
            return;
        }

        const card = this.cardsData[cardNumber];
        let content = "";
        
        if (card.gender && card.flip) { // Ensure flip target exists
            this.domElements.flipButton.style.display = "";
            content = `<p class="bold text-center">${card.gender}</p>`;
        } else {
            this.domElements.flipButton.style.display = "none";
        }

        content += `
          <div class="card_nr text-right float-right">${cardNumber}</div>
          <ol>
            <li> ${this._spanifyWalter(card[1] || "")} </li>
            <li> ${this._spanifyWalter(card[2] || "")} </li>
            <li> ${this._spanifyWalter(card[3] || "")} </li>
          </ol>
        `;
        this.domElements.currentCardDisplay.innerHTML = content;
        this._saveStateToCookie();
    },

    flipCurrentCard() {
        if (this.currentCardNumber === -1 || !this.cardsData[this.currentCardNumber] || !this.cardsData[this.currentCardNumber].gender) {
            return; // Not a flippable card
        }

        const originalCard = this.cardsData[this.currentCardNumber];
        const flippedCardNumber = originalCard.flip;

        if (!this.cardsData[flippedCardNumber]) {
            console.warn("Flipped card number not found in data:", flippedCardNumber);
            alert("Die Rückseite dieser Karte konnte nicht gefunden werden.");
            return;
        }
        
        // Add original card to viewedNumbers if not already there
        if (!this.viewedNumbers.includes(this.currentCardNumber)) {
             this.viewedNumbers.push(this.currentCardNumber);
        }
       
        // Remove both original and its flipped version from availableCardNumbers
        this.availableCardNumbers = this.availableCardNumbers.filter(num => num !== this.currentCardNumber && num !== flippedCardNumber);

        this.currentCardNumber = flippedCardNumber;
        
        // The new current card (flipped side) should also be considered "viewed"
        // It's now active, so it shouldn't be in available.
        // Add to viewedNumbers so it's part of history and not redrawn from available.
        if (!this.viewedNumbers.includes(this.currentCardNumber)) {
            this.viewedNumbers.push(this.currentCardNumber);
        }

        this._renderCard(this.currentCardNumber);
    },

    _spanifyWalter(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/(WALTER[A-Z]*)/gi, (match) => `<span class="walter">${match}</span>`);
    },

    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array; // Modifies in place and returns
    },

    _attachEventListeners() {
        if (!this.domElements.prevButton || !this.domElements.flipButton || !this.domElements.nextButton) {
            console.error("One or more button elements not found, event listeners not attached.");
            return;
        }
        this.domElements.prevButton.onclick = () => this.showPreviousCard();
        this.domElements.flipButton.onclick = () => this.flipCurrentCard();
        this.domElements.nextButton.onclick = () => this.showNextCard();

        window.onkeydown = (e) => {
            switch (e.key) {
                case "ArrowUp":
                case "ArrowLeft": 
                    e.preventDefault();
                    this.showPreviousCard();
                    break;
                case "ArrowDown":
                case "ArrowRight": 
                    e.preventDefault();
                    this.showNextCard();
                    break;
            }
        };
    }
};

// Initialize the game when the DOM is ready and script is loaded.
// Using DOMContentLoaded to ensure elements are available, though script is at end of body.
document.addEventListener('DOMContentLoaded', () => {
    CardGame.init();
});
