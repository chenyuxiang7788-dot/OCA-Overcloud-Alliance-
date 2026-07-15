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