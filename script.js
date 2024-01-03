// ==UserScript==
// @name         Cube Cobra Roto-draft UI Mask
// @namespace    https://github.com/darthreya/cubeRotoDraftScript
// @version      0.0.0
// @description  Modifies Cube Cobra's UI to allow users to add a google sheet key for their roto draft and view the picks so far and who it was made by (using either an emoji in the username provided on the sheet). The script relies on the usage of the MTG Cube Rotisserie Draft Google Sheet Template by Anthony Mattox (@ahmattox) of Lucky Paper. 
// @author       darthreya and (@dsoskey insert preferred name here)
// @match        https://cubecobra.com/cube/list/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cubecobra.com
// @grant        none
// ==/UserScript==

/*
TODOS:
1. Unicode handling, the folks I draft with seem to have an emoji or something at the end, I chose to use that as the identifier when viewing the draft but there's some weird cases with unicode names
2. I need to add default emojis based on drafting order
3. Toggle between default emojis and draft order emojis
4. A 10 min autorefresh? Idk people should know better and refresh anyway but might as well try to be helpful
5. maintain an auto-fill, someway for things to refresh auto-magically
6. Make it "nicer", gotta figure out what conventions exist for these sorta scripts
7. Add that one tampermonkey auto-updater link and auto-download link so folks can 1-click install (@updateURL and @downloadURL)
8. Make it such that the text input can accept either the whole sheet URL or just the key and parse that URL
*/
const pickedSymbol = '✓'
const cubeNumberOfCards = 2000 // Picked kinda arbitrarily
const currentCubePathKey = `draftSheetKey+${window.location.pathname}`

var cubeCobraNavBar = document.getElementsByClassName("container-fluid").item(0)
const div = document.createElement("div")
div.style = "flex-grow: 1;"
const textInput = document.createElement("input")
textInput.type = "text"
textInput.name = "key"
textInput.placeholder = "Google sheet draft key"
const filterButton = document.createElement("button")
filterButton.type = "button"
filterButton.innerHTML = "Filter"
div.appendChild(textInput);
div.appendChild(filterButton);
const cubeCobraCollapseMenu = document.getElementsByClassName("collapse navbar-collapse").item(1)
cubeCobraNavBar.insertBefore(div, cubeCobraCollapseMenu);
if (localStorage.getItem(currentCubePathKey)) {
    console.log("loaded things")
    textInput.value = localStorage.getItem(currentCubePathKey);
}

function clearFiltering() {
    var cubeCobraElements = document.getElementsByClassName("card-list-item_name")
    for (var i = 0; i < cubeCobraElements.length; i++) {
        var cardHTML = cubeCobraElements[i];
        if (cardHTML.innerHTML.includes("<b>") || cardHTML.innerHTML.includes("<s>")) {
            cardHTML.innerHTML = cardHTML.innerHTML.match(/>(.*?)</)[1]
        }
    }
}

async function onButtonClick() {
    clearFiltering()
    const sheetKey = textInput.value;
    // store the key for the current filter so it's preserved across refreshes
    localStorage.setItem(currentCubePathKey, sheetKey);
    if (sheetKey === "") {
        return
    }
    const cubeURL = `https://docs.google.com/spreadsheets/d/${sheetKey}/gviz/tq?tqx=out:csv&sheet=Cube&range=A2:F${cubeNumberOfCards}`
    const cards = (
        await fetch(cubeURL).then(response => response.text()).then(data => data.replace(/"/g, '').split('\n'))
                  ).map((line) => line.split(',')).filter((line) => line[0] === pickedSymbol)
    const cardsChosenMap = new Map(cards.map((card) => {
        if (card.length === 6) {
            return [card[1], card[card.length - 1].replace(/[0-z]|"/g, '').trim()];
        }
        return [card[1]+ ',' + card[2], card[card.length - 1].replace(/[0-z]|"/g, '').trim()]
    }));
    var cubeCobraElements = document.getElementsByClassName("card-list-item_name")
    for (var i = 0; i < cubeCobraElements.length; i++) {
        var cardHTML = cubeCobraElements[i];
        if (!cardsChosenMap.has(cardHTML.innerText)) {
            cardHTML.innerHTML = "<b>" + cardHTML.innerText + "</b>"
            continue;
        }
        var icon = cardsChosenMap.get(cardHTML.innerText)
        if (icon.length === 0) {
            icon = '❌'
        }
        cardHTML.innerHTML = icon + "<s>" + cardHTML.innerText + "</s>"
    }
}

filterButton.addEventListener('click', onButtonClick);

textInput.addEventListener('keypress', function(event) {
    // Check if the key pressed is 'Enter'
    if (event.key === 'Enter') {
        // Prevent the default action to avoid submitting the form if in one
        event.preventDefault();
        // Trigger the same action as the button click
        onButtonClick();
    }
});


