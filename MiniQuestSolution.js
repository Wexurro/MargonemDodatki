// ==UserScript==
// @name         MiniQuesty
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Dodatek wyświetlający solucje questów
// @author       Wexurro, Fadex
// @match        https://*.margonem.pl/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=margonem.pl
// @grant        none
// ==/UserScript==

const waitForSeconds = (time) => new Promise(resolve => setTimeout(resolve, time * 1000));

console.log(`%c[MQ] MiniQuesty`, 'font-weight: bold;color:#20D600;');
const loader = (retry) => {
    if (typeof Engine == "undefined") return console.log('%c[MQ] Wykryto stary interfejs gry! Dodatek działa tylko na nowym interfejsie!', 'color:#FF0000;');
    if (typeof $ != "undefined") {
        console.log('%c[MQ] Inicjowanie dodatku..', 'color:#20D600;');
        initCSS();
        init();
    } else {
        if (!retry) console.log('%c[MQ] Oczekiwanie na załadowanie jQuery..', 'color:#20D600;');
        setTimeout(() => {
            loader(true);
        }, 1);
    }
};

function initCSS() {
    const css =
        `
.quest-solution {
    width: 400px;
    height: 60vh;
}
.quest-solution .scroll-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    bottom: -6px;
    width: 100%;
}
.quest-solution .scroll-wrapper .scrollbar-wrapper {
    right: -8px;
    top: -1px;
}
.quest-solution .scroll-wrapper .scrollbar-wrapper .background {
    background: url(../img/gui/stats-scroll-bar.png?v=1686032121832) repeat;
    width: 100%;
    height: 100%;
}
.quest-solution .scroll-wrapper .scrollbar-wrapper .track {
    background: 0 0;
}
.quest-solution .scroll-wrapper .scrollbar-wrapper .track .handle {
    left: 0;
}
.quest-solution .quest-data {
    position: relative;
    user-select: text;
    padding-top: 5px;
}
`;
    const $style = document.createElement("style");
    $style.innerHTML = css;
    document.head.appendChild($style);
    console.log('%c[MQ] Wczytano CSS!', 'color:#20D600;');
}

let quests;

function init() {
    console.log('%c[MQ] Pobieranie questów..', 'color:#20D600;');
    fetch('https://raw.githubusercontent.com/Wexurro/MargonemDodatki/main/quests.json')
        .then(response => response.text())
        .then(content => {
            const jsonObject = JSON.parse(content);
            quests = jsonObject.quests;
            console.log('%c[MQ] Questy pobrane!', 'color:#20D600;');
            questListListener();
        })
        .catch(error => {
            console.log('%c[MQ] Błąd wczytywania questów!', 'color:#FF0000;');
            console.error('[MQ] Error log:', error);
        });
}

/* ------------------------------ */

async function questListListener() {
    let questSolutionElement = document.createElement('div');
    questSolutionElement.classList.add('quest-solution');
    const questSolutionWindow = new Window({
        name: "QUEST_SOLUTION",
        header: "Solucja questa",
        element: questSolutionElement,
        css: {
            "display": "none"
        },
        onclose: () => {
            $('.quest-solution').parents('.border-window.ui-draggable').hide();
        }
    });

    while (typeof document.getElementsByClassName("quest-log")[0] == 'undefined') await waitForSeconds(0.1);
    const observer = new MutationObserver(callback);
    console.log('%c[MQ] Observer aktywny!', 'color:#20D600;');

    function callback(mutationsList, observer) {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                let activeQuestList = document.getElementsByClassName('quest-title');

                for (let i = 0; i < activeQuestList.length; i++) {
                    let questName = activeQuestList[i].innerText.replace('.', '');
                    let questButton = activeQuestList[i].parentElement.getElementsByClassName("add-bck hide")[0].parentElement;

                    quests.forEach(quest => {
                        if (quest.name.toLowerCase().includes(questName.toLowerCase())) {
                            if (activeQuestList[i].parentElement.getElementsByClassName("quest-buttons-wrapper")[0].getElementsByClassName('solution').length == 0) {
                                let duplicatedButton = questButton.cloneNode(true);
                                duplicatedButton.classList.add('solution');
                                duplicatedButton.removeAttribute('tip-id');
                                duplicatedButton.style.transform = 'rotate(90deg)';
                                duplicatedButton.style.backgroundImage = 'linear-gradient(to left, rgb(9, 59, 157), rgb(23, 116, 172))';
                                let questSolution = quest.name + ' ' + quest.solution;

                                duplicatedButton.addEventListener('click', function() {
                                    questSolutionElement.innerHTML = `
                                    <div class="scroll-wrapper classic-bar scrollable">
                                        <div class="scroll-pane">
                                            <div class="quest-data">
                                                ${questSolution}
                                            </div>
                                        </div>
                                    </div>
                                    `;
                                    $('.quest-solution').parents('.border-window.ui-draggable').show();
                                    $('.quest-solution').find(".scroll-wrapper").addScrollBar({
                                        track: 1
                                    });
                                })
                                activeQuestList[i].parentElement.getElementsByClassName("quest-buttons-wrapper")[0].appendChild(duplicatedButton);
                            }
                        }
                    });
                }
            }
        }
    }

    const questLogDiv = document.getElementsByClassName("quest-log")[0].parentElement.parentElement.parentElement;
    const config = { childList: true, subtree: true };
    callback([{ type: 'childList', target: questLogDiv }], observer);
    observer.observe(questLogDiv, config);
}

/* ------------------------------ */
// Od Priweejta
const Window = class {
    constructor(options) {
        this.wnd = window.Engine.windowManager.add({
            content: " ",
            nameWindow: options.name || " ",
            parentObj: null,
            title: options.header,
            onclose: options.onclose
        });
        this.$ = this.wnd.$[0];
        this.$content = document.createElement("div");
        this.$userContent = document.createElement("div");
        this.$content.appendChild(this.$userContent);

        if (typeof options.txt != "undefined")
            this.$userContent.innerHTML = options.txt;
        else if (typeof options.element != "undefined")
            this.$userContent.appendChild(options.element);

        if (options.likemAlert)
            this.$.classList.add("mAlert");

        if (options.noClose) {
            const $close = this.getCloseBtt();
            if ($close)
                $close.parentElement.removeChild($close);
        }

        if (options.callbacks) {
            for (let i = 0; i < options.callbacks.length; ++i) {
                const data = options.callbacks[i];
                const btt = new addons.Button({
                    label: data.txt,
                    clb: data.clb
                });
                this.$content.appendChild(btt.get$());
            }
        }

        if (options.css) {
            Object.assign(this.$.style, options.css);
        }

        this.wnd.content(this.$content);
        this.wnd.addToAlertLayer();
        this.wnd.setWndOnPeak();
        this.wnd.center();
    }

    getCloseBtt() {
        const $close = this.$.querySelector(".close-button-corner-decor");
        if ($close) {
            return $close;
        } else {
            return null;
        }
    }

    setContent(content) {
        if (typeof content == "string")
            this.$userContent.innerHTML = content;
        else
            this.$userContent.appendChild(content);
    }

    setHeader(header) {
        this.wnd.title(header);
    }

    setLabel(label) {
        this.wnd.label(label);
    }

    appendContent(el) {
        this.$userContent.appendChild(el);
    }

    clearContent() {
        this.$userContent.innerHTML = "";
    }

    close() {
        this.wnd.close();
    }
    getInnerWnd() {
        return this.wnd;
    }
}

loader();
