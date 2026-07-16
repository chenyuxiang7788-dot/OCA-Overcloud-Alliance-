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

// ===== OCA Voice：放在 GeoFS 顶部自动驾驶旁边 =====
(() => {
  const OCA_URL = "https://oca-voice-web.onrender.com";

  // 删除旧版本按钮，避免重复
  document.getElementById("oca-voice-button")?.remove();

  function createOcaButton() {
    const button = document.createElement("button");

    button.id = "oca-voice-button";
    button.type = "button";
    button.innerHTML = "🎙 OCA";

    button.title = "打开 OCA Voice";

    Object.assign(button.style, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      height: "32px",
      minWidth: "72px",
      marginLeft: "6px",
      padding: "0 10px",

      border: "1px solid rgba(255,255,255,0.35)",
      borderRadius: "4px",

      background: "rgba(30, 35, 42, 0.92)",
      color: "#ffffff",

      fontFamily: "Arial, sans-serif",
      fontSize: "13px",
      fontWeight: "600",

      cursor: "pointer",
      verticalAlign: "middle",
      boxSizing: "border-box",
      whiteSpace: "nowrap"
    });

    button.addEventListener("mouseenter", () => {
      button.style.background = "rgba(65, 75, 88, 0.96)";
    });

    button.addEventListener("mouseleave", () => {
      button.style.background = "rgba(30, 35, 42, 0.92)";
    });

    button.addEventListener("click", () => {
      window.open(
        OCA_URL,
        "ocaVoiceWindow",
        "width=430,height=700,resizable=yes,scrollbars=yes"
      );
    });

    return button;
  }

  function getAutopilotElement() {
    // 方法一：读取 GeoFS 的自动驾驶对象
    const geofsControls =
      window.controls ||
      window.geofs?.controls;

    const autopilotPad =
      geofsControls?.autopilot?.$autopilotPad;

    if (autopilotPad) {
      // 兼容 jQuery 对象或普通元素
      const element =
        autopilotPad[0] ||
        autopilotPad;

      if (element instanceof HTMLElement) {
        return element;
      }
    }

    // 方法二：根据常见类名寻找
    const selectors = [
      ".geofs-autopilot",
      ".geofs-autopilot-pad",
      ".geofs-autopilot-container",
      "[class*='autopilot'][class*='pad']",
      "[class*='autopilot'][class*='control']"
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);

      for (const element of elements) {
        const rect = element.getBoundingClientRect();

        // 优先选择顶部且可见的自动驾驶区域
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.top < 160
        ) {
          return element;
        }
      }
    }

    return null;
  }

  function installOcaButton() {
    if (document.getElementById("oca-voice-button")) {
      return true;
    }

    const autopilotElement = getAutopilotElement();

    if (!autopilotElement) {
      return false;
    }

    const button = createOcaButton();

    /*
     * 将按钮插到自动驾驶控制区域之后。
     * 正常效果：
     * [自动驾驶控制] [🎙 OCA]
     */
    autopilotElement.insertAdjacentElement(
      "afterend",
      button
    );

    return true;
  }

  // GeoFS 加载较慢，因此持续等待自动驾驶界面出现
  let attempts = 0;

  const installTimer = setInterval(() => {
    attempts += 1;

    if (installOcaButton() || attempts >= 60) {
      clearInterval(installTimer);
    }
  }, 1000);

  // GeoFS 更新界面后，自动把按钮放回来
  const observer = new MutationObserver(() => {
    if (!document.getElementById("oca-voice-button")) {
      installOcaButton();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();