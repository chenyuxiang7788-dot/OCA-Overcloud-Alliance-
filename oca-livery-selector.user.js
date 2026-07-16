// ==UserScript==
// @name         GeoFS 云上联盟涂装 (OCA Livery Selector)
// @namespace    https://github.com/chenyuxiang7788-dot/OCA-Overcloud-Alliance-
// @version      1.2.0
// @description  云上联盟 (Overcloud Alliance) 专属涂装选择器
// @author       Overcloud Alliance
// @match        https://geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://raw.githubusercontent.com/chenyuxiang7788-dot/OCA-Overcloud-Alliance-/main/asstets/oca-logo.svg
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const MAIN_JS_URL =
    'https://raw.githubusercontent.com/chenyuxiang7788-dot/OCA-Overcloud-Alliance-/main/main.js';

  async function loadOCA(){
    try{
      const response = await fetch(
        `${MAIN_JS_URL}?t=${Date.now()}`,
        {
          cache: 'no-store'
        }
      );

       if (!response.ok) {
        throw new Error(
          `main.js 加载失败，HTTP ${response.status}`
        );
      }

      const code = await response.text();

      const script = document.createElement('script');

      script.textContent = `${code}

//# sourceURL=oca-main.js
`;

      document.documentElement.appendChild(script);
      script.remove();

      console.log(
        '[OCA Livery] 已加载最新版 main.js'
      );
    } catch (error) {
      console.error(
        '[OCA Livery] Userscript 启动失败：',
        error
      );

      alert(
        '云上联盟涂装脚本加载失败。\n' +
        '请检查网络或 GitHub 文件地址。'
      );
    }
  }

  loadOCA();
})();

(function () {
    "use strict";

   
   /**
    *语音系统 
    */
    const OCA_URL = "https://oca-voice-web.onrender.com";

    const BUTTON_ID = "ocaVoiceButtonMain";

    let ocaVoiceWindow = null;

    function openOcaVoice() {
        if (ocaVoiceWindow && !ocaVoiceWindow.closed) {
            ocaVoiceWindow.focus();
            return;
        }

        ocaVoiceWindow = window.open(
            OCA_URL,
            "ocaVoiceWindow",
            [
                "toolbar=no",
                "location=no",
                "directories=no",
                "status=no",
                "menubar=no",
                "scrollbars=yes",
                "resizable=yes",
                "width=430",
                "height=700"
            ].join(",")
        );

        if (!ocaVoiceWindow) {
            alert(
                "OCA Voice 窗口被浏览器阻止了。\n\n" +
                "请允许 GeoFS 打开弹出式窗口，然后重新点击按钮。"
            );
        }
    }

    function createOcaButton() {
        const button = document.createElement("div");

        button.id = BUTTON_ID;
        button.classList.add("control-pad");
        button.title = "打开 OCA Voice";
        button.setAttribute("role", "button");
        button.setAttribute("tabindex", "0");

        button.style.cssText =
            "width:90px;" +
            "height:25px;" +
            "margin:0px 10px;" +
            "padding:0;" +
            "border-radius:15px;" +
            "outline:none;" +
            "cursor:pointer;" +
            "pointer-events:auto;" +
            "user-select:none;" +
            "box-sizing:border-box;";

        button.innerHTML =
            '<div style="' +
                'width:100%;' +
                'height:25px;' +
                'line-height:27px;' +
                'font-size:12px !important;' +
                'font-family:Arial,sans-serif;' +
                'font-weight:normal;' +
                'pointer-events:none;' +
                'color:#FFF !important;' +
                'text-align:center;' +
                'white-space:nowrap;' +
                'opacity:1 !important;' +
                'visibility:visible !important;' +
                'text-shadow:0 1px 2px #000;' +
                'box-sizing:border-box;' +
            '">' +
                'OCA VOICE' +
            '</div>';

        button.addEventListener("click", openOcaVoice);

        button.addEventListener("keydown", function (event) {
            if (
                event.key === "Enter" ||
                event.key === " "
            ) {
                event.preventDefault();
                openOcaVoice();
            }
        });

        return button;
    }

    function installOcaButton() {
        /*
         * 已经存在时不重复添加。
         */
        if (document.getElementById(BUTTON_ID)) {
            return true;
        }

        const autopilotBar =
            document.getElementsByClassName(
                "geofs-autopilot-bar"
            )[0];

        if (!autopilotBar) {
            return false;
        }

        const button = createOcaButton();

        autopilotBar.append(button);

        console.log(
            "[OCA Voice] 顶部按钮已成功添加"
        );

        return true;
    }

    setInterval(function () {
        try {
            installOcaButton();
        } catch (error) {
            console.error(
                "[OCA Voice] 添加按钮失败：",
                error
            );
        }
    }, 500);
})();
