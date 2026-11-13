import './style.css';
import {
  createIcons, Library, Sparkles, Image as ImageIcon, Plus, Search, Command,
  ArrowUpRight, ExternalLink, Star, X, Check, Link, Copy, Save, Trash2,
  ChevronDown, Globe, Box, Play, Pause, RotateCcw, Code, SlidersHorizontal,
  Folder, Clock, Monitor, Tablet, Smartphone, Download, Eye, ArrowLeft,
  Wand, Layers, FileText, Settings, CheckCircle, MoreHorizontal, Maximize,
  Archive, BookOpen, Loader, Info, Grid, ListFilter, Pencil, Clipboard,
} from 'lucide';
import { starterPrompts, starterWorks, analysisGroups, generatedSeed } from './data.js';
import { createThreeDemo } from './three-demo.js';

const iconSet = {
  Library, Sparkles, Image: ImageIcon, Plus, Search, Command, ArrowUpRight,
  ExternalLink, Star, X, Check, Link, Copy, Save, Trash2, ChevronDown, Globe,
  Box, Play, Pause, RotateCcw, Code, SlidersHorizontal, Folder, Clock, Monitor,
  Tablet, Smartphone, Download, Eye, ArrowLeft, Wand, Layers, FileText, Settings,
  CheckCircle, MoreHorizontal, Maximize, Archive, BookOpen, Loader, Info, Grid,
  ListFilter, Pencil, Clipboard,
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));
const readLocal = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : clone(fallback);
  } catch {
    return clone(fallback);
  }
};

const state = {
  view: 'library',
  prompts: readLocal('prism-prompts', starterPrompts),
  works: readLocal('prism-works', starterWorks),
  learningIds: readLocal('prism-learning', ['p-001', 'p-002', 'p-003']),
  selectedPromptId: 'p-001',
  query: '',
  typeFilter: '全部',
  tagFilter: '',
  galleryFilter: '全部',
  bulkSelected: new Set(),
  expandedGroups: new Set(['role', 'structure']),
  acceptedGroups: new Set(analysisGroups.map((group) => group.id)),
  creativity: 62,
  objective: '将自然观察、编辑设计与实时影像结合，创作一座可探索的数字暗房。',
  versions: [generatedSeed],
  currentVersion: 0,
  generating: false,
  studioType: 'Web',
  device: 'desktop',
  threeWireframe: false,
  threePlaying: true,
  selectedImage: 0,
  collectMode: 'paste',
};

const studioImages = [
  '/images/breathing-prism.jpg',
  '/images/camellia-still-life.jpg',
  '/images/mori-forest.jpg',
  '/images/dust-galaxy.jpg',
];

const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast-root');
let threeDemo = null;
let draggedId = null;
let searchTimer = null;

function persist() {
  localStorage.setItem('prism-prompts', JSON.stringify(state.prompts));
  localStorage.setItem('prism-works', JSON.stringify(state.works));
  localStorage.setItem('prism-learning', JSON.stringify(state.learningIds));
}

function refreshIcons() {
  createIcons({ icons: iconSet, attrs: { 'stroke-width': 1.6 } });
}

function toast(message, type = 'success') {
  const element = document.createElement('div');
  element.className = `toast ${type}`;
  element.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'info'}"></i><span>${escapeHTML(message)}</span>`;
  toastRoot.appendChild(element);
  refreshIcons();
  requestAnimationFrame(() => element.classList.add('visible'));
  setTimeout(() => {
    element.classList.remove('visible');
    setTimeout(() => element.remove(), 240);
  }, 2800);
}

function typeIcon(type) {
  return type === 'Web' ? 'globe' : type === 'Three.js' ? 'box' : 'image';
}

function currentGenerated() {
  return state.versions[state.currentVersion] || '';
}

function selectedPrompt() {
  return state.prompts.find((prompt) => prompt.id === state.selectedPromptId) || state.prompts[0];
}

