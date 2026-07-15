/**
 * OCA Livery Selector — 云上联盟 (Overcloud Alliance)
 * 轻量涂装选择器，仅加载联盟自有涂装。
 *
 * 
 */
(function () {
  'use strict';

  const VERSION = '1.2.0';
  const MP_POLL_MS = 5000;

  // 托管到 GitHub 后，把下面地址换成你的 raw 链接，例如：
  // https://raw.githubusercontent.com/你的用户名/oca-livery-selector/main/alliance.json
  const BASE_URL = 'https://raw.githubusercontent.com/chenyuxiang7788-dot/OCA-Overcloud-Alliance-/main';
  const ALLIANCE_JSON_URL = `${BASE_URL}/alliance.json`;
  const LOGO_URL = `${BASE_URL}/asstets/oca-logo.svg`;
  const STYLES_URL = `${BASE_URL}/styles.css`;

  const alliance = { aircrafts: {} };
  const origHTMLs = {};
  const remoteLiveryState = new Map();
  const resizedTextureCache = new Map();
  let multiplayerUpdateRunning = false;
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

  function appendNewChild(parent, tag, attrs = {},text) {
    const el = createTag(tag, attrs,text);
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

  function normalizeTextureList(livery, airplane) {
  const defaultTextures = airplane.liveries?.[0]?.texture || [];
  const selectedTextures = livery.texture || [];

  const defaultUsesOneTexture =
    defaultTextures.length > 1 &&
    defaultTextures.every((texture) => texture === defaultTextures[0]);

  if (
    selectedTextures.length === 1 &&
    (defaultUsesOneTexture || defaultTextures.length === 1)
  ) {
    return Array(Math.max(defaultTextures.length, 1)).fill(
      selectedTextures[0]
    );
  }

  return selectedTextures;
}

function applyLivery(livery, airplane) {
  loadLivery(
    normalizeTextureList(livery, airplane),
    airplane.index,
    airplane.parts,
    livery.materials
  );
}

function broadcastLivery(liveryIndex) {
  const instance = geofs.aircraft?.instance;
  if (!instance) return;

  instance.liveryId = {
    url: ALLIANCE_JSON_URL,

    // 广播发送者自己的机型 ID
    aircraft: String(instance.id),

    // 该机型 liveries 数组中的真实位置
    idx: liveryIndex,

    // OCA 多人协议版本
    oca: 2
  };
}

/**
 * 检查远程玩家发送的涂装信息。
 *
 * 只接受 OCA 自己的 alliance.json 地址，
 * 不加载陌生玩家提供的其他 JSON。
 */
function parseOcaSignal(currentLivery, remoteAircraftId) {
  if (!currentLivery || typeof currentLivery !== 'object') {
    return null;
  }

  if (currentLivery.url !== ALLIANCE_JSON_URL) {
    return null;
  }

  const aircraftId = String(remoteAircraftId ?? '');
  const idx = Number(currentLivery.idx);

  if (!aircraftId) return null;
  if (!Number.isInteger(idx) || idx < 0) return null;

  /*
   * 新版会广播 aircraft。
   * 如果广播中的机型与 GeoFS 远程玩家机型不一致，
   * 说明可能刚刚换飞机，暂时不应用旧涂装。
   */
  if (
    currentLivery.aircraft !== undefined &&
    String(currentLivery.aircraft) !== aircraftId
  ) {
    return null;
  }

  return {
    aircraftId,
    idx
  };
}

/**
 * 获取该机型的多人纹理映射。
 *
 * 正式机型建议在 alliance.json 中明确填写 mp。
 * 没填写时暂时尝试使用本地 index。
 */
function getMultiplayerMappings(airplane) {
  if (Array.isArray(airplane.mp) && airplane.mp.length) {
    return airplane.mp;
  }

  if (Array.isArray(airplane.index)) {
    return airplane.index.map((modelIndex, textureIndex) => ({
      textureIndex,
      modelIndex
    }));
  }

  return [];
}

function getTextureDimensions(textureMeta) {
  const width = Number(
    textureMeta?._width || textureMeta?.width
  );

  const height = Number(
    textureMeta?._height || textureMeta?.height
  );

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return {
    width,
    height
  };
}

/**
 * 将涂装图片转换成远程模型原纹理的尺寸。
 */
async function prepareRemoteTexture(url, textureMeta) {
  const dimensions = getTextureDimensions(textureMeta);

  // 无法读取尺寸时，直接使用原始 URL
  if (!dimensions) {
    return url;
  }

  const cacheKey =
    `${url}|${dimensions.width}|${dimensions.height}`;

  if (resizedTextureCache.has(cacheKey)) {
    return resizedTextureCache.get(cacheKey);
  }

  const promise = (async () => {
    const image = await Cesium.Resource.fetchImage({
      url
    });

    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('无法创建 Canvas');
    }

    context.drawImage(
      image,
      0,
      0,
      dimensions.width,
      dimensions.height
    );

    return canvas.toDataURL('image/png');
  })();

  resizedTextureCache.set(cacheKey, promise);

  try {
    return await promise;
  } catch (error) {
    resizedTextureCache.delete(cacheKey);
    throw error;
  }
}

/**
 * 替换远程玩家飞机的纹理。
 */
function changeRemoteTexture(model, textureUrl, modelIndex) {
  if (!model?._model) {
    throw new Error('远程飞机模型尚未加载');
  }

  if (geofs.version == 2.9) {
    geofs.api.Model.prototype.changeTexture(
      textureUrl,
      modelIndex,
      model
    );
    return;
  }

  if (geofs.version >= 3.0 && geofs.version <= 3.7) {
    geofs.api.changeModelTexture(
      model._model,
      textureUrl,
      modelIndex
    );
    return;
  }

  geofs.api.changeModelTexture(
    model._model,
    textureUrl,
    {
      index: modelIndex
    }
  );
}

/**
 * 修改远程模型材质。
 */
function applyRemoteMaterial(model, livery, materialIndex) {
  const mat = livery.materials?.[materialIndex];

  if (!mat) {
    throw new Error(`找不到材质配置：${materialIndex}`);
  }

  const valueKey = Object.keys(mat).find(
    (key) => key !== 'name'
  );

  if (
    !mat.name ||
    !valueKey ||
    !Array.isArray(mat[valueKey])
  ) {
    throw new Error(`材质配置无效：${materialIndex}`);
  }

  model._model
    .getMaterial(mat.name)
    .setValue(
      valueKey,
      new Cesium.Cartesian4(
        ...mat[valueKey],
        1.0
      )
    );
}

/**
 * 给一个远程玩家应用对应机型的 OCA 涂装。
 */
async function applyRemoteLivery(
  user,
  airplane,
  livery,
  aircraftId
) {
  const mappings = getMultiplayerMappings(airplane);

  if (!mappings.length) {
    throw new Error(
      `机型 ${aircraftId} 没有多人贴图映射`
    );
  }

  const textures = normalizeTextureList(
    livery,
    airplane
  );

  const remoteModelTextures =
    user.model?._model?._rendererResources?.textures || [];

  for (const mapping of mappings) {
    /*
     * 普通图片贴图
     */
    if (mapping.textureIndex !== undefined) {
      const textureIndex = Number(
        mapping.textureIndex
      );

      const modelIndex = Number(
        mapping.modelIndex
      );

      const textureUrl = textures[textureIndex];

      if (!Number.isInteger(textureIndex)) {
        throw new Error('textureIndex 无效');
      }

      if (!Number.isInteger(modelIndex)) {
        throw new Error('modelIndex 无效');
      }

      if (typeof textureUrl !== 'string') {
        throw new Error(
          `texture[${textureIndex}] 不是图片地址`
        );
      }

      const preparedTexture =
        await prepareRemoteTexture(
          textureUrl,
          remoteModelTextures[modelIndex]
        );

      changeRemoteTexture(
        user.model,
        preparedTexture,
        modelIndex
      );

      continue;
    }

    /*
     * 材质颜色
     */
    if (mapping.material !== undefined) {
      applyRemoteMaterial(
        user.model,
        livery,
        Number(mapping.material)
      );
    }
  }
}

/**
 * 扫描所有附近玩家。
 *
 * 重点：
 * 每个玩家都根据自己的 user.aircraft 查配置，
 * 不使用你自己当前驾驶的机型。
 */
async function updateMultiplayer() {
  if (multiplayerUpdateRunning) return;

  multiplayerUpdateRunning = true;

  try {
    const visibleUsers =
      window.multiplayer?.visibleUsers || {};

    const entries = Object.entries(visibleUsers);

    const visibleIds = new Set(
      entries.map(([key, user]) =>
        String(user?.id ?? key)
      )
    );

    /*
     * 删除已经离开视野的玩家缓存
     */
    for (const savedId of remoteLiveryState.keys()) {
      if (!visibleIds.has(savedId)) {
        remoteLiveryState.delete(savedId);
      }
    }

    for (const [key, user] of entries) {
      if (!user?.model) continue;

      /*
       * 这里使用的是远程玩家自己的机型。
       *
       * 例如：
       * 你驾驶 B737，不影响读取朋友的 A350。
       * 朋友驾驶 A350，也不影响读取你的 B737。
       */
      const remoteAircraftId = String(
        user.aircraft ?? ''
      );

      const signal = parseOcaSignal(
        user.currentLivery,
        remoteAircraftId
      );

      if (!signal) continue;

      /*
       * 根据远程玩家的机型 ID，
       * 从 alliance.json 中取得对应飞机配置。
       */
      const airplane =
        alliance.aircrafts[signal.aircraftId];

      if (!airplane) continue;

      /*
       * idx 只在该机型自己的 liveries 数组中查找。
       */
      const livery =
        airplane.liveries?.[signal.idx];

      if (!livery || livery.disabled) continue;

      const userId = String(
        user.id ?? key
      );

      const signature =
        `${signal.aircraftId}|${signal.idx}`;

      const previous =
        remoteLiveryState.get(userId);

      /*
       * 同一个模型已经应用过同一个涂装，
       * 不需要重复加载。
       */
      if (
        previous?.signature === signature &&
        previous?.model === user.model
      ) {
        continue;
      }

      try {
        await applyRemoteLivery(
          user,
          airplane,
          livery,
          signal.aircraftId
        );

        remoteLiveryState.set(userId, {
          signature,
          model: user.model
        });

        log(
          `已同步远程涂装：` +
          `${airplane.name || signal.aircraftId} / ` +
          `${livery.name}`
        );
      } catch (error) {
        remoteLiveryState.delete(userId);

        log(
          `远程涂装同步失败：` +
          `${error.message || error}`,
          'warn'
        );
      }
    }
  } finally {
    multiplayerUpdateRunning = false;
  }
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

    liveries.forEach((livery) => {
      if (query && !livery.name.toLowerCase().includes(query)) return;
      const liveryIndex =
        airplane.liveries.indexOF(livery);

      const item = createTag('li', {
        class: 'oca-livery-item',
        'data-idx': String(liveryIndex),
      });

      appendNewChild(item, 'span', { class: 'oca-livery-name' }, livery.name);
      if (livery.credits) {
        appendNewChild(item, 'span', { class: 'oca-livery-credits' }, `by ${livery.credits}`);
      }

      item.addEventListener('click', () => {
        applyLivery(livery, airplane);
        broadcastLivery(liveryIndex);
        log(`已应用并广播涂装：${livery.name}`);
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
    setInterval(
      updateMultiplayer,
      MP_POLL_MS
    );
    setTimeout(
      updareMultiplayer,
      1500
    );

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
    version: VERSION,
    alliance,
    loadLivery,
    listLiveries,
    togglePanel,
    broadcastLivery,
    updateMultiplayer,
    log,
  };

  init().catch((err) => {
    console.error('[OCA Livery] 初始化失败：', err);
    alert(
      '云上联盟涂装加载失败。\n请稍后重试。'
    );
  });
})();
