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

(() => {
  const OCA_URL = "https://你的项目地址.onrender.com";

  // 防止重复创建按钮
  if (document.getElementById("oca-voice-button")) return;

  const button = document.createElement("button");
  button.id = "oca-voice-button";
  button.textContent = "🎙 OCA Voice";

  Object.assign(button.style, {
    position: "fixed",
    right: "18px",
    bottom: "90px",
    zIndex: "999999",
    padding: "10px 14px",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: "10px",
    background: "rgba(20,25,35,0.92)",
    color: "white",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(0,0,0,0.35)"
  });

  button.addEventListener("click", () => {
    window.open(
      OCA_URL,
      "ocaVoiceWindow",
      "width=430,height=700,resizable=yes,scrollbars=yes"
    );
  });

  document.body.appendChild(button);
})();