function renderSidebar() {
  const navItems = [
    { id: 'library', label: '提示词库', icon: 'library', count: state.prompts.length },
    { id: 'workbench', label: '学习工作台', icon: 'sparkles', count: state.learningIds.length },
    { id: 'gallery', label: '作品展', icon: 'image', count: state.works.length },
  ];
  return `
    <aside class="sidebar">
      <button class="brand" data-view="library" aria-label="折光首页">
        <svg class="brand-prism" viewBox="0 0 42 42" fill="none" aria-hidden="true">
          <path d="M21 5 36 33H6L21 5Z" stroke="currentColor" stroke-width="1.4"/>
          <path d="m1 19 12 2m16-2 12-7M21 5v28M13 21l8 5 15-14" stroke="currentColor" stroke-width="1"/>
          <circle cx="21" cy="26" r="2.2" fill="currentColor"/>
        </svg>
        <span class="brand-word"><strong>折光</strong><small>PRISM®</small></span>
      </button>
      <div class="sidebar-caption">WORKSPACE / 001</div>
      <nav class="primary-nav" aria-label="主导航">
        ${navItems.map((item) => `
          <button class="nav-item ${state.view === item.id || (state.view === 'studio' && item.id === 'workbench') ? 'active' : ''}" data-view="${item.id}">
            <i data-lucide="${item.icon}"></i><span>${item.label}</span><em>${item.count}</em>
          </button>`).join('')}
      </nav>
      <div class="sidebar-section">
        <div class="sidebar-caption">COLLECTIONS</div>
        <button class="collection-link" data-action="filter-tag" data-tag=""><i data-lucide="archive"></i><span>全部微光</span><em>${state.prompts.length}</em></button>
        <button class="collection-link" data-action="filter-tag" data-tag="视觉"><i data-lucide="folder"></i><span>视觉语言</span><em>${state.prompts.filter((p) => p.tags.includes('视觉') || p.tags.includes('风格')).length}</em></button>
        <button class="collection-link" data-action="filter-tag" data-tag="动效"><i data-lucide="folder"></i><span>动态叙事</span><em>${state.prompts.filter((p) => p.tags.includes('动效') || p.tags.includes('叙事')).length}</em></button>
      </div>
      <div class="sidebar-section tag-section">
        <div class="sidebar-caption">FREQUENT TAGS</div>
        <div class="sidebar-tags">
          ${['角色', '结构', '构图', '动效', '约束'].map((tag) => `<button data-action="filter-tag" data-tag="${tag}" class="${state.tagFilter === tag ? 'active' : ''}"># ${tag}</button>`).join('')}
        </div>
      </div>
      <div class="sidebar-footer">
        <div class="local-status"><span class="status-dot"></span><div><strong>本地创作空间</strong><small>所有更改已保存</small></div><i data-lucide="check"></i></div>
        <button class="settings-button" data-action="settings"><i data-lucide="settings"></i><span>空间设置</span></button>
      </div>
    </aside>`;
}

function renderTopbar() {
  const pageNames = { library: '提示词库', workbench: '学习工作台', gallery: '作品展', studio: '作品演示' };
  return `
    <header class="topbar">
      <div class="breadcrumb"><span>PRISM</span><b>/</b><strong>${pageNames[state.view]}</strong></div>
      <label class="global-search">
        <i data-lucide="search"></i>
        <input id="global-search" type="search" placeholder="搜索提示词、标签或来源…" value="${escapeHTML(state.query)}" autocomplete="off" />
        <span><i data-lucide="command"></i>K</span>
      </label>
      <button class="button primary top-collect" data-action="open-collect"><i data-lucide="plus"></i><span>采集提示词</span></button>
    </header>`;
}

function filteredPrompts() {
  const query = state.query.trim().toLowerCase();
  return state.prompts.filter((prompt) => {
    const matchesType = state.typeFilter === '全部' || prompt.type === state.typeFilter;
    const matchesTag = !state.tagFilter || prompt.tags.includes(state.tagFilter);
    const haystack = `${prompt.title} ${prompt.excerpt} ${prompt.source} ${prompt.tags.join(' ')} ${prompt.content}`.toLowerCase();
    return matchesType && matchesTag && (!query || haystack.includes(query));
  });
}

function renderPromptCard(prompt) {
  const selected = state.selectedPromptId === prompt.id;
  const checked = state.bulkSelected.has(prompt.id);
  return `
    <article class="prompt-card ${selected ? 'selected' : ''} ${checked ? 'checked' : ''}">
      <button class="select-check ${checked ? 'checked' : ''}" data-action="toggle-bulk" data-id="${prompt.id}" aria-label="${checked ? '取消选择' : '选择'} ${escapeHTML(prompt.title)}">${checked ? '<i data-lucide="check"></i>' : ''}</button>
      <button class="prompt-card-main" data-action="select-prompt" data-id="${prompt.id}">
        <span class="sample-number">S/${prompt.number}</span>
        <span class="type-mark ${prompt.type.replace('.', '').toLowerCase()}"><i data-lucide="${typeIcon(prompt.type)}"></i>${prompt.type}</span>
        <h3>${escapeHTML(prompt.title)}</h3>
        <p>${escapeHTML(prompt.excerpt)}</p>
        <span class="card-tags">${prompt.tags.slice(0, 3).map((tag) => `<em>${escapeHTML(tag)}</em>`).join('')}</span>
        <span class="card-source"><i data-lucide="link"></i>${escapeHTML(prompt.source)}<time>${escapeHTML(prompt.date)}</time></span>
      </button>
      ${prompt.favorite ? '<span class="favorite-mark"><i data-lucide="star"></i></span>' : ''}
    </article>`;
}

function renderPromptDetail(prompt) {
  if (!prompt) return '<section class="detail-panel empty"><p>选择一条提示词查看详情</p></section>';
  const inLearning = state.learningIds.includes(prompt.id);
  return `
    <section class="detail-panel">
      <div class="detail-topline"><span>SAMPLE / ${prompt.number}</span><div>
        <button class="icon-button ${prompt.favorite ? 'is-favorite' : ''}" data-action="toggle-favorite" data-id="${prompt.id}" aria-label="收藏"><i data-lucide="star"></i></button>
        <button class="icon-button" data-action="download-source" data-id="${prompt.id}" aria-label="导出原始提示词"><i data-lucide="download"></i></button>
      </div></div>
      <div class="detail-heading"><span class="type-mark"><i data-lucide="${typeIcon(prompt.type)}"></i>${prompt.type}</span><h2>${escapeHTML(prompt.title)}</h2><p>${escapeHTML(prompt.excerpt)}</p></div>
      <a class="source-link" href="${escapeHTML(prompt.url)}" target="_blank" rel="noreferrer"><i data-lucide="external-link"></i>采集自 ${escapeHTML(prompt.source)}<span>查看来源</span></a>
      <div class="detail-block"><div class="block-label"><span>原始提示词</span><button data-action="copy-text" data-id="${prompt.id}"><i data-lucide="copy"></i>复制</button></div><pre class="prompt-original">${escapeHTML(prompt.content)}</pre></div>
      <div class="detail-block"><div class="block-label"><span>可识别变量</span><small>${prompt.variables.length} VARIABLES</small></div><div class="variable-list">${prompt.variables.map((variable) => `<span>{ ${escapeHTML(variable)} }</span>`).join('')}</div></div>
      <div class="detail-block note-block"><label class="block-label" for="prompt-note"><span>个人笔记</span><i data-lucide="pencil"></i></label><textarea id="prompt-note" data-id="${prompt.id}" rows="3" placeholder="记录这条提示词值得学习的地方…">${escapeHTML(prompt.note)}</textarea></div>
      <div class="detail-actions"><button class="button ${inLearning ? 'secondary' : 'primary'} full" data-action="add-learning" data-id="${prompt.id}"><i data-lucide="${inLearning ? 'check' : 'plus'}"></i>${inLearning ? '已在学习集中 · 打开工作台' : '加入学习集'}</button></div>
    </section>`;
}

function renderLibrary() {
  const prompts = filteredPrompts();
  const active = prompts.find((prompt) => prompt.id === state.selectedPromptId) || prompts[0];
  return `
    <div class="view library-view">
      <section class="page-intro">
        <div><div class="eyebrow"><span></span>COLLECTION / 样本库</div><h1>把灵感，收进<span class="serif-accent">微光。</span></h1><p>收集那些让你驻足的表达，拆解它们，再长成自己的语言。</p></div>
        <div class="collection-count"><strong>${String(state.prompts.length).padStart(2, '0')}</strong><span>条提示词样本<br>持续生长中</span></div>
      </section>
      <div class="filter-bar">
        <div class="segmented type-filter">${['全部', 'Web', 'Three.js', '图片'].map((type) => `<button class="${state.typeFilter === type ? 'active' : ''}" data-action="filter-type" data-type="${type}">${type}</button>`).join('')}</div>
        <div class="active-filter">${state.tagFilter ? `<button data-action="filter-tag" data-tag=""><i data-lucide="list-filter"></i># ${state.tagFilter}<i data-lucide="x"></i></button>` : '<span><i data-lucide="list-filter"></i>按媒介筛选样本</span>'}</div>
        <button class="sort-button">最近采集<i data-lucide="chevron-down"></i></button>
      </div>
      <div class="library-grid">
        <section class="prompt-list" aria-label="提示词列表">
          <div class="list-caption"><span>${prompts.length} SAMPLES</span><span>多选以建立学习集</span></div>
          ${prompts.length ? prompts.map(renderPromptCard).join('') : `<div class="empty-search"><i data-lucide="search"></i><h3>没有找到这束微光</h3><p>试试其他关键词或清除筛选。</p><button class="text-button" data-action="clear-filters">清除所有筛选</button></div>`}
        </section>
        ${renderPromptDetail(active)}
      </div>
      ${state.bulkSelected.size ? `<div class="bulk-bar"><span class="bulk-count">${state.bulkSelected.size}</span><strong>条样本已选择</strong><button class="text-button" data-action="clear-bulk">取消</button><button class="button primary" data-action="bulk-learning">建立学习集<i data-lucide="arrow-up-right"></i></button></div>` : ''}
    </div>`;
}

function renderLearningSamples() {
  const samples = state.learningIds.map((id) => state.prompts.find((prompt) => prompt.id === id)).filter(Boolean);
  if (!samples.length) {
    return `<div class="empty-samples"><span class="empty-prism">△</span><h3>学习集还是空的</h3><p>从样本库挑选 2–4 条提示词，让 AI 找出它们共同的创作语言。</p><button class="button secondary" data-view="library"><i data-lucide="plus"></i>选择样本</button></div>`;
  }
  return samples.map((prompt, index) => `
    <article class="learning-sample" draggable="true" data-drag-id="${prompt.id}" data-drop-id="${prompt.id}">
      <div class="sample-order">${String(index + 1).padStart(2, '0')}<span>↕</span></div>
      <div><span class="mini-type"><i data-lucide="${typeIcon(prompt.type)}"></i>${prompt.type}</span><h4>${escapeHTML(prompt.title)}</h4><p>${escapeHTML(prompt.tags.slice(0, 2).join(' · '))}</p></div>
      <button class="icon-button" data-action="remove-learning" data-id="${prompt.id}" aria-label="移除样本"><i data-lucide="x"></i></button>
      <div class="weight-line"><span style="width:${88 - index * 9}%"></span></div>
    </article>`).join('');
}

function renderAnalysis() {
  if (!state.learningIds.length) return '<div class="analysis-placeholder"><i data-lucide="layers"></i><p>选择样本后，这里会呈现可干预的学习摘要。</p></div>';
  return analysisGroups.map((group) => {
    const expanded = state.expandedGroups.has(group.id);
    const accepted = state.acceptedGroups.has(group.id);
    return `
      <article class="analysis-group ${expanded ? 'expanded' : ''} ${accepted ? 'accepted' : 'ignored'}">
        <button class="analysis-head" data-action="toggle-expand" data-id="${group.id}"><span>${group.index}</span><strong>${group.title}</strong><i data-lucide="chevron-down"></i></button>
        ${expanded ? `<div class="analysis-body"><p>${group.common}</p><div class="analysis-detail"><span>差异</span>${group.difference}</div><div class="analysis-suggestion"><i data-lucide="sparkles"></i><p>${group.suggestion}</p></div><button class="adopt-button ${accepted ? 'active' : ''}" data-action="toggle-analysis" data-id="${group.id}"><i data-lucide="${accepted ? 'check' : 'plus'}"></i>${accepted ? '已采纳此特征' : '采纳此特征'}</button></div>` : ''}
      </article>`;
  }).join('');
}

function renderWorkbench() {
  const sampleCount = state.learningIds.length;
  return `
    <div class="view workbench-view">
      <section class="page-intro compact">
        <div><div class="eyebrow"><span></span>LEARNING LAB / 学习工作台</div><h1>从样本，到你的<span class="serif-accent">表达。</span></h1><p>看见 AI 学到了什么，并决定哪些特征值得被保留。</p></div>
        <button class="button ghost" data-action="download-generated" ${!currentGenerated() ? 'disabled' : ''}><i data-lucide="download"></i>导出 .md</button>
      </section>
      <div class="process-line" aria-label="学习流程">
        ${[['01', '选择样本', sampleCount > 0], ['02', '提炼特征', sampleCount > 0], ['03', '生成新提示词', !!currentGenerated()]].map(([number, label, active], index) => `<div class="process-step ${active ? 'active' : ''}"><span>${number}</span><strong>${label}</strong>${index < 2 ? '<svg viewBox="0 0 100 12" preserveAspectRatio="none"><path d="M0 6h42l8-5 8 10 8-5h34"/></svg>' : ''}</div>`).join('')}
      </div>
      <div class="workbench-grid">
        <section class="bench-column samples-column">
          <div class="column-heading"><div><span>01 / INPUT</span><h2>学习集 <em>${sampleCount}</em></h2></div><button class="icon-button" data-view="library" aria-label="添加样本"><i data-lucide="plus"></i></button></div>
          <div class="learning-samples">${renderLearningSamples()}</div>
          ${sampleCount ? '<p class="drag-hint"><i data-lucide="more-horizontal"></i>拖拽调整样本顺序，影响提炼权重</p>' : ''}
        </section>
        <section class="bench-column analysis-column">
          <div class="column-heading"><div><span>02 / DISTILL</span><h2>学习摘要</h2></div><span class="ai-badge"><i></i>可干预</span></div>
          <div class="analysis-groups">${renderAnalysis()}</div>
        </section>
        <section class="bench-column generator-column">
          <div class="column-heading"><div><span>03 / REFRACT</span><h2>新提示词</h2></div><div class="version-tabs">${state.versions.map((_, index) => `<button class="${state.currentVersion === index ? 'active' : ''}" data-action="version" data-index="${index}">V${index + 1}</button>`).join('')}</div></div>
          <label class="objective-label" for="objective">这次想创作什么？</label>
          <textarea id="objective" class="objective-input" rows="3" placeholder="描述目标、主题或想探索的方向…">${escapeHTML(state.objective)}</textarea>
          <div class="creativity-control"><div><span>创作倾向</span><output id="creativity-output">${state.creativity}%</output></div><input id="creativity" type="range" min="0" max="100" value="${state.creativity}" style="--range:${state.creativity}%" ${!sampleCount ? 'disabled' : ''}><div class="range-labels"><span>忠实样本</span><span>大胆重组</span></div></div>
          <button class="button primary generate-button" data-action="generate" ${!sampleCount || state.generating ? 'disabled' : ''}>${state.generating ? '<i data-lucide="loader" class="spin"></i>正在折射样本特征…' : '<i data-lucide="sparkles"></i>生成新提示词'}<span>⌘ ↵</span></button>
          <div class="generated-wrap ${state.generating ? 'is-generating' : ''}">
            ${state.generating ? '<div class="generation-scan"><span></span><p>正在比较结构、语言与约束…</p></div>' : ''}
            <div class="editor-top"><span><i data-lucide="file-text"></i>生成结果 · 可直接编辑</span><button data-action="copy-generated"><i data-lucide="copy"></i>复制</button></div>
            <textarea id="generated-editor" class="generated-editor" spellcheck="false" placeholder="生成的新提示词会出现在这里…">${escapeHTML(currentGenerated())}</textarea>
          </div>
          <div class="generator-actions"><button class="button secondary" data-action="save-generated" ${!currentGenerated() ? 'disabled' : ''}><i data-lucide="save"></i>仅保存提示词</button><button class="button light" data-action="open-demo-options" ${!currentGenerated() ? 'disabled' : ''}>制作作品演示<i data-lucide="arrow-up-right"></i></button></div>
          <p class="optional-note"><i data-lucide="info"></i>演示是可选的，保存提示词不会触发生成。</p>
        </section>
      </div>
    </div>`;
}

function renderWebDemo() {
  return `
    <div class="web-demo-stage ${state.device}">
      <div class="browser-shell">
        <div class="browser-chrome"><div class="browser-dots"><i></i><i></i><i></i></div><span><i data-lucide="check"></i>mori.archive / dawn</span><i data-lucide="more-horizontal"></i></div>
        <div class="demo-website">
          <img src="${starterWorks[0].image}" alt="晨雾森林中的 MORI 植物档案官网" />
          <div class="demo-site-nav"><strong>MORI<span>®</span></strong><span>植物档案&nbsp;&nbsp;&nbsp;自然手记&nbsp;&nbsp;&nbsp;关于 MORI</span><em>探索植物 ↗</em></div>
          <div class="demo-site-copy"><small>BOTANICAL ARCHIVE · ISSUE 01</small><h2>与自然，<br><i>同频呼吸。</i></h2><p>从一片叶子的脉络，重新发现身体的节律。</p><button>翻开植物档案 <span>→</span></button></div>
          <div class="demo-site-index"><span>01</span><div></div><small>晨雾 / CAMELLIA</small></div>
        </div>
      </div>
    </div>`;
}

function renderThreeDemo() {
  return `
    <div class="three-demo-stage">
      <div id="three-canvas"></div>
      <div class="viewport-caption"><span>REALTIME / WEBGL</span><strong>PRISM 01</strong><small>拖拽旋转 · 滚轮缩放</small></div>
      <div class="viewport-axis"><span>Y</span><i></i><b></b><em>X</em></div>
      <div class="three-toolbar">
        <button class="${state.threeWireframe ? 'active' : ''}" data-action="three-wireframe"><i data-lucide="grid"></i>线框</button>
        <button data-action="three-play"><i data-lucide="${state.threePlaying ? 'pause' : 'play'}"></i>${state.threePlaying ? '暂停' : '播放'}</button>
        <button data-action="three-reset"><i data-lucide="rotate-ccw"></i>重置视角</button>
      </div>
      <div class="three-params"><div><span>CAMERA</span><strong>45° / PERSP</strong></div><div><span>MATERIAL</span><strong>TRANSMISSION 0.55</strong></div><div><span>BREATH</span><strong>6.0 SEC</strong></div></div>
    </div>`;
}

function renderImageDemo() {
  return `
    <div class="image-demo-stage">
      <figure class="main-artwork"><img src="${studioImages[state.selectedImage]}" alt="由提示词生成的棱镜植物艺术影像 ${state.selectedImage + 1}"><figcaption><span>OUTPUT ${String(state.selectedImage + 1).padStart(2, '0')} / 04</span><button data-action="download-image"><i data-lucide="download"></i>保存影像</button></figcaption></figure>
      <div class="image-candidates">${studioImages.map((image, index) => `<button class="${state.selectedImage === index ? 'active' : ''}" data-action="select-image" data-index="${index}"><img src="${image}" alt="候选影像 ${index + 1}"><span>0${index + 1}</span></button>`).join('')}</div>
    </div>`;
}

function renderStudio() {
  const typeLabels = { Web: '响应式网页', 'Three.js': '实时三维场景', '图片': '艺术影像' };
  return `
    <div class="view studio-view">
      <section class="studio-heading"><button class="back-button" data-view="workbench"><i data-lucide="arrow-left"></i>返回提示词</button><div><div class="eyebrow"><span></span>OUTPUT STUDIO / 作品演示</div><h1>让提示词，<span class="serif-accent">成为作品。</span></h1></div><span class="optional-pill"><i data-lucide="info"></i>OPTIONAL / 可选演示</span></section>
      <div class="studio-typebar"><div class="segmented">${['Web', 'Three.js', '图片'].map((type) => `<button class="${state.studioType === type ? 'active' : ''}" data-action="studio-type" data-type="${type}"><i data-lucide="${typeIcon(type)}"></i>${type}</button>`).join('')}</div><div class="studio-tools">${state.studioType === 'Web' ? `<button class="${state.device === 'desktop' ? 'active' : ''}" data-action="device" data-device="desktop" aria-label="桌面预览"><i data-lucide="monitor"></i></button><button class="${state.device === 'tablet' ? 'active' : ''}" data-action="device" data-device="tablet" aria-label="平板预览"><i data-lucide="tablet"></i></button><button class="${state.device === 'mobile' ? 'active' : ''}" data-action="device" data-device="mobile" aria-label="手机预览"><i data-lucide="smartphone"></i></button>` : ''}<button data-action="view-generated"><i data-lucide="file-text"></i>查看所用提示词</button></div></div>
      <div class="studio-layout">
        <section class="preview-panel">
          <div class="preview-topline"><span>LIVE PREVIEW / ${typeLabels[state.studioType]}</span><div><i></i>预览已就绪</div></div>
          ${state.studioType === 'Web' ? renderWebDemo() : state.studioType === 'Three.js' ? renderThreeDemo() : renderImageDemo()}
        </section>
        <aside class="output-inspector">
          <div class="inspector-heading"><span>OUTPUT / 001</span><h2>微光档案</h2><p>由 3 条样本折射生成<br>${typeLabels[state.studioType]} · V${state.currentVersion + 1}</p></div>
          <div class="inspector-block"><span class="inspector-label">作品参数</span><dl>${state.studioType === 'Web' ? '<div><dt>画幅</dt><dd>1440 × 960</dd></div><div><dt>结构</dt><dd>4 个章节</dd></div><div><dt>交互</dt><dd>滚动显影</dd></div>' : state.studioType === 'Three.js' ? '<div><dt>几何体</dt><dd>Triangular</dd></div><div><dt>粒子</dt><dd>420 pts</dd></div><div><dt>帧率</dt><dd>60 fps</dd></div>' : '<div><dt>尺寸</dt><dd>2048 × 1536</dd></div><div><dt>风格</dt><dd>当代静物</dd></div><div><dt>种子</dt><dd>829041</dd></div>'}</dl></div>
          <div class="inspector-block"><span class="inspector-label">样本折射路径</span><div class="refraction-map"><span>S/001</span><i></i><span>S/002</span><i></i><span>S/003</span><b>△</b></div><p class="inspector-note">保留了编辑式结构、晶体意象与克制的光线约束。</p></div>
          <button class="prompt-trace" data-action="view-generated"><i data-lucide="code"></i><span>查看完整提示词<small>Prompt V${state.currentVersion + 1}</small></span><i data-lucide="arrow-up-right"></i></button>
          <div class="inspector-actions"><button class="button secondary" data-view="workbench">继续编辑</button><button class="button primary" data-action="save-work"><i data-lucide="save"></i>收进作品展</button></div>
        </aside>
      </div>
    </div>`;
}

function renderGallery() {
  const works = state.works.filter((work) => state.galleryFilter === '全部' || work.type === state.galleryFilter);
  return `
    <div class="view gallery-view">
      <section class="page-intro">
        <div><div class="eyebrow"><span></span>GALLERY / 作品展</div><h1>每一束光，都有<span class="serif-accent">去向。</span></h1><p>从提示词到作品，保留每一次实验与折射的路径。</p></div>
        <div class="collection-count"><strong>${String(state.works.length).padStart(2, '0')}</strong><span>件作品<br>持续显影中</span></div>
      </section>
      <div class="gallery-toolbar"><div class="segmented">${['全部', 'Web', 'Three.js', '图片'].map((type) => `<button class="${state.galleryFilter === type ? 'active' : ''}" data-action="gallery-filter" data-type="${type}">${type}</button>`).join('')}</div><span>CURATED BY YOU · ${works.length} WORKS</span></div>
      <section class="works-grid">
        ${works.map((work, index) => `
          <article class="work-card ${work.type === '图片' ? 'artwork' : ''}" style="--delay:${index * 45}ms">
            <button class="work-visual" data-action="open-work" data-id="${work.id}"><img src="${work.image}" alt="${escapeHTML(work.title)}" loading="lazy"><span class="work-open"><i data-lucide="maximize"></i>查看作品</span><span class="work-type"><i data-lucide="${typeIcon(work.type)}"></i>${work.type}</span></button>
            <div class="work-meta"><div><span>W/${String(index + 1).padStart(3, '0')}</span><h3>${escapeHTML(work.title)}</h3></div><time>${escapeHTML(work.date)}</time></div>
            <button class="work-prompt-link" data-action="trace-work" data-id="${work.id}">查看提示词<i data-lucide="arrow-up-right"></i></button>
          </article>`).join('')}
        <button class="new-work-card" data-view="workbench"><span>△</span><h3>下一件作品，<br>从一条提示词开始。</h3><p>进入学习工作台<i data-lucide="arrow-up-right"></i></p></button>
      </section>
    </div>`;
}

function render() {
  if (threeDemo) {
    threeDemo.destroy();
    threeDemo = null;
  }
  const content = state.view === 'library' ? renderLibrary() : state.view === 'workbench' ? renderWorkbench() : state.view === 'gallery' ? renderGallery() : renderStudio();
  app.innerHTML = `${renderSidebar()}<div class="app-shell">${renderTopbar()}<main class="main-content">${content}</main></div><nav class="mobile-nav">${[['library', 'library', '库'], ['workbench', 'sparkles', '学习'], ['gallery', 'image', '作品']].map(([view, icon, label]) => `<button class="${state.view === view ? 'active' : ''}" data-view="${view}"><i data-lucide="${icon}"></i><span>${label}</span></button>`).join('')}</nav>`;
  refreshIcons();
  if (state.view === 'studio' && state.studioType === 'Three.js') {
    requestAnimationFrame(() => {
      const container = document.querySelector('#three-canvas');
      if (container) {
        try {
          threeDemo = createThreeDemo(container);
          threeDemo.setWireframe(state.threeWireframe);
          threeDemo.setPlaying(state.threePlaying);
        } catch {
          container.innerHTML = '<div class="webgl-error"><i data-lucide="box"></i><p>当前浏览器无法启动 WebGL，请启用硬件加速后重试。</p></div>';
          refreshIcons();
        }
      }
    });
  }
}

function closeModal() {
  modalRoot.innerHTML = '';
}

function openModal(content, className = '') {
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal ${className}" role="dialog" aria-modal="true">${content}</section></div>`;
  refreshIcons();
  requestAnimationFrame(() => modalRoot.querySelector('input, textarea, button')?.focus());
}

