/**
 * OCA Livery Selector — 云上联盟 (Overcloud Alliance)
 * 轻量涂装选择器，仅加载联盟自有涂装。
 *
 * 使用前请将 ALLIANCE_JSON_URL 改成你托管 alliance.json 的地址。
 */
(function () {
  'use strict';

  const VERSION = '1.0.0';

  // 托管到 GitHub 后，把下面地址换成你的 raw 链接，例如：
  // https://raw.githubusercontent.com/你的用户名/oca-livery-selector/main/alliance.json
  const BASE_URL = 'https://raw.githubusercontent.com/chenyuxiang7788-dot/oca-livery-selector/main';
  const ALLIANCE_JSON_URL = `${BASE_URL}/alliance.json`;
  const LOGO_URL = `${BASE_URL}/assets/oca-logo.svg`;
  const STYLES_URL = `${BASE_URL}/styles.css`;

  const alliance = { aircrafts: {} };
  const origHTMLs = {};
  const LOG_STYLE = 'white-space:nowrap;display:inline;color:';
  const log = (msg, type = 'log') =>
    console[type](
      '%c[%cOCA%cLivery%c] %c',
      LOG_STYLE + 'inherit;',
      LOG_STYLE + '#7EC8FF;',
      LOG_STYLE + '#4A90D9;',
      LOG_STYLE + 'inherit;',
      LOG_STYLE + 'inherit;',
      msg
    );

  function createTag(tag, attrs = {}, text) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text != null) el.textContent = text;
    return el;
  }

  function appendNewChild(parent, tag, attrs = {}) {
    const el = createTag(tag, attrs);
    parent.appendChild(el);
    return el;
  }

  function getCurrentAircraft() {
    const id = geofs.aircraft.instance.id;
    return alliance.aircrafts[id] || null;
  }

  function loadLivery(texture, index, parts, materials) {
    for (let i = 0; i < texture.length; i++) {
      const model3d = geofs.aircraft.instance.definition.parts[parts[i]]['3dmodel'];

      if (typeof texture[i] === 'object') {
        if (texture[i].material !== undefined && materials) {
          const mat = materials[texture[i].material];
          model3d._model
            .getMaterial(mat.name)
            .setValue(Object.keys(mat)[1], new Cesium.Cartesian4(...mat[Object.keys(mat)[1]], 1.0));
        }
        continue;
      }

      try {
        if (geofs.version == 2.9) {
          geofs.api.Model.prototype.changeTexture(texture[i], index[i], model3d);
        } else if (geofs.version >= 3.0 && geofs.version <= 3.7) {
          geofs.api.changeModelTexture(model3d._model, texture[i], index[i]);
        } else {
          geofs.api.changeModelTexture(model3d._model, texture[i], { index: index[i] });
        }
      } catch (error) {
        geofs.api.notify('无法加载该涂装，请检查贴图链接是否有效。');
        log(error, 'error');
      }
    }
  }

  function applyLivery(livery, airplane) {
    const textures = airplane.liveries[0].texture;
    const sameTexture =
      textures.length > 1 &&
      textures.every((t) => t === textures[0]);

    if (sameTexture || textures.length === 1) {
      const url = livery.texture[0];
      loadLivery(
        Array(textures.length).fill(url),
        airplane.index,
        airplane.parts,
        livery.materials
      );
      return;
    }

    loadLivery(livery.texture, airplane.index, airplane.parts, livery.materials);
  }

  function listLiveries() {
    const list = document.getElementById('ocaliverylist');
    const panel = document.getElementById('ocaListDiv');
    const searchInput = document.getElementById('ocasearchlivery');
    const acftId = geofs.aircraft.instance.id;
    const airplane = getCurrentAircraft();

    panel.dataset.ac = acftId;
    list.innerHTML = '';

    if (!airplane) {
      list.innerHTML =
        '<li class="oca-unsupported">当前机型暂未加入云上联盟涂装库。<br>请在 alliance.json 中添加该机型的 index / parts 配置。</li>';
      return;
    }

    const query = (searchInput?.value || '').trim().toLowerCase();
    const liveries = (airplane.liveries || []).filter((item) => !item.disabled);

    if (!liveries.length) {
      list.innerHTML =
        '<li class="oca-empty">该机型的联盟涂装尚未发布。<br>完成贴图后，在 alliance.json 中添加条目即可显示。</li>';
      return;
    }

    const fragment = document.createDocumentFragment();

    liveries.forEach((livery, idx) => {
      if (query && !livery.name.toLowerCase().includes(query)) return;

      const item = createTag('li', {
        class: 'oca-livery-item',
        'data-idx': String(idx),
      });

      appendNewChild(item, 'span', { class: 'oca-livery-name' }, livery.name);
      if (livery.credits) {
        appendNewChild(item, 'span', { class: 'oca-livery-credits' }, `by ${livery.credits}`);
      }

      item.addEventListener('click', () => {
        applyLivery(livery, airplane);
        log(`已应用涂装：${livery.name}`);
      });

      fragment.appendChild(item);
    });

    if (!fragment.childNodes.length) {
      list.innerHTML = '<li class="oca-empty">没有匹配的涂装。</li>';
      return;
    }

    list.appendChild(fragment);
  }

  function togglePanel() {
    const panel = document.getElementById('ocaListDiv');
    if (!panel) return;

    if (panel.dataset.ac !== String(geofs.aircraft.instance.id)) {
      listLiveries();
    }
  }

  function markSupportedAircraft() {
    Object.keys(alliance.aircrafts).forEach((aircraftId) => {
      const entry = alliance.aircrafts[aircraftId];
      if (!entry.liveries || entry.liveries.filter((l) => !l.disabled).length === 0) return;

      const element = document.querySelector(`[data-aircraft='${aircraftId}']`);
      if (!element) return;

      if (!origHTMLs[aircraftId]) {
        origHTMLs[aircraftId] = element.innerHTML;
      }

      element.innerHTML =
        origHTMLs[aircraftId] +
        createTag('img', {
          class: 'oca-aircraft-badge',
          src: LOGO_URL,
          title: '云上联盟涂装可用',
        }).outerHTML;
    });
  }

  function generatePanelHTML() {
    return `
      <h3>
        <img src="${LOGO_URL}" alt="OCA" />
        <span>云上联盟涂装</span>
      </h3>
      <p class="oca-subtitle">Overcloud Alliance · 仅显示联盟涂装</p>
      <input
        id="ocasearchlivery"
        class="mdl-textfield__input oca-search geofs-stopPropagation geofs-stopKeyupPropagation"
        type="text"
        placeholder="搜索涂装..."
      />
      <ul id="ocaliverylist"></ul>
    `;
  }

  function generatePanelButtonHTML() {
    const button = createTag('button', {
      title: '云上联盟涂装 (OCA)',
      id: 'ocabutton',
      onclick: 'OCALivery.togglePanel()',
      class: 'mdl-button mdl-js-button geofs-f-standard-ui geofs-mediumScreenOnly',
      'data-toggle-panel': '.oca-livery-list',
      'data-tooltip-classname': 'mdl-tooltip--top',
      'data-upgraded': ',MaterialButton',
    });

    button.innerHTML = createTag('img', {
      src: LOGO_URL,
      alt: 'OCA',
      height: '30',
    }).outerHTML;

    return button;
  }

  async function loadStyles() {
    try {
      const res = await fetch(`${STYLES_URL}?` + Date.now());
      if (!res.ok) return;
      const styleTag = createTag('style', { type: 'text/css' });
      styleTag.textContent = await res.text();
      document.head.appendChild(styleTag);
    } catch (err) {
      log('样式加载失败，将使用默认布局。', 'warn');
    }
  }

  async function loadAllianceData() {
    const res = await fetch(`${ALLIANCE_JSON_URL}?` + Date.now());
    if (!res.ok) {
      throw new Error(`无法加载 alliance.json (${res.status})`);
    }

    const data = await res.json();
    alliance.name = data.name;
    alliance.shortName = data.shortName;
    alliance.englishName = data.englishName;
    alliance.color = data.color;
    alliance.bgcolor = data.bgcolor;
    alliance.aircrafts = data.aircrafts || {};
  }

  async function init() {
    await loadStyles();
    await loadAllianceData();

    const listDiv = appendNewChild(document.querySelector('.geofs-ui-left'), 'div', {
      id: 'ocaListDiv',
      class: 'geofs-list geofs-toggle-panel oca-livery-list',
      'data-noblur': 'true',
    });
    listDiv.innerHTML = generatePanelHTML();

    document.getElementById('ocasearchlivery').addEventListener('input', listLiveries);

    const bottomBar = document.querySelector('.geofs-ui-bottom');
    const insertPos = geofs.version >= 3.6 ? 4 : 3;
    bottomBar.insertBefore(generatePanelButtonHTML(), bottomBar.children[insertPos]);

    markSupportedAircraft();

    window.addEventListener('keyup', (e) => {
      if (e.target.classList.contains('geofs-stopKeyupPropagation')) {
        e.stopImmediatePropagation();
      }
      if (e.key === 'o' || e.key === 'O') {
        OCALivery.togglePanel();
      }
    });

    log(`已加载 v${VERSION} — ${alliance.name} (${alliance.shortName})`);
  }

  window.OCALivery = {
    alliance,
    loadLivery,
    listLiveries,
    togglePanel,
    log,
  };

  init().catch((err) => {
    console.error('[OCA Livery] 初始化失败：', err);
    alert(
      '云上联盟涂装加载失败。\n请检查 alliance.json 地址是否正确，或稍后重试。'
    );
  });
})();
