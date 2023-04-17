// ==UserScript==
// @name         Margonem AutoHeal
// @version      1.2
// @description  Skrypt na nowy interfejs do automatycznego uleczania po walce https://forum.margonem.pl/?task=forum&show=posts&id=514978
// @author       Wexurro
// @match        https://*.margonem.pl/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=margonem.pl
// @grant        none
// ==/UserScript==
// Firefox testowany i działa
// Chrome testowany i działa

// Ustawienia
// Te ustawienia można edytować według własnych potrzeb
let settingsNotUsePointHP = false; // Ustaw na 'true' żeby nie używać zwykłych potek
let settingsNotUseFullHP = false; // Ustaw na 'true' żeby nie używać potek z pełnym leczeniem
let settingsNotUsePercentHP = false; // Ustaw na 'true' żeby nie używać potek z procentowym leczeniem
let settingsShowHP = true; // Ustaw na 'false' żeby nie wyświetlał na dole ekranu ilości puntków życia oraz pozostałego leczenia
let minimumHeal = 499; // Ustaw minimalną wartość od której skrypt będzie leczył (Przykład: 100 - pomija potki z leczeniem mniejszym niż 100 na przykład rośliny potrzebne do questów)
let excludedItems = ["Sok z Gumijagód", "Wytrawny chrabąszcz"]; // Tu możesz wpisać nazwy przdmiotów których nie chcesz używać
//----------------------- KONIEC USTAWIEŃ -----------------------------------------

// Zmienne wewnętrzne
let labelHP = null;
let labelHPDmg = null;
let labelHPHealLeft = null;
let healLeft = 0;
let showDmg = true;
let lastRemainingHP = 0;

const waitForSeconds = (time) => new Promise(resolve => setTimeout(resolve, time * 1000));

async function init() {
    while (typeof Engine.hero === 'undefined')
        await waitForSeconds(0.1);

    while (typeof Engine.hero.d.warrior_stats === 'undefined')
        await waitForSeconds(0.1);

    window.API.addCallbackToEvent("close_battle", autoHeal);

    const btn = createButton("autoheal-btn", '♥', "100%", "transparent", "0px", "26px", "absolute", "white", "bold", "1.3em");
    btn.addEventListener("click", autoHeal);
    document.querySelector(".glass").append(btn);

    if (settingsShowHP) {
        labelHP = createLabel("autoheal-label", Engine.hero.d.warrior_stats.hp + " HP", "100%", "-14px", "absolute", "white", "center", "none", "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black");
        labelHPDmg = createLabel("autoheal-dmg-label", Engine.hero.d.warrior_stats.hp + " HP", "100%", "-42px", "absolute", "bold", "center", "none", "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black", "0", "opacity 0.5s ease-in-out");
        labelHPHealLeft = createLabel("autoheal-healleft-label", "[Not Calculated]", "100%", "-28px", "absolute", "white", "center", "none", "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black");
        labelHPHealLeft.style.fontSize = "10px";
        document.querySelector(".glass").parentElement.parentElement.append(labelHP, labelHPHealLeft, labelHPDmg);
    }

    if (settingsShowHP) {
        updateHPLabel();
        updateHealLeftLabel();
        calculateHpLeftToHeal()
    }

    console.log("Autoheal uruchomiony");
}

