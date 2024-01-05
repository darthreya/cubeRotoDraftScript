// ==UserScript==
// @name         Cube Cobra Roto-draft UI Mask
// @namespace    https://github.com/darthreya/cubeRotoDraftScript
// @version      0.0.4
// @description  Modifies Cube Cobra's UI to allow users to add a google sheet key for their roto draft and view the picks so far and who it was made by (using either an emoji in the username provided on the sheet). The script relies on the usage of the MTG Cube Rotisserie Draft Google Sheet Template by Anthony Mattox (@ahmattox) of Lucky Paper. 
// @author       darthreya and dsoskey
// @match        https://cubecobra.com/cube/list/*
// @match        https://cubeartisan.net/cube/*/list
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cubecobra.com
// @grant        none
// @updateURL    https://raw.githubusercontent.com/darthreya/cubeRotoDraftScript/main/script.user.js
// @downloadURL  https://raw.githubusercontent.com/darthreya/cubeRotoDraftScript/main/script.user.js
// ==/UserScript==

const pickedSymbol = '✓'
const cubeNumberOfCards = 2000 // Picked kinda arbitrarily
const currentCubePathKey = `draftSheetKey+${window.location.pathname}`
const googleSheetsURL = 'https://docs.google.com/spreadsheets/d/'
const host = window.location.host

/*
CubeArtisan Selectors
parent of list view MuiBox-root
MuiTypography-body2
Input parent:
const pees =
 */
const hostToInfo = {
    "cubeartisan.net": {
        inputSelector: ".usercontrols > nav",
        inputSiblingSelector: "collapse navbar-collapse",
        tableSelector: "MuiBox-root",
        getCardElements: () => document.getElementsByClassName("MuiBox-root").item(0).getElementsByTagName("p")
    },
    "cubecobra.com": {
        inputSelector: ".container-fluid",
        inputSiblingSelector: "collapse navbar-collapse",
        tableSelector: "table-view-container",
        getCardElements: () => document.getElementsByClassName('card-list-item_name')
    },
}

// element references
let activeBar
const inputContainer = document.createElement("div")
inputContainer.style = "flex-grow: 1;"

const textInput = document.createElement("input")
textInput.type = "text"
textInput.name = "key"
textInput.placeholder = "Google sheet draft key"
textInput.addEventListener('keypress', function(event) {
    // Check if the key pressed is 'Enter'
    if (event.key === 'Enter') {
        // Prevent the default action to avoid submitting the form if in one
        event.preventDefault();
        // Trigger the same action as the button click
        onButtonClick();
    }
});

const refreshCheckbox = document.createElement("input")
refreshCheckbox.type = "checkbox"
refreshCheckbox.name = "shouldRefresh"

const filterButton = document.createElement("button")
filterButton.type = "button"
filterButton.innerText = "Filter"
filterButton.addEventListener('click', onButtonClick);

const clearFilterButton = document.createElement("button")
clearFilterButton.type = "button"
clearFilterButton.innerText = "Clear"
clearFilterButton.addEventListener('click', clearFiltering);

inputContainer.appendChild(textInput);
inputContainer.appendChild(filterButton);
inputContainer.appendChild(clearFilterButton);

function getTable () {
  return document.getElementsByClassName(hostToInfo[host].tableSelector).item(0)
}

// some of these css vars are cubecobra specific
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
    const cardElements = hostToInfo[host].getCardElements()
    for (let cardHTML of cardElements) {
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
    const table = getTable()
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
    const cardElements = hostToInfo[host].getCardElements()
    const cardNameCount = {}
    for (const cardHTML of cardElements) {
        cardNameCount[cardHTML.innerText] = (cardNameCount[cardHTML.innerText] || 0) + 1
        // Follows the same naming convention as the Rotisserie Draft Template
        const cardName = cardNameCount[cardHTML.innerText] === 1 ? cardHTML.innerText : `${cardHTML.innerText} ${cardNameCount[cardHTML.innerText]}`

        if (!cardsChosenMap.has(cardName)) {
            cardHTML.innerHTML = `<b>${cardName}</b>`
            continue;
        }
        const picker = cardsChosenMap.get(cardName)
        const iconsplit = picker.split(/(\b| )/)
        const maybeIcon = iconsplit[iconsplit.length - 1]
        const icon = /\w/.test(maybeIcon) ? `[${orderMap.get(picker)}]` : maybeIcon
        cardHTML.innerHTML = `${icon} <s>${cardName}</s>`
    }
}

/**
 * Attempts to render an element inside the navBar.
 * @param element to render in navBar
 * @returns {boolean} true if render failed and needs to be retried.
 */
function renderInput(element) {
    const navBar = document.querySelector(hostToInfo[host].inputSelector)
    if (navBar === null) {
        return true
    }

    // If navBar has rendered properly, collapseMenu should be rendered within
    const collapseMenu = document.getElementsByClassName(hostToInfo[host].inputSiblingSelector).item(1)
    navBar.insertBefore(element, collapseMenu);
    if (localStorage.getItem(currentCubePathKey)) {
        console.log("loaded things")
        textInput.value = localStorage.getItem(currentCubePathKey);
    }
    return false
}

const MAX_BACKOFF = 1000 * 16
function attemptRender(element, backoff) {
    if (backoff > MAX_BACKOFF) {
        alert("could not render scriptyMcScriptface script successfully")
        return
    }

    console.debug("attempting render")
    const retry = renderInput(element);
    if (retry) {
        console.debug(`render failed. backing off for ${backoff} ms then retrying...`)
        setTimeout(() => {
            attemptRender(element, backoff * 2)
        }, backoff)
    }
}
attemptRender(inputContainer, 1000)

const TWO_MINUTES = 1000 * 60 * 2
setInterval(() => {

    onButtonClick()
}, TWO_MINUTES)
