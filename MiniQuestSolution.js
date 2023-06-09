// ==UserScript==
// @name         MiniQuesty
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  try to take over the world!
// @author       You
// @match        https://*.margonem.pl/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=margonem.pl
// @grant        none
// ==/UserScript==

const waitForSeconds = (time) => new Promise(resolve => setTimeout(resolve, time * 1000));

let quests;

function init() {
    console.log("MiniQuesty");
    fetch('https://raw.githubusercontent.com/Wexurro/MargonemDodatki/main/quests.json')
        .then(response => response.text())
        .then(content => {
            const jsonObject = JSON.parse(content);
            quests = jsonObject.quests;
            console.log(quests);
            questListListener();
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

async function questListListener() {
    console.log("Listening for quests");

    while (typeof document.getElementsByClassName("quest-log")[0] == 'undefined')
        await waitForSeconds(0.1);

    let savedQuestsList = document.getElementsByTagName('quest-title');

    let questWindowWrapper = document.createElement("div");
    questWindowWrapper.id = 'quest-window-wrapper';
    questWindowWrapper.name = '';
    questWindowWrapper.style.width = "400px";
    questWindowWrapper.style.height = "auto";
    questWindowWrapper.style.maxHeight = '544px';
    questWindowWrapper.style.position = "absolute";
    questWindowWrapper.style.top = "0px";
    questWindowWrapper.style.left = "360px";
    questWindowWrapper.style.borderStyle = "solid";
    questWindowWrapper.style.borderWidth = "34px 20px";
    questWindowWrapper.style.borderImage = "url(../img/gui/window-frame.png?v=1686032121832) 34 20 fill repeat";
    questWindowWrapper.style.backgroundSize = "100% 100%";
    questWindowWrapper.style.overflowY = "scroll";
    questWindowWrapper.style.overflowX = "hidden";
    questWindowWrapper.style.opacity = "0";
    questWindowWrapper.style.transition = 'opacity 0.3s';
    document.getElementsByClassName("quest-log")[0].parentElement.parentElement.parentElement.appendChild(questWindowWrapper);

    let questWindow = document.createElement("div");
    questWindow.id = 'quest-window';
    questWindow.style.padding = '10px';
    questWindow.style.background = 'url(../img/gui/content-redleather.jpg?v=1686032121832)';
    questWindowWrapper.appendChild(questWindow);

    //while (true) {
    // Bierzemy aktywne questy
    let activeQuestList = document.getElementsByClassName('quest-title')

    // Sprawdzamy po kolei po tytule
    for (let i = 0; i < activeQuestList.length; i++) {
        // Tworzymy nazwe aktywnego questa i przycisk do otwierania solucji
        let questName = activeQuestList[i].innerText.replace('.', '');
        let questButton = activeQuestList[i].parentElement.getElementsByClassName("add-bck hide")[0].parentElement;

        // Sprawdzamy jsona z questami
        quests.forEach(quest => {
            if (quest.name.includes(questName)) {
                if (activeQuestList[i].parentElement.getElementsByClassName("quest-buttons-wrapper")[0].getElementsByClassName('solution').length == 0) {
                    let duplicatedButton = questButton.cloneNode(true);
                    duplicatedButton.classList.add('solution');
                    duplicatedButton.removeAttribute('tip-id');
                    duplicatedButton.style.transform = 'rotate(90deg)';
                    duplicatedButton.style.backgroundImage = 'linear-gradient(to left, rgb(9, 59, 157), rgb(23, 116, 172))';
                    let questSolution = quest.name + ' ' + quest.solution;

                    duplicatedButton.addEventListener('click', async function() {
                        if (document.getElementById('quest-window-wrapper').name != questName) {
                            document.getElementById('quest-window-wrapper').style.display = 'block';
                            document.getElementById('quest-window-wrapper').name = questName;
                            document.getElementById('quest-window').innerHTML = questSolution;
                            document.getElementById('quest-window-wrapper').style.opacity = '1';
                        } else {
                            document.getElementById('quest-window-wrapper').name = '';
                            document.getElementById('quest-window-wrapper').style.opacity = '0';
                            await waitForSeconds(0.3);
                            document.getElementById('quest-window-wrapper').style.display = 'none';
                        }

                    })
                    activeQuestList[i].parentElement.getElementsByClassName("quest-buttons-wrapper")[0].appendChild(duplicatedButton);
                }
            }
        });
    }
}

init();