async function getItems() {
    var heroLevel = Engine.hero.d.lvl;

    // Pobieramy EQ
    var items = Engine.items.fetchLocationItems("g");

    while (items.length == 0) {
        items = Engine.items.fetchLocationItems("g");
        await waitForSeconds(0.1);
    }
    // Szukamy potek po typie i sortujemy po ilości leczenia
    var healPoints = []
    var healFull = []
    var healPercent = []

    // Sortowanie od największego leczenia dla zwykłych potek
    if (!settingsNotUsePointHP) {
        healPoints = items
            .filter(item => item._cachedStats.hasOwnProperty("leczy"))
            .filter(item => item._cachedStats.leczy > minimumHeal)
            .filter(item => !item._cachedStats.hasOwnProperty("lvl") || (item._cachedStats.hasOwnProperty("lvl") && item._cachedStats.lvl <= heroLevel))
            .filter(item => !item._cachedStats.hasOwnProperty("timelimit") || (item._cachedStats.hasOwnProperty("timelimit") && !item._cachedStats.timelimit.includes(",")))
            .filter(item => !excludedItems.includes(item.name))
            .sort(function(a, b) {
                return b._cachedStats.leczy - a._cachedStats.leczy;
            });
    }

    // Sortowanie od najmniejszego leczenia dla potek z pełnym leczeniem żeby zużywać je po kolei od tej której zostało najmniej
    if (!settingsNotUseFullHP) {
        healFull = items
            .filter(item => item._cachedStats.hasOwnProperty("fullheal"))
            .filter(item => !item._cachedStats.hasOwnProperty("lvl") || (item._cachedStats.hasOwnProperty("lvl") && item._cachedStats.lvl <= heroLevel))
            .filter(item => !item._cachedStats.hasOwnProperty("timelimit") || (item._cachedStats.hasOwnProperty("timelimit") && !item._cachedStats.timelimit.includes(",")))
            .filter(item => !excludedItems.includes(item.name))
            .sort(function(a, b) {
                return a._cachedStats.fullheal - b._cachedStats.fullheal;
            });
    }

    // Sortowanie od największego leczenia dla potek procentowych
    if (!settingsNotUsePercentHP) {
        healPercent = items
            .filter(item => item._cachedStats.hasOwnProperty("perheal"))
            .filter(item => item._cachedStats.perheal > 0)
            .filter(item => !item._cachedStats.hasOwnProperty("lvl") || (item._cachedStats.hasOwnProperty("lvl") && item._cachedStats.lvl <= heroLevel))
            .filter(item => !item._cachedStats.hasOwnProperty("timelimit") || (item._cachedStats.hasOwnProperty("timelimit") && !item._cachedStats.timelimit.includes(",")))
            .filter(item => !excludedItems.includes(item.name))
            .sort(function(a, b) {
                return b._cachedStats.perheal - a._cachedStats.perheal;
            });
    }

    return [healPoints, healFull, healPercent];
}

async function calculateHpLeftToHeal() {
    const arrays = await getItems();

    var healPoints = arrays[0];
    var healFull = arrays[1];
    var healPercent = arrays[2];

    var i = 0;
    healLeft = 0;

    // Sumujemy leczenia dla informacji na ekranie
    for (i = 0; i < healPercent.length; i++) {
        healLeft += Number((healPercent[i]._cachedStats.perheal / 100) * maxHP) * healPercent[i]._cachedStats.amount;
    }

    for (i = 0; i < healPoints.length; i++) {
        healLeft += Number(healPoints[i]._cachedStats.leczy) * healPoints[i]._cachedStats.amount;
    }

    for (i = 0; i < healFull.length; i++) {
        healLeft += Number(healFull[i]._cachedStats.fullheal);
    }

    updateHealLeftLabel();
}

function createButton(id, text, width, backgroundColor, border, bottom, position, color, fontWeight, fontSize) {
    const btn = document.createElement("button");
    btn.id = id;
    btn.innerText = text;
    btn.style.width = width;
    btn.style.backgroundColor = backgroundColor;
    btn.style.border = border;
    btn.style.bottom = bottom;
    btn.style.position = position;
    btn.style.color = color;
    btn.style.fontWeight = fontWeight;
    btn.style.fontSize = fontSize;
    return btn;
}

function createLabel(id, text, width, top, position, color, textAlign, pointerEvents, textShadow, opacity = '', transition = '') {
    const label = document.createElement("div");
    label.innerText = text;
    label.id = id;
    label.style.width = width;
    label.style.top = top;
    label.style.position = position;
    label.style.color = color;
    label.style.textAlign = textAlign;
    label.style.pointerEvents = pointerEvents;
    label.style.textShadow = textShadow;
    label.style.opacity = opacity;
    label.style.transition = transition;
    return label;
}

function updateHPLabel() {
    var targetNum = Engine.hero.d.warrior_stats.hp;
    var currentNum = parseInt(labelHP.innerText.replace(/[^\d]+/g, ''));
    var range = targetNum - currentNum;
    var step = range / 50;

    var timer = setInterval(() => {
        currentNum += step;
        labelHP.innerText = `${parseInt(currentNum).toLocaleString()} HP`;
        if (currentNum >= targetNum) {
            clearInterval(timer);
            labelHP.innerText = `${parseInt(targetNum).toLocaleString()} HP`;
            updateHPLabel();
        }
    }, 10);
}

