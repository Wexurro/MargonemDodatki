// ==UserScript==
// @name         MiniQuesty
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://*.margonem.pl/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=margonem.pl
// @grant        none
// ==/UserScript==

const waitForSeconds = (time) => new Promise(resolve => setTimeout(resolve, time * 1000));

function init() {
    console.log("MiniQuesty");
    fetch('https://raw.githubusercontent.com/Wexurro/MargonemDodatki/main/quest-data.html')
        .then(response => response.text())
        .then(content => {
            let questContent = document.createElement("div");
            questContent.id = "quest-content";
            questContent.innerHTML = content;
            document.body.appendChild(questContent);

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
    questWindowWrapper.style.width = "236px";
    questWindowWrapper.style.height = "797px";
    questWindowWrapper.style.position = "absolute";
    questWindowWrapper.style.top = "0px";
    questWindowWrapper.style.left = "354px";
    questWindowWrapper.style.border = "1px solid black";
    questWindowWrapper.style.background = "url(../img/gui/quests/quest_details.png?v=1686032121832)";
    questWindowWrapper.style.backgroundSize = "contain";
    questWindowWrapper.style.overflowY = "scroll";
    questWindowWrapper.style.opacity = "0";
    questWindowWrapper.style.transition = 'opacity 0.3s';
    document.getElementsByClassName("quest-log")[0].parentElement.parentElement.parentElement.appendChild(questWindowWrapper);

    let questWindow = document.createElement("div");
    questWindow.id = 'quest-window';
    questWindow.style.padding = '10px';
    questWindow.style.color = '#f0eade';
    questWindowWrapper.appendChild(questWindow);

    while (true) {
        let activeQuestList = document.getElementsByClassName('quest-title')

        for (let i = 0; i < activeQuestList.length; i++) {
            let questName = activeQuestList[i].innerText.replace('.', '');
            let questButton = activeQuestList[i].parentElement.getElementsByClassName("add-bck hide")[0].parentElement;

            for (let j = 0; j < savedQuestsList.length; j++) {
                if (savedQuestsList[j].innerText.includes(questName)) {

                    if (activeQuestList[i].parentElement.getElementsByClassName("quest-buttons-wrapper")[0].getElementsByClassName('solution').length == 0) {
                        let duplicatedButton = questButton.cloneNode(true);
                        duplicatedButton.classList.add('solution');
                        duplicatedButton.removeAttribute('tip-id');
                        duplicatedButton.name = 'off'
                        duplicatedButton.style.transform = 'rotate(90deg)';
                        duplicatedButton.style.backgroundImage = 'linear-gradient(to left, rgb(9, 59, 157), rgb(23, 116, 172))';

                        let questSolution = savedQuestsList[j].parentElement.innerHTML;

                        duplicatedButton.addEventListener('click', function() {
                            if (document.getElementById('quest-window-wrapper').name != questName) {
                                document.getElementById('quest-window-wrapper').name = questName;
                                document.getElementById('quest-window').innerHTML = questSolution;
                                document.getElementById('quest-window-wrapper').style.opacity = '1';
                            } else {
                                document.getElementById('quest-window-wrapper').name = '';
                                document.getElementById('quest-window-wrapper').style.opacity = '0';
                            }

                        })
                        activeQuestList[i].parentElement.getElementsByClassName("quest-buttons-wrapper")[0].appendChild(duplicatedButton);
                    }
                }
            }
        }
        await waitForSeconds(1);
    }
}

init();
