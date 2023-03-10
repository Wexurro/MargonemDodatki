// ==UserScript==
// @name         Margonem AutoHeal
// @version      1.0
// @description  Skrypt na nowy interfejs do automatycznego uleczania po walce
// @author       Wexurro
// @match        https://*.margonem.pl/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=margonem.pl
// @grant        none
// ==/UserScript==
// Firefox testowany i działa
// Chrome testowany i działa

async function waitForSeconds(time) {
    time *= 1000
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}

//Ustawienia
//Te ustawienia można edytować według własnych potrzeb
var settingsNotUsePointHP = false; // Ustaw na 'true' żeby nie używać zwykłych potek
var settingsNotUseFullHP = false; // Ustaw na 'true' żeby nie używać potek z pełnym leczeniem
var settingsNotUsePercentHP = false; //Ustaw na 'true' żeby nie używać potem z procentowym leczeniem
var settingsShowHP = true; //Ustaw na 'false' żeby nie wyświetlał na dole ekranu ilości puntków życia
var minimumHeal = 1000; //Ustaw minimalną wartość od której skrypt będzie leczył (Przykład: 100 - pomija potki z leczeniem mniejszym niż 100 na przykład rośliny potrzebne do questów)
//----------------------------------------------------------------

//Zmienne wewnętrzne
var lastHP = 0;
var labelHP = null;
var labelHPDmg = null;

async function init() {
    //Poczekaj 2 sekundy na załadowanie gry
    await waitForSeconds(2);

    //Uruchamiaj leczenie po zakończeniu walki
    window.API.addCallbackToEvent("close_battle", autoHeal);

    if (settingsShowHP)
        window.API.addCallbackToEvent("close_battle", showDamageGot);

    //Dodaj przycisk do leczenia na żądanie
    var btn = document.createElement("button");
    btn.id = "autoheal-btn";
    btn.innerText = '♥';
    btn.style.width = "100%";
    btn.style.backgroundColor = "transparent";
    btn.style.border = "0px";
    btn.style.bottom = "26px";
    btn.style.position = "absolute";
    btn.style.color = "white";
    btn.style.fontWeight = "bold";
    btn.style.fontSize = "1.3em";
    btn.addEventListener("click", autoHeal);
    document.getElementsByClassName("glass")[0].append(btn);

    if (settingsShowHP) {
        labelHP = document.createElement("div");
        labelHP.innerText = Engine.hero.d.warrior_stats.hp + " HP";
        labelHP.id = "autoheal-label"
        labelHP.style.width = "100%";
        labelHP.style.top = "-14px";
        labelHP.style.position = "absolute";
        labelHP.style.color = "white";
        labelHP.style.textAlign = "center";
        labelHP.style.pointerEvents = "none";
        labelHP.style.textShadow = "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black";

        labelHPDmg = document.createElement("div");
        labelHPDmg.innerText = Engine.hero.d.warrior_stats.hp + " HP";
        labelHPDmg.id = "autoheal-dmg-label"
        labelHPDmg.style.width = "100%";
        labelHPDmg.style.top = "-27px";
        labelHPDmg.style.position = "absolute";
        labelHPDmg.style.fontWeight = "bold";
        labelHPDmg.style.textAlign = "center";
        labelHPDmg.style.pointerEvents = "none";
        labelHPDmg.style.textShadow = "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black";
        labelHPDmg.style.opacity = '0';
        labelHPDmg.style.transition = 'opacity 0.5s ease-in-out';

        document.getElementsByClassName("glass")[0].parentElement.parentElement.append(labelHP);
        document.getElementsByClassName("glass")[0].parentElement.parentElement.append(labelHPDmg);

        updateHPLabel();
    }

    console.log("Autoheal uruchomiony");
}

function updateHPLabel() {
    const targetNum = Engine.hero.d.warrior_stats.hp;
    var num = labelHP.innerText.replaceAll(' HP', '');
    num = num.replace(/\s/g, '');
    const startNum = Number(num);
    const duration = 500; // czas trwania w milisekundach
    const range = targetNum - startNum;
    const step = range / duration * 10; // 10ms delay

    let currentNum = startNum;
    const timer = setInterval(() => {
        currentNum += step;
        labelHP.innerText = parseInt(currentNum).toLocaleString() + ' HP';
        if (currentNum >= targetNum) {
            clearInterval(timer);
            labelHP.innerText = parseInt(targetNum).toLocaleString() + ' HP';
        }
    }, 10);
}

async function showDamageGot() {
    var currentHP = Engine.hero.d.warrior_stats.hp;
    var maxHP = Engine.hero.d.warrior_stats.maxhp;
    var remainingHP = maxHP - currentHP;

    if (remainingHP != 0) {
        //Liczymy ile procent obrażeń odnieśliśmy
        var dmgPercent = (remainingHP / maxHP * 100).toFixed(1);

        labelHPDmg.innerText = '-' + dmgPercent + '%';

        var hue = (1 - dmgPercent / 100) * 60; // Przeliczenie procentowej wartości na kąt barwy w modelu HSL
        var color = 'hsl(' + hue + ', 100%, 50%)'; // Tworzenie ciągu znaków reprezentującego kolor w modelu HSL

        labelHPDmg.style.color = color;

        labelHPDmg.style.opacity = '1';
        await waitForSeconds(2);
        labelHPDmg.style.opacity = '0';
    }
}