function updateHealLeftLabel() {
    var targetNum = parseInt(healLeft);
    var currentNum = parseInt(labelHPHealLeft.innerText.replace(/[^\d]+/g, '')) || 0;
    var range = targetNum - currentNum;
    var step = range / 50;

    var timer = setInterval(() => {
        currentNum += step;
        labelHPHealLeft.innerText = `[${parseInt(currentNum).toLocaleString()}]`;
        if (currentNum <= targetNum) {
            clearInterval(timer);
            if (targetNum == 0)
                labelHPHealLeft.style.color = 'red';
            else if (targetNum < Engine.hero.d.warrior_stats.maxhp * 2)
                labelHPHealLeft.style.color = 'orange';
            else
                labelHPHealLeft.style.color = 'white';

            labelHPHealLeft.innerText = `[${parseInt(targetNum).toLocaleString()}]`;
        }
    }, 10);

}

async function showDamageGot(remainingHP) {
    if (remainingHP == 0) {
        showDmg = true;
        return;
    }

    var maxHP = Engine.hero.d.warrior_stats.maxhp;

    var percentLost = ((remainingHP / maxHP) * 100).toFixed(1);

    const hue = (1 - percentLost / 100) * 60;
    const color = `hsl(${hue}, 100%, 50%)`;

    labelHPDmg.innerText = `-${percentLost}%`;
    labelHPDmg.style.color = color;
    labelHPDmg.style.opacity = '1';

    await waitForSeconds(2);

    labelHPDmg.style.opacity = '0';
    showDmg = true;
}

async function useItem(id) {
    window._g(`moveitem&st=1&id=${id}`, () => {
        setTimeout(autoHeal, 100);
    });
}

async function autoHeal() {
    console.log("Zaczynam leczenie...");

    // Pobierz dane o punktach życia postaci
    var currentHP = Engine.hero.d.warrior_stats.hp;
    var maxHP = Engine.hero.d.warrior_stats.maxhp;

    calculateHpLeftToHeal();

    // Jeżeli aktualne życie jest takie samo jak maksymalne nie ma potrzeby leczenia lub gdy nie żyjemy
    if (currentHP == maxHP || Engine.dead) {
        console.log("Życie pełne");
        return;
    }

    // Liczymy ile HP jest do wyleczenia
    var remainingHP = maxHP - currentHP;
    console.log("Pozostało do uleczenia: " + remainingHP);

    var propRemaining = remainingHP - lastRemainingHP;
    lastRemainingHP = remainingHP;

    if (settingsShowHP && showDmg) {
        showDmg = false;
        showDamageGot(propRemaining);
    }

    const arrays = await getItems();

    var healPoints = arrays[0];
    var healFull = arrays[1];
    var healPercent = arrays[2];

    var i = 0;
    var amount = 0;

    // Leczymy zaczynając od największej
    // Sprawdzamy procentowe
    for (i = 0; i < healPercent.length; i++) {
        amount = (healPercent[i]._cachedStats.perheal / 100) * maxHP;

        if (amount <= remainingHP) {
            console.log("Procentowa mikstura " + healPercent[i].name + " leczy " + amount + " - Używam jej");
            useItem(healPercent[i].id);
            return;
        }
    }

    // Sprawdzamy zwykłe
    for (i = 0; i < healPoints.length; i++) {
        amount = healPoints[i]._cachedStats.leczy;

        if (amount <= remainingHP) {
            console.log("Zwykła mikstura " + healPoints[i].name + " leczy " + amount + " - Używam jej");
            useItem(healPoints[i].id);
            return;
        }
    }

    // Jeżeli nadal pozostaje coś do wyleczenia, używamy pełnego leczenia
    if (healFull.length > 0) {
        amount = healFull[0]._cachedStats.fullheal;
        console.log("Pełna mikstura " + healFull[0].name + " leczy " + amount + " - Używam jej");
        useItem(healFull[0].id);
        return;
    }
}

init()