function openCollectModal() {
  openModal(`
    <div class="modal-heading"><div><span>NEW SAMPLE / 采集微光</span><h2>把好的表达，留下来。</h2></div><button class="icon-button" data-action="close-modal" aria-label="关闭"><i data-lucide="x"></i></button></div>
    <div class="collect-tabs"><button class="${state.collectMode === 'paste' ? 'active' : ''}" data-action="collect-mode" data-mode="paste"><i data-lucide="clipboard"></i>粘贴提示词</button><button class="${state.collectMode === 'link' ? 'active' : ''}" data-action="collect-mode" data-mode="link"><i data-lucide="link"></i>从链接整理</button></div>
    <div class="collect-layout">
      <div class="collect-form">
        ${state.collectMode === 'link' ? `<label>来源链接<div class="url-input"><input id="collect-url" type="url" placeholder="https://example.com/prompt"><button class="button secondary" data-action="parse-link">整理链接</button></div><small>演示模式将在本地生成整理示例，不会请求外部网页。</small></label>` : ''}
        <label>标题<input id="collect-title" type="text" placeholder="给这条提示词一个名字"></label>
        <label>原始提示词<textarea id="collect-text" rows="10" placeholder="粘贴你收集到的完整提示词…"></textarea></label>
        <div class="form-row"><label>作品类型<select id="collect-type"><option>Web</option><option>Three.js</option><option>图片</option></select></label><label>标签<input id="collect-tags" type="text" placeholder="结构, 视觉, 动效"></label></div>
        <label>来源（可选）<input id="collect-source" type="text" placeholder="例如：awwwards.com"></label>
      </div>
      <aside class="collect-preview"><span class="preview-label"><i data-lucide="sparkles"></i>整理预览</span><div class="preview-sample"><span>S / NEW</span><h3 id="preview-title">未命名的微光</h3><p id="preview-text">输入提示词后，在这里确认整理结果。原始内容不会被自动覆盖。</p><div class="preview-suggestions"><span>AI 整理建议</span><em>保留原始结构</em><em>识别可复用变量</em><em>补充个人笔记</em></div></div><p class="privacy-note"><i data-lucide="check"></i>仅保存在当前浏览器</p></aside>
    </div>
    <div class="modal-actions"><button class="button ghost" data-action="close-modal">取消</button><button class="button primary" data-action="save-collect"><i data-lucide="plus"></i>收进样本库</button></div>
  `, 'collect-modal');
}