async function useItem(id) {
    window._g(`moveitem&st=1&id=${id}`, () => {
        setTimeout(autoHeal, 100);
    });
}

async function autoHeal() {
    console.log("Zaczynam leczenie...");
    //Pobierz dane o punktach życia postaci
    var currentHP = Engine.hero.d.warrior_stats.hp;
    var maxHP = Engine.hero.d.warrior_stats.maxhp;

    //Jeżeli aktualne życie jest takie samo jak maksymalne nie ma potrzeby leczenia lub gdy nie żyjemy
    if (currentHP == maxHP || Engine.dead) {
        console.log("Życie pełne");
        updateHPLabel();
        return;
    }

    if (lastHP == currentHP) {
        console.log("Życie nie zaktualizowało się w obiekcie Engine...");
        return;
    }

    lastHP = currentHP;

    //Pobieramy pozim postaci i liczymy ile HP jest do wyleczenia
    var heroLevel = Engine.hero.d.lvl;
    var remainingHP = maxHP - currentHP;
    console.log("Pozostało do uleczenia: " + remainingHP);

    if (settingsShowHP) {
        updateHPLabel();
    }

    //Pobieramy EQ
    var items = Engine.items.fetchLocationItems("g");

    //Szukamy potek po typie i sortujemy po ilości leczenia
    var healPoints = []
    var healFull = []
    var healPercent = []

    //Sortowanie od największego leczenia dla zwykłych potek
    if (!settingsNotUsePointHP) {
        healPoints = items
            .filter(item => item._cachedStats.hasOwnProperty("leczy"))
            .filter(item => item._cachedStats.leczy > minimumHeal)
            .filter(item => !item._cachedStats.hasOwnProperty("lvl") || (item._cachedStats.hasOwnProperty("lvl") && item._cachedStats.lvl <= heroLevel))
            .filter(item => !item._cachedStats.hasOwnProperty("timelimit") || (item._cachedStats.hasOwnProperty("timelimit") && !item._cachedStats.timelimit.includes(",")))
            .sort(function(a, b) {
                return b._cachedStats.leczy - a._cachedStats.leczy;
            });
    }

    //Sortowanie od najmniejszego leczenia dla potek z pełnym leczeniem żeby zużywać je po kolei od tej której zostało najmniej
    if (!settingsNotUseFullHP) {
        healFull = items
            .filter(item => item._cachedStats.hasOwnProperty("fullheal"))
            .filter(item => !item._cachedStats.hasOwnProperty("lvl") || (item._cachedStats.hasOwnProperty("lvl") && item._cachedStats.lvl <= heroLevel))
            .filter(item => !item._cachedStats.hasOwnProperty("timelimit") || (item._cachedStats.hasOwnProperty("timelimit") && !item._cachedStats.timelimit.includes(",")))
            .sort(function(a, b) {
                return a._cachedStats.fullheal - b._cachedStats.fullheal;
            });
    }

    //Sortowanie od największego leczenia dla potek procentowych
    if (!settingsNotUsePercentHP) {
        healPercent = items
            .filter(item => item._cachedStats.hasOwnProperty("perheal"))
            .filter(item => item._cachedStats.perheal > 0)
            .filter(item => !item._cachedStats.hasOwnProperty("lvl") || (item._cachedStats.hasOwnProperty("lvl") && item._cachedStats.lvl <= heroLevel))
            .filter(item => !item._cachedStats.hasOwnProperty("timelimit") || (item._cachedStats.hasOwnProperty("timelimit") && !item._cachedStats.timelimit.includes(",")))
            .sort(function(a, b) {
                return b._cachedStats.perheal - a._cachedStats.perheal;
            });
    }

    var i = 0;
    var amount = 0;

    //Leczymy zaczynająć od największej
    //Sprawdzamy procentowe
    for (i = 0; i < healPercent.length; i++) {
        amount = (healPercent[i]._cachedStats.perheal / 100) * maxHP;

        if (amount <= remainingHP) {
            console.log("Procentowa mikstura leczy " + amount + " - Używam jej");
            useItem(healPercent[i].id);
            if (settingsShowHP) updateHPLabel();
            return;
        }
    }

    //Sprawdzamy zwykłe
    for (i = 0; i < healPoints.length; i++) {
        amount = healPoints[i]._cachedStats.leczy;

        if (amount <= remainingHP) {
            console.log("Zwykła mikstura leczy " + amount + " - Używam jej");
            useItem(healPoints[i].id);
            if (settingsShowHP) updateHPLabel();
            return;
        }
    }

    //Jeżeli nadal pozostaje coś do wyleczenia, używamy pełnego leczenia
    if (healFull.length > 0) {
        amount = healFull[0]._cachedStats.fullheal;
        console.log("Pełna mikstura leczy " + amount + " - Używam jej");
        useItem(healFull[0].id);
        if (settingsShowHP) updateHPLabel();
        return;
    }
}

init()