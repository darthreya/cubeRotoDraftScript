// ==UserScript==
// @name         Cube Cobra Roto-draft UI Mask
// @namespace    https://github.com/darthreya/cubeRotoDraftScript
// @version      0.0.2
// @description  Modifies Cube Cobra's UI to allow users to add a google sheet key for their roto draft and view the picks so far and who it was made by (using either an emoji in the username provided on the sheet). The script relies on the usage of the MTG Cube Rotisserie Draft Google Sheet Template by Anthony Mattox (@ahmattox) of Lucky Paper. 
// @author       darthreya and dsoskey
// @match        https://cubecobra.com/cube/list/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cubecobra.com
// @grant        none
// @updateURL    https://raw.githubusercontent.com/darthreya/cubeRotoDraftScript/main/script.user.js
// @downloadURL  https://raw.githubusercontent.com/darthreya/cubeRotoDraftScript/main/script.user.js
// ==/UserScript==

const pickedSymbol = '✓'
const cubeNumberOfCards = 2000 // Picked kinda arbitrarily
const currentCubePathKey = `draftSheetKey+${window.location.pathname}`
const googleSheetsURL = 'https://docs.google.com/spreadsheets/d/'

const cubeCobraNavBar = document.getElementsByClassName('container-fluid').item(0)
const div = document.createElement("div")
div.style = "flex-grow: 1;"
const textInput = document.createElement("input")
textInput.type = "text"
textInput.name = "key"
textInput.placeholder = "Google sheet draft key"
const refreshCheckbox = document.createElement("input")
refreshCheckbox.type = "checkbox"
refreshCheckbox.name = "shouldRefresh"


const filterButton = document.createElement("button")
filterButton.type = "button"
filterButton.innerText = "Filter"
const clearFilterButton = document.createElement("button")
clearFilterButton.type = "button"
clearFilterButton.innerText = "Clear"
div.appendChild(textInput);
div.appendChild(filterButton);
div.appendChild(clearFilterButton);
const cubeCobraCollapseMenu = document.getElementsByClassName("collapse navbar-collapse").item(1)
cubeCobraNavBar.insertBefore(div, cubeCobraCollapseMenu);
if (localStorage.getItem(currentCubePathKey)) {
    console.log("Loaded previously used draft")
    textInput.value = localStorage.getItem(currentCubePathKey);
}

const table = document.getElementsByClassName("table-view-container").item(0)
let activeBar

function playerBox(player, place) {
    const node = document.createElement("div")
    const active = player.includes("◈")
    const activeColor = "crimson"
    node.style = `
    border: ${active ? "2px":"1px"} ${active ? "dashed" : "solid"} ${active ? activeColor : "var(--border-dark)"};
    align-text: center;
    color: ${active ? activeColor : "var(--text)"};
  `
    node.innerText = `[${place}] ${player.replace(/◈/g, "").trim()}`
    return node
}

function playerBar(players) {
    const node = document.createElement("div")
    node.style = `
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    border: 1px solid var(--border-dark);
    border-radius: 5px;
  `
    for (let i = 0; i < players.length; i++) {
        node.appendChild(playerBox(players[i], i+1))
    }
    return node
}

function clearFiltering() {
    const cubeCobraElements = document.getElementsByClassName('card-list-item_name')
    for (let cardHTML of cubeCobraElements) {
        if (cardHTML.innerHTML.includes("<b>") || cardHTML.innerHTML.includes("<s>")) {
            cardHTML.innerHTML = cardHTML.innerHTML.match(/>(.*?)</)[1]
        }
    }
    activeBar?.remove()
}

function getSheetKeyFromInput(inputKey) {
    if (inputKey.includes(googleSheetsURL)) {
        return inputKey.replace(googleSheetsURL, '').split('/')[0];
    }
    return inputKey
}

async function onButtonClick() {
    clearFiltering()
    const sheetKey = getSheetKeyFromInput(textInput.value)
    // store the key for the current filter so it's preserved across refreshes
    localStorage.setItem(currentCubePathKey, sheetKey);
    if (sheetKey === "") {
        return
    }
    const baseURL = `${googleSheetsURL}${sheetKey}/gviz/tq?tqx=out:csv`
    const cubeURL = `${baseURL}&sheet=Cube&range=A2:F${cubeNumberOfCards}`
    const playerURL = `${baseURL}&sheet=Draft&range=3:3`
    const ordering = await fetch(playerURL)
        .then(response => response.text())
        .then(data => data.split(",").map(it => it.trim().slice(1, -1)).filter(it => it.length))
    const orderMap = new Map(ordering.map((it, i) => [it.replace(/◈/g, "").trim(), i+1]))
    activeBar = playerBar(ordering)
    table.parentElement.insertBefore(activeBar, table)


    const cards = (await fetch(cubeURL)
        .then(response => response.text())
        .then(data => data.split('\n')))
        .map((line) => line.slice(1, -1).split('","'))
        .filter((line) => line[0] === pickedSymbol)
    const cardsChosenMap = new Map(cards.map((card) => {
        const name = card[card.length - 1]
        return card.length === 6 ? [card[1], name] : [`${card[1]},${card[2]}`, name]
    }));
    const cubeCobraElements = document.getElementsByClassName('card-list-item_name')
    for (const cardHTML of cubeCobraElements) {
        if (!cardsChosenMap.has(cardHTML.innerText)) {
            cardHTML.innerHTML = `<b>${cardHTML.innerText}</b>`
            continue;
        }
        const picker = cardsChosenMap.get(cardHTML.innerText)
        const iconsplit = picker.split(/(\b| )/)
        const maybeIcon = iconsplit[iconsplit.length - 1]
        const icon = /\w/.test(maybeIcon) ? `[${orderMap.get(picker)}]` : maybeIcon
        cardHTML.innerHTML = `${icon} <s>${cardHTML.innerText}</s>`
    }
}



filterButton.addEventListener('click', onButtonClick);
clearFilterButton.addEventListener('click', clearFiltering);

textInput.addEventListener('keypress', function(event) {
    // Check if the key pressed is 'Enter'
    if (event.key === 'Enter') {
        // Prevent the default action to avoid submitting the form if in one
        event.preventDefault();
        // Trigger the same action as the button click
        onButtonClick();
    }
});

const TWO_MINUTES = 1000 * 60 * 2
setInterval(() => {

    onButtonClick()
}, TWO_MINUTES)