function openDemoOptions() {
  openModal(`
    <div class="modal-heading"><div><span>OPTIONAL OUTPUT / 可选演示</span><h2>想让这束光，落在哪里？</h2><p>选择一种作品媒介，也可以稍后再做。</p></div><button class="icon-button" data-action="close-modal"><i data-lucide="x"></i></button></div>
    <div class="demo-options">${[
      ['Web', 'globe', '响应式网页', '在浏览器画框中查看桌面、平板与手机效果。'],
      ['Three.js', 'box', '实时三维作品', '旋转晶体、调整线框并探索实时光线。'],
      ['图片', 'image', '艺术影像', '比较四幅候选影像，保存最贴近想象的一幅。'],
    ].map(([type, icon, title, description], index) => `<button data-action="choose-demo" data-type="${type}"><span>0${index + 1}</span><i data-lucide="${icon}"></i><h3>${title}</h3><p>${description}</p><em>进入画布<i data-lucide="arrow-up-right"></i></em></button>`).join('')}</div>
    <div class="modal-actions"><button class="text-button" data-action="close-modal">稍后再做</button><button class="button secondary" data-action="save-generated"><i data-lucide="save"></i>仅保存提示词</button></div>
  `, 'demo-options-modal');
}

function openPromptModal(text, title = '本次创作所用提示词') {
  openModal(`
    <div class="modal-heading"><div><span>PROMPT TRACE / 可追溯路径</span><h2>${escapeHTML(title)}</h2></div><button class="icon-button" data-action="close-modal"><i data-lucide="x"></i></button></div>
    <pre class="modal-prompt">${escapeHTML(text)}</pre>
    <div class="modal-actions"><span class="trace-note"><i data-lucide="check-circle"></i>与当前作品版本关联</span><button class="button primary" data-action="copy-modal"><i data-lucide="copy"></i>复制提示词</button></div>
  `, 'prompt-modal');
}

