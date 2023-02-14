// ==UserScript==
// @name         Znajdź przejście
// @version      1.0
// @description  Znajdowanie ścieżki do przejścia na mapie
// @author       Wexurro
// @match        https://*.margonem.pl/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=margonem.pl
// @grant        none
// ==/UserScript==

var townnames = {};
var container = null;

async function waitForSeconds(time) {
    time *= 1000
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}

async function init() {
    //Poczekaj sekunde na załadowanie gry
    await waitForSeconds(1);

    console.log("Dodatek Znajdź przejście")

    //Kontyner na lokacje pod górnym HUDem (Może jest lepsza lokalizacja?)
    var wrapperContainer = document.createElement('div');
    wrapperContainer.id = 'locator-wrapper';
    wrapperContainer.style.width = '100%';
    wrapperContainer.style.height = 'auto';
    wrapperContainer.style.margin = 'auto';
    wrapperContainer.style.pointerEvents = "none";
    wrapperContainer.style.position = 'absolute';
    wrapperContainer.style.top = '65px';
    wrapperContainer.style.display = 'flex';
    wrapperContainer.style.justifyContent = 'center';
    document.getElementsByClassName('interface-layer')[0].appendChild(wrapperContainer);

    container = document.createElement('div');
    container.id = 'locator-container';
    container.style.width = '40%';
    container.style.height = '100%';
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
    container.style.flexWrap = 'wrap';
    wrapperContainer.appendChild(container);

    //Szukaj przejść
    lookForExits()
}

async function lookForExits() {
    while (true) {
        //Sprawdzamy jakie są dostępne przejścia jeżeli są inne niż aktualne, oznacza to że zmieniliśmy mapke
        if (townnames != Engine.map.getGateways().townnames) {
            townnames = Engine.map.getGateways().townnames;
            //console.log(townnames);

            //Usuwamy stare przyciski
            const oldBtns = document.getElementsByClassName('town-button');
            while (oldBtns.length > 0) {
                oldBtns[0].parentNode.removeChild(oldBtns[0]);
            }


            //Dodajemy przyciski
            for (const [key, value] of Object.entries(townnames)) {
                //console.log(`${key}: ${value}`);

                var townBtn = document.createElement('button');
                townBtn.innerText = value;
                townBtn.className = 'town-button';
                townBtn.style.height = '24px';
                townBtn.style.margin = '0px 2px 2px 2px';
                townBtn.style.pointerEvents = 'all';
                townBtn.style.cursor = 'pointer';
                townBtn.style.background = '#949fa6aa';
                townBtn.style.border = '1px solid #242628aa';
                townBtn.style.borderRadius = '4px';
                townBtn.style.fontSize = 'smaller';
                townBtn.addEventListener('click', () => {
                    //Gdy klikniemy dane miasto szukamy do niego drogi i prowadzimy tam bohatera
                    var exitLocation = Engine.map.getGateways().getGtwById(key)[0];
                    var locx = exitLocation.rx;
                    var locy = exitLocation.ry;

                    Engine.hero.autoGoTo({ x: locx, y: locy });
                })
                container.appendChild(townBtn);
            }
        }

        await waitForSeconds(1);
    }
}

init()