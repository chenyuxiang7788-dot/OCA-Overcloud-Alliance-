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

// ===== OCA Voice：使用 Pushback 插件相同的顶部按钮方式 =====
(function () {
    "use strict";

    // 改成你的真实 Render 网站地址
    const OCA_URL = "https://oca-voice-web.onrender.com";

    let ocaVoiceWindow = null;

    /*
     * Pushback 插件会等待 GeoFS 的 ui 和 flight 加载完成，
     * 然后把按钮直接 append 到 geofs-autopilot-bar。
     */
    const loadTimer = setInterval(function () {
        try {
            // 等待 GeoFS 完成加载
            if (!window.ui || !window.flight) {
                return;
            }

            const autopilotBar =
                document.getElementsByClassName("geofs-autopilot-bar")[0];

            // 自动驾驶栏还没出现，继续等待
            if (!autopilotBar) {
                return;
            }

            // 防止重复创建
            if (document.getElementById("ocaVoiceButtonMain")) {
                clearInterval(loadTimer);
                return;
            }

            // 创建与 Pushback 相同类型的按钮
            const ocaButton = document.createElement("div");

            // 使用 GeoFS 自带的顶部按钮样式
            ocaButton.classList.add("control-pad");

            ocaButton.id = "ocaVoiceButtonMain";
            ocaButton.innerHTML = "OCA VOICE";
            ocaButton.title = "打开 OCA Voice";

            // 参考 Pushback 按钮的尺寸和布局
            ocaButton.style.cssText = `
                width: 100px;
                height: 25px;
                margin: 0px 10px;
                border-radius: 15px;
                outline: none;
                cursor: pointer;
                user-select: none;
            `;

            ocaButton.onclick = function () {
                // 已经打开时，不重复创建窗口
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
                        "OCA Voice 窗口被浏览器阻止了。" +
                        "请允许 GeoFS 打开弹出式窗口。"
                    );
                }
            };

            /*
             * 关键位置：
             * 和 Pushback 插件一样，直接加入自动驾驶栏。
             */
            autopilotBar.append(ocaButton);

            clearInterval(loadTimer);

            console.log(
                "[OCA Voice] 按钮已加入 GeoFS 自动驾驶栏"
            );
        } catch (error) {
            console.error(
                "[OCA Voice] 创建按钮失败：",
                error
            );
        }
    }, 500);
})();