function openSettings() {
  openModal(`
    <div class="modal-heading"><div><span>LOCAL SPACE / 空间设置</span><h2>你的微光，留在本地。</h2></div><button class="icon-button" data-action="close-modal"><i data-lucide="x"></i></button></div>
    <div class="settings-content"><div><i data-lucide="archive"></i><span><strong>${state.prompts.length} 条提示词 · ${state.works.length} 件作品</strong><p>所有采集、学习和作品数据仅存储在当前浏览器的 localStorage 中。</p></span></div><div><i data-lucide="info"></i><span><strong>演示模式</strong><p>AI 整理与生成由本地示例模拟，不会向模型服务商发送任何内容。</p></span></div></div>
    <div class="modal-actions"><button class="button danger" data-action="reset-data"><i data-lucide="trash-2"></i>恢复初始示例</button><button class="button primary" data-action="close-modal">完成</button></div>
  `, 'settings-modal');
}

function generatePrompt() {
  if (state.generating || !state.learningIds.length) return;
  state.generating = true;
  render();
  setTimeout(() => {
    const direction = state.objective.trim() || '探索自然、光线与数字媒介之间的关系';
    const boldness = state.creativity > 70 ? '大胆打破样本的原始结构，建立出人意料但统一的视觉隐喻。' : state.creativity < 35 ? '尽量忠实保留样本的结构、语言节奏与约束。' : '保留样本的核心结构，同时重组视觉意象与体验节奏。';
    const next = `${generatedSeed}\n\n【本次创作目标】\n${direction}\n\n【重组策略 · ${state.creativity}%】\n${boldness}\n\n仅采纳已标记的学习特征；输出可直接用于创作的完整提示词，不附加解释。`;
    state.versions.push(next);
    state.currentVersion = state.versions.length - 1;
    state.generating = false;
    persist();
    render();
    toast(`V${state.currentVersion + 1} 已生成，可继续编辑或制作演示`);
  }, 1100);
}

