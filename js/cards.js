// loading in the cards
// not currently supported in browser:
// import data from 'data/walter_cards.json' assert { type: 'json' };
const data = await fetch('data/walter_cards.json')
    .then((response)=>response.json());

var cards = data["cards"];

var viewed_nrs = [];
var prev_nr = -1;
var current_nr = -1;
var card_nrs = [];

function ShuffleCards() {
    // shuffle the card_nrs and reset the viewed_nrs, save this state
    card_nrs = [];
    for (var k in cards) card_nrs.push(k);
    shuffle(card_nrs);
    viewed_nrs = [];
    prev_nr = -1;
    current_nr = -1;
    setHistoryCookie();
}

// initial shuffle of the cards or loading of the order in the cookie
function LoadOrShuffle() {
    var hist = getCookie("history");
    if (hist == null) {
        // no cookie exists, so 
        ShuffleCards()
    }
    else {
        hist = JSON.parse(hist);
        viewed_nrs = hist["viewed_nrs"];
        current_nr = hist["current_nr"];
        card_nrs = hist["card_nrs"];
    }
    if (current_nr == -1) nextCard();
    else render_card(current_nr);
}

LoadOrShuffle(); // call this on page load 

// wrapper to save all necessary data to cookie
function setHistoryCookie() {
    var history = {
        "viewed_nrs": viewed_nrs,
        "current_nr": current_nr,
        "card_nrs": card_nrs
    }
    setCookie("history", JSON.stringify(history), 9999);
}


function prevCard(card) {
    prev_nr = current_nr;

    if (viewed_nrs.length <= 0) {
        alert("Es gibt noch keine abgelegten Fichen.");
        return;
    }
    if (current_nr != -1) card_nrs.push(current_nr);
    current_nr = viewed_nrs.pop();
    // skip duplicates
    if (prev_nr == current_nr) current_nr = card_nrs.pop();

    render_card(current_nr);

}

function nextCard() {
    prev_nr = current_nr;

    if (card_nrs.length <= 0) {
        alert("Der Fichen-Stapel ist leer. Er wurde erneut gemischt. Ihr könnt weiterspielen. Wählt die Aussagen die ihr noch nicht behandelt habt.");
        ShuffleCards();
        return;
    }
    if (current_nr != -1) viewed_nrs.push(current_nr);
    current_nr = card_nrs.pop();
    // skip duplicates
    if (prev_nr == current_nr) current_nr = card_nrs.pop();

    render_card(current_nr);

}



function render_card(card_nr) {
    var cc = document.getElementById("current_card");
    var flip_btn = document.getElementById("btn-flip");


    if ("gender" in cards[card_nr]) {
        cc.innerHTML = `<p class="bold text-center" style="margin-bottom: 16px;">
      ${cards[card_nr]["gender"]}\n
    </p>
    `;
        flip_btn.disabled = false;
        flip_btn.style.display = "";
    }
    else {
        cc.innerHTML = `<p class="bold" align="center" style="padding-top: 16px; style="margin-bottom: 16px; visibility: hidden;"> \n</p>`;
        flip_btn.disabled = true;
        flip_btn.style.display = "none";
    }

    cc.innerHTML += `
  <div class="card_nr text-right float-right">${card_nr}</div>
  <ol>
    <li> ${spanify_walter(cards[card_nr][1])} </li>
    <li> ${spanify_walter(cards[card_nr][2])} </li>
    <li> ${spanify_walter(cards[card_nr][3])} </li>
  </ol>
  `;
    setHistoryCookie();
}


// render the flipside of a gendered card
function flipCard() {
    // not a gendered card, abort
    if (current_nr == -1 || !("gender" in cards[current_nr])) return;

    prev_nr = current_nr;
    // update current_nr to match flipside
    current_nr = cards[current_nr]["flip"];
    // only do the stuff below once
    if (prev_nr != current_nr) {
        // if flipside in the stapel, remove it from there
        if (current_nr in card_nrs) {
            card_nrs = card_nrs.filter(function (value, index, arr) { return value != current_nr; });
        }
        // if flipside not in viewed, add it to there
        if (!(current_nr in viewed_nrs)) {
            viewed_nrs.push(current_nr);
        }
    }

    render_card(current_nr);

}


function spanify_walter(string) {
    var result = string.replace(/(WALTER[A-Z]*)/gi, function (match) { return `<span class="walter">${match}</span>` });
    return result;
}


/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Event listeners: 
 */

// Change cards on arrow keys
window.onkeydown = function (e) {
    switch (e.key) {
        case "ArrowUp":
        case "ArrowLeft": 
            e.preventDefault();
            prevCard();
            break;
        case "ArrowDown":
        case "ArrowRight": 
            e.preventDefault();
            nextCard()
            break;
    }
};

document.getElementById('btn-prev').onclick = function () { prevCard(); }
document.getElementById('btn-flip').onclick = function () { flipCard(); }
document.getElementById('btn-next').onclick = function () { nextCard(); }