function saveGenerated() {
  const content = document.querySelector('#generated-editor')?.value || currentGenerated();
  if (!content.trim()) return;
  const id = `p-${Date.now()}`;
  const title = state.objective.trim() ? state.objective.trim().slice(0, 24) : '未命名的折射';
  const prompt = {
    id, number: String(state.prompts.length + 1).padStart(3, '0'), title,
    type: 'Web', source: 'prism.local', url: '#', tags: ['生成', '学习集', '个人创作'],
    favorite: false, date: '刚刚', excerpt: content.slice(0, 88).replaceAll('\n', ' '),
    content, variables: ['核心意象', '创作目标', '媒介', '视觉方向'], note: '由学习工作台生成，可继续补充笔记。',
  };
  state.prompts.unshift(prompt);
  state.selectedPromptId = id;
  persist();
  closeModal();
  render();
  toast('新提示词已收进样本库');
}

function saveWork() {
  const image = state.studioType === 'Web' ? starterWorks[0].image : state.studioType === 'Three.js' ? starterWorks[1].image : studioImages[state.selectedImage];
  state.works.unshift({
    id: `w-${Date.now()}`,
    title: state.studioType === 'Web' ? '微光档案 · 数字暗房' : state.studioType === 'Three.js' ? 'PRISM · 折射实验' : `微光影像 · 0${state.selectedImage + 1}`,
    type: state.studioType,
    date: '刚刚',
    promptId: state.selectedPromptId,
    image,
  });
  persist();
  state.view = 'gallery';
  state.galleryFilter = '全部';
  render();
  toast('作品已收进作品展，并保留提示词路径');
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('已复制到剪贴板');
  } catch {
    toast('浏览器未允许剪贴板访问，请手动复制', 'info');
  }
}

function clearFilters() {
  state.query = '';
  state.typeFilter = '全部';
  state.tagFilter = '';
  render();
}

document.addEventListener('click', (event) => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) {
    state.view = viewButton.dataset.view;
    render();
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id, type, tag } = button.dataset;
  switch (action) {
    case 'open-collect': openCollectModal(); break;
    case 'close-modal': closeModal(); break;
    case 'settings': openSettings(); break;
    case 'select-prompt': state.selectedPromptId = id; render(); break;
    case 'toggle-favorite': {
      const prompt = state.prompts.find((item) => item.id === id);
      if (prompt) prompt.favorite = !prompt.favorite;
      persist(); render(); break;
    }
    case 'toggle-bulk':
      if (state.bulkSelected.has(id)) state.bulkSelected.delete(id); else state.bulkSelected.add(id);
      render(); break;
    case 'clear-bulk': state.bulkSelected.clear(); render(); break;
    case 'bulk-learning':
      state.learningIds = [...new Set([...state.learningIds, ...state.bulkSelected])];
      state.bulkSelected.clear(); state.view = 'workbench'; persist(); render(); toast('学习集已建立，可查看提炼摘要'); break;
    case 'add-learning':
      if (!state.learningIds.includes(id)) state.learningIds.push(id);
      state.view = 'workbench'; persist(); render(); toast('样本已加入学习集'); break;
    case 'remove-learning': state.learningIds = state.learningIds.filter((item) => item !== id); persist(); render(); break;
    case 'filter-type': state.typeFilter = type; render(); break;
    case 'filter-tag': state.tagFilter = tag; state.view = 'library'; render(); break;
    case 'clear-filters': clearFilters(); break;
    case 'toggle-expand':
      if (state.expandedGroups.has(id)) state.expandedGroups.delete(id); else state.expandedGroups.add(id);
      render(); break;
    case 'toggle-analysis':
      if (state.acceptedGroups.has(id)) state.acceptedGroups.delete(id); else state.acceptedGroups.add(id);
      render(); break;
    case 'version': state.currentVersion = Number(button.dataset.index); render(); break;
    case 'generate': generatePrompt(); break;
    case 'copy-generated': copyText(document.querySelector('#generated-editor')?.value || currentGenerated()); break;
    case 'save-generated': saveGenerated(); break;
    case 'download-generated': downloadText('prism-新提示词.md', currentGenerated()); break;
    case 'download-source': {
      const prompt = state.prompts.find((item) => item.id === id);
      if (prompt) downloadText(`prism-${prompt.title}.md`, prompt.content);
      break;
    }
    case 'copy-text': {
      const prompt = state.prompts.find((item) => item.id === id);
      if (prompt) copyText(prompt.content);
      break;
    }
    case 'open-demo-options': openDemoOptions(); break;
    case 'choose-demo': closeModal(); state.studioType = type; state.view = 'studio'; render(); break;
    case 'studio-type': state.studioType = type; render(); break;
    case 'device': state.device = button.dataset.device; render(); break;
    case 'three-wireframe': state.threeWireframe = !state.threeWireframe; threeDemo?.setWireframe(state.threeWireframe); button.classList.toggle('active', state.threeWireframe); break;
    case 'three-play':
      state.threePlaying = !state.threePlaying; threeDemo?.setPlaying(state.threePlaying);
      button.innerHTML = `<i data-lucide="${state.threePlaying ? 'pause' : 'play'}"></i>${state.threePlaying ? '暂停' : '播放'}`; refreshIcons(); break;
    case 'three-reset': threeDemo?.reset(); toast('已恢复初始视角'); break;
    case 'select-image': state.selectedImage = Number(button.dataset.index); render(); break;
    case 'download-image': {
      const anchor = document.createElement('a'); anchor.href = studioImages[state.selectedImage]; anchor.target = '_blank'; anchor.rel = 'noreferrer'; anchor.click(); break;
    }
    case 'view-generated': openPromptModal(currentGenerated()); break;
    case 'copy-modal': copyText(modalRoot.querySelector('.modal-prompt')?.textContent || ''); break;
    case 'save-work': saveWork(); break;
    case 'gallery-filter': state.galleryFilter = type; render(); break;
    case 'open-work': {
      const work = state.works.find((item) => item.id === id);
      if (work) { state.studioType = work.type; state.view = 'studio'; render(); }
      break;
    }
    case 'trace-work': {
      const work = state.works.find((item) => item.id === id);
      const prompt = state.prompts.find((item) => item.id === work?.promptId);
      openPromptModal(prompt?.content || currentGenerated(), work?.title || '作品关联提示词'); break;
    }
    case 'collect-mode': state.collectMode = button.dataset.mode; openCollectModal(); break;
    case 'parse-link': {
      const input = document.querySelector('#collect-url');
      if (!input?.value.trim()) { toast('请先输入来源链接', 'info'); input?.focus(); break; }
      button.disabled = true; button.innerHTML = '<i data-lucide="loader" class="spin"></i>整理中'; refreshIcons();
      setTimeout(() => {
        const text = document.querySelector('#collect-text');
        const title = document.querySelector('#collect-title');
        if (text) text.value = '你是一位注重细节的数字创作者。请围绕【主题】构建一件具有清晰视觉方向的作品。\n\n先定义核心意象，再说明构图、材质、色彩与交互。保留充分留白，避免常见模板与无意义装饰。输出完整方案，不附加解释。';
        if (title) title.value = '从链接整理的新微光';
        const source = document.querySelector('#collect-source');
        if (source) { try { source.value = new URL(input.value).hostname; } catch { source.value = input.value; } }
        document.querySelector('#preview-title').textContent = title?.value || '未命名的微光';
        document.querySelector('#preview-text').textContent = text?.value.slice(0, 160) || '';
        button.disabled = false; button.textContent = '重新整理';
        toast('链接内容已整理为可编辑示例');
      }, 800); break;
    }
    case 'save-collect': {
      const text = document.querySelector('#collect-text')?.value.trim();
      if (!text) { toast('请先粘贴或整理提示词内容', 'info'); document.querySelector('#collect-text')?.focus(); break; }
      const newId = `p-${Date.now()}`;
      const title = document.querySelector('#collect-title')?.value.trim() || '未命名的微光';
      const promptType = document.querySelector('#collect-type')?.value || 'Web';
      const source = document.querySelector('#collect-source')?.value.trim() || 'manual.local';
      state.prompts.unshift({ id: newId, number: String(state.prompts.length + 1).padStart(3, '0'), title, type: promptType, source, url: source.startsWith('http') ? source : '#', tags: (document.querySelector('#collect-tags')?.value || '收藏').split(/[,，]/).map((item) => item.trim()).filter(Boolean).slice(0, 4), favorite: false, date: '刚刚', excerpt: text.slice(0, 88), content: text, variables: ['主题', '风格', '输出格式'], note: '' });
      state.selectedPromptId = newId; state.view = 'library'; persist(); closeModal(); render(); toast('新微光已收进样本库'); break;
    }
    case 'reset-data':
      localStorage.removeItem('prism-prompts'); localStorage.removeItem('prism-works'); localStorage.removeItem('prism-learning'); location.reload(); break;
    default: break;
  }
});

document.addEventListener('input', (event) => {
  const target = event.target;
  if (target.id === 'global-search') {
    clearTimeout(searchTimer);
    const value = target.value;
    searchTimer = setTimeout(() => {
      state.query = value;
      state.view = 'library';
      render();
      const input = document.querySelector('#global-search');
      input?.focus(); input?.setSelectionRange(value.length, value.length);
    }, 160);
  }
  if (target.id === 'objective') state.objective = target.value;
  if (target.id === 'creativity') {
    state.creativity = Number(target.value);
    target.style.setProperty('--range', `${state.creativity}%`);
    document.querySelector('#creativity-output').textContent = `${state.creativity}%`;
  }
  if (target.id === 'generated-editor') state.versions[state.currentVersion] = target.value;
  if (target.id === 'collect-title') document.querySelector('#preview-title').textContent = target.value || '未命名的微光';
  if (target.id === 'collect-text') document.querySelector('#preview-text').textContent = target.value.slice(0, 180) || '输入提示词后，在这里确认整理结果。原始内容不会被自动覆盖。';
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'prompt-note') {
    const prompt = state.prompts.find((item) => item.id === event.target.dataset.id);
    if (prompt) { prompt.note = event.target.value; persist(); toast('个人笔记已保存'); }
  }
});

document.addEventListener('dragstart', (event) => {
  const card = event.target.closest('[data-drag-id]');
  if (card) { draggedId = card.dataset.dragId; card.classList.add('dragging'); event.dataTransfer.effectAllowed = 'move'; }
});
document.addEventListener('dragend', (event) => event.target.closest('[data-drag-id]')?.classList.remove('dragging'));
document.addEventListener('dragover', (event) => { if (event.target.closest('[data-drop-id]')) event.preventDefault(); });
document.addEventListener('drop', (event) => {
  const target = event.target.closest('[data-drop-id]');
  if (!target || !draggedId || target.dataset.dropId === draggedId) return;
  event.preventDefault();
  const ids = [...state.learningIds];
  const from = ids.indexOf(draggedId);
  const to = ids.indexOf(target.dataset.dropId);
  ids.splice(from, 1); ids.splice(to, 0, draggedId);
  state.learningIds = ids; draggedId = null; persist(); render(); toast('样本权重顺序已更新');
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); document.querySelector('#global-search')?.focus();
  }
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && state.view === 'workbench') {
    event.preventDefault(); generatePrompt();
  }
  if (event.key === 'Escape') closeModal();
});

render();
