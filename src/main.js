import './style.css';
import {
  createIcons, Library, Sparkles, Image as ImageIcon, Plus, Search, Command,
  ArrowUpRight, ExternalLink, Star, X, Check, Link, Copy, Save, Trash2,
  ChevronDown, Globe, Box, Play, Pause, RotateCcw, Code, SlidersHorizontal,
  Folder, Clock, Monitor, Tablet, Smartphone, Download, Eye, ArrowLeft,
  Wand, Layers, FileText, Settings, CheckCircle, MoreHorizontal, Maximize,
  Archive, BookOpen, Loader, Info, Grid, ListFilter, Pencil, Clipboard, Upload,
} from 'lucide';
import { starterPrompts, starterWorks } from './data.js';
import { createThreeDemo } from './three-demo.js';

const iconSet = {
  Library, Sparkles, Image: ImageIcon, Plus, Search, Command, ArrowUpRight,
  ExternalLink, Star, X, Check, Link, Copy, Save, Trash2, ChevronDown, Globe,
  Box, Play, Pause, RotateCcw, Code, SlidersHorizontal, Folder, Clock, Monitor,
  Tablet, Smartphone, Download, Eye, ArrowLeft, Wand, Layers, FileText, Settings,
  CheckCircle, MoreHorizontal, Maximize, Archive, BookOpen, Loader, Info, Grid,
  ListFilter, Pencil, Clipboard, Upload,
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
  draft: readLocal('prism-draft', ''),
  selectedPromptId: 'p-001',
  mobileDetailOpen: false,
  workbenchPanel: 'samples',
  query: '',
  typeFilter: '全部',
  tagFilter: '',
  sort: 'recent',
  sortOpen: false,
  galleryFilter: '全部',
  bulkSelected: new Set(),
  objective: '将自然观察、编辑设计与实时影像结合，创作一座可探索的数字暗房。',
  studioType: 'Web',
  device: 'desktop',
  threeWireframe: false,
  threePlaying: true,
  selectedImage: 0,
  userImage: '',
  collectMode: 'paste',
};

const studioImages = [
  'images/breathing-prism.jpg',
  'images/camellia-still-life.jpg',
  'images/mori-forest.jpg',
  'images/dust-galaxy.jpg',
];

const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast-root');
let threeDemo = null;
let draggedId = null;
let searchTimer = null;
let modalReturnFocus = null;

function persist() {
  localStorage.setItem('prism-prompts', JSON.stringify(state.prompts));
  localStorage.setItem('prism-works', JSON.stringify(state.works));
  localStorage.setItem('prism-learning', JSON.stringify(state.learningIds));
  localStorage.setItem('prism-draft', JSON.stringify(state.draft));
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

function draftText() {
  return document.querySelector('#new-prompt')?.value ?? state.draft;
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('decode-failed'));
      image.onload = () => {
        const limit = 1600;
        const scale = Math.min(1, limit / Math.max(image.width, image.height));
        if (scale === 1 && file.size < 1.5 * 1024 * 1024) { resolve(reader.result); return; }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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

const sortLabels = { recent: '最近采集', favorite: '收藏优先', title: '标题排序' };

function filteredPrompts() {
  const query = state.query.trim().toLowerCase();
  const prompts = state.prompts.filter((prompt) => {
    const matchesType = state.typeFilter === '全部' || prompt.type === state.typeFilter;
    const matchesTag = !state.tagFilter || prompt.tags.includes(state.tagFilter);
    const haystack = `${prompt.title} ${prompt.excerpt} ${prompt.source} ${prompt.tags.join(' ')} ${prompt.content}`.toLowerCase();
    return matchesType && matchesTag && (!query || haystack.includes(query));
  });
  if (state.sort === 'favorite') {
    return [...prompts].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.number.localeCompare(b.number));
  }
  if (state.sort === 'title') {
    return [...prompts].sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
  }
  return prompts;
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
    <section class="detail-panel" aria-label="提示词详情">
      <div class="detail-topline"><div class="detail-meta"><button class="icon-button detail-back" data-action="close-prompt-detail" aria-label="返回提示词列表"><i data-lucide="arrow-left"></i></button><span>SAMPLE / ${prompt.number}</span></div><div>
        <button class="icon-button ${prompt.favorite ? 'is-favorite' : ''}" data-action="toggle-favorite" data-id="${prompt.id}" aria-label="收藏"><i data-lucide="star"></i></button>
        <button class="icon-button" data-action="download-source" data-id="${prompt.id}" aria-label="导出原始提示词"><i data-lucide="download"></i></button>
        <button class="icon-button is-danger" data-action="delete-prompt" data-id="${prompt.id}" aria-label="删除这条提示词"><i data-lucide="trash-2"></i></button>
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
    <div class="view library-view ${state.mobileDetailOpen ? 'mobile-detail-open' : ''}">
      <section class="page-intro">
        <div><div class="eyebrow"><span></span>COLLECTION / 样本库</div><h1>把灵感，收进<span class="serif-accent">微光。</span></h1><p>收集那些让你驻足的表达，拆解它们，再长成自己的语言。</p></div>
        <div class="collection-count"><strong>${String(state.prompts.length).padStart(2, '0')}</strong><span>条提示词样本<br>持续生长中</span></div>
      </section>
      <div class="filter-bar">
        <div class="segmented type-filter">${['全部', 'Web', 'Three.js', '图片'].map((type) => `<button class="${state.typeFilter === type ? 'active' : ''}" data-action="filter-type" data-type="${type}">${type}</button>`).join('')}</div>
        <div class="active-filter">${state.tagFilter ? `<button data-action="filter-tag" data-tag=""><i data-lucide="list-filter"></i># ${state.tagFilter}<i data-lucide="x"></i></button>` : '<span><i data-lucide="list-filter"></i>按媒介筛选样本</span>'}</div>
        <div class="sort-wrap"><button class="sort-button" data-action="toggle-sort" aria-expanded="${state.sortOpen}" aria-haspopup="menu">${sortLabels[state.sort]}<i data-lucide="chevron-down"></i></button>${state.sortOpen ? `<div class="sort-menu" role="menu">${Object.entries(sortLabels).map(([key, label]) => `<button role="menuitem" class="${state.sort === key ? 'active' : ''}" data-action="set-sort" data-sort="${key}">${label}${state.sort === key ? '<i data-lucide="check"></i>' : ''}</button>`).join('')}</div>` : ''}</div>
      </div>
      <div class="library-grid">
        <section class="prompt-list" aria-label="提示词列表">
          <div class="list-caption"><span>${prompts.length} SAMPLES</span><span>多选以建立学习集</span></div>
          ${prompts.length ? prompts.map(renderPromptCard).join('') : `<div class="empty-search"><i data-lucide="search"></i><h3>没有找到这束微光</h3><p>${state.prompts.length ? '试试其他关键词或清除筛选。' : '样本库已清空，可以恢复初始示例重新开始。'}</p>${state.prompts.length ? '<button class="text-button" data-action="clear-filters">清除所有筛选</button>' : '<button class="text-button" data-action="reset-data">恢复初始示例</button>'}</div>`}
        </section>
        ${renderPromptDetail(active)}
      </div>
      ${state.bulkSelected.size ? `<div class="bulk-bar"><span class="bulk-count">${state.bulkSelected.size}</span><strong>条样本已选择</strong><button class="text-button" data-action="clear-bulk">取消</button><button class="button danger" data-action="delete-bulk"><i data-lucide="trash-2"></i><span>删除所选</span></button><button class="button primary" data-action="bulk-learning">建立学习集<i data-lucide="arrow-up-right"></i></button></div>` : ''}
    </div>`;
}

function renderLearningSamples() {
  const samples = state.learningIds.map((id) => state.prompts.find((prompt) => prompt.id === id)).filter(Boolean);
  if (!samples.length) {
    return `<div class="empty-samples"><span class="empty-prism">△</span><h3>学习集还是空的</h3><p>从样本库挑选 2–4 条提示词，对照它们的写法，打磨你自己的表达。</p><button class="button secondary" data-view="library"><i data-lucide="plus"></i>选择样本</button></div>`;
  }
  return samples.map((prompt, index) => `
    <article class="learning-sample" draggable="true" data-drag-id="${prompt.id}" data-drop-id="${prompt.id}">
      <div class="sample-order">${String(index + 1).padStart(2, '0')}<span>↕</span></div>
      <div><span class="mini-type"><i data-lucide="${typeIcon(prompt.type)}"></i>${prompt.type}</span><h4>${escapeHTML(prompt.title)}</h4><p>${escapeHTML(prompt.tags.slice(0, 2).join(' · '))}</p></div>
      <button class="icon-button" data-action="remove-learning" data-id="${prompt.id}" aria-label="移除样本"><i data-lucide="x"></i></button>
    </article>`).join('');
}

function renderSampleCompare() {
  const samples = state.learningIds.map((id) => state.prompts.find((prompt) => prompt.id === id)).filter(Boolean);
  if (!samples.length) {
    return '<div class="analysis-placeholder"><i data-lucide="layers"></i><p>选择样本后，这里会并排展示它们的原始提示词，方便对照，或一键复制到你自己的 AI。</p></div>';
  }
  return `
    <div class="compare-actions"><button class="button secondary" data-action="copy-samples"><i data-lucide="copy"></i>复制全部样本</button><span>把样本和你的 Brief 一起发给你常用的 AI</span></div>
    <div class="analysis-groups">${samples.map((prompt) => `
      <article class="analysis-group expanded">
        <div class="analysis-head compare-head"><span>S/${prompt.number}</span><strong>${escapeHTML(prompt.title)}</strong><button class="icon-button" data-action="copy-text" data-id="${prompt.id}" aria-label="复制这条提示词"><i data-lucide="copy"></i></button></div>
        <div class="analysis-body"><p class="compare-text">${escapeHTML(prompt.content)}</p></div>
      </article>`).join('')}</div>`;
}

function renderWorkbench() {
  const sampleCount = state.learningIds.length;
  const hasDraft = !!state.draft.trim();
  return `
    <div class="view workbench-view">
      <section class="page-intro compact">
        <div><div class="eyebrow"><span></span>LEARNING LAB / 学习工作台</div><h1>从样本，到你的<span class="serif-accent">表达。</span></h1><p>对照样本的写法，用你自己的 AI 打磨提示词，再把成果收进样本库。应用本身不生成内容。</p></div>
        <button class="button ghost" data-action="download-generated" ${hasDraft ? '' : 'disabled'}><i data-lucide="download"></i>导出 .md</button>
      </section>
      <div class="process-line" aria-label="学习流程">
        ${[['01', '选择样本', sampleCount > 0], ['02', '对照样本', sampleCount > 0], ['03', '填写新提示词', hasDraft]].map(([number, label, active], index) => `<div class="process-step ${active ? 'active' : ''}"><span>${number}</span><strong>${label}</strong>${index < 2 ? '<svg viewBox="0 0 100 12" preserveAspectRatio="none"><path d="M0 6h42l8-5 8 10 8-5h34"/></svg>' : ''}</div>`).join('')}
      </div>
      <div class="mobile-workbench-tabs" role="tablist" aria-label="学习步骤">
        ${[['samples', '选择样本'], ['analysis', '对照样本'], ['generator', '新提示词']].map(([panel, label], index) => `<button id="tab-${panel}" role="tab" aria-selected="${state.workbenchPanel === panel}" aria-controls="panel-${panel}" class="${state.workbenchPanel === panel ? 'active' : ''}" data-action="workbench-panel" data-panel="${panel}">0${index + 1} ${label}</button>`).join('')}
      </div>
      <div class="workbench-grid">
        <section id="panel-samples" class="bench-column samples-column ${state.workbenchPanel === 'samples' ? 'mobile-active' : ''}" role="tabpanel" aria-labelledby="tab-samples">
          <div class="column-heading"><div><span>01 / INPUT</span><h2>学习集 <em>${sampleCount}</em></h2></div><button class="icon-button" data-view="library" aria-label="添加样本"><i data-lucide="plus"></i></button></div>
          <div class="learning-samples">${renderLearningSamples()}</div>
          ${sampleCount ? '<p class="drag-hint"><i data-lucide="more-horizontal"></i>拖拽调整参考顺序，越靠前越优先对照</p>' : ''}
        </section>
        <section id="panel-analysis" class="bench-column analysis-column ${state.workbenchPanel === 'analysis' ? 'mobile-active' : ''}" role="tabpanel" aria-labelledby="tab-analysis">
          <div class="column-heading"><div><span>02 / COMPARE</span><h2>样本对照</h2></div></div>
          ${renderSampleCompare()}
        </section>
        <section id="panel-generator" class="bench-column generator-column ${state.workbenchPanel === 'generator' ? 'mobile-active' : ''}" role="tabpanel" aria-labelledby="tab-generator">
          <div class="column-heading"><div><span>03 / EDIT</span><h2>你的新提示词</h2></div></div>
          <label class="objective-label" for="objective">这次想创作什么？（可选，写给自己的 Brief）</label>
          <textarea id="objective" class="objective-input" rows="3" placeholder="描述目标、主题或想探索的方向…">${escapeHTML(state.objective)}</textarea>
          <div class="generated-wrap">
            <div class="editor-top"><span><i data-lucide="file-text"></i>AI 帮你打磨后的提示词 · 可直接编辑</span><button data-action="copy-generated"><i data-lucide="copy"></i>复制</button></div>
            <textarea id="new-prompt" class="generated-editor" spellcheck="false" placeholder="把样本和 Brief 发给你常用的 AI（ChatGPT、Claude、豆包…），把返回的提示词粘贴到这里。">${escapeHTML(state.draft)}</textarea>
          </div>
          <div class="generator-actions"><button class="button secondary" data-action="save-generated" ${hasDraft ? '' : 'disabled'}><i data-lucide="save"></i>收进样本库</button><button class="button light" data-action="open-demo-options" ${hasDraft ? '' : 'disabled'}>制作作品演示<i data-lucide="arrow-up-right"></i></button></div>
          <p class="optional-note"><i data-lucide="info"></i>应用不生成内容，成果由你粘贴或上传。⌘ + ↵ 可快速收进样本库。</p>
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
      <figure class="main-artwork"><img src="${studioImages[state.selectedImage]}" alt="示例影像 ${state.selectedImage + 1}"><figcaption><span>示例影像 ${String(state.selectedImage + 1).padStart(2, '0')} / 04</span><div><button data-action="upload-result"><i data-lucide="upload"></i>换成我的影像</button><button data-action="download-image"><i data-lucide="download"></i>保存影像</button></div></figcaption></figure>
      <div class="image-candidates">${studioImages.map((image, index) => `<button class="${state.selectedImage === index ? 'active' : ''}" data-action="select-image" data-index="${index}"><img src="${image}" alt="示例影像 ${index + 1}"><span>0${index + 1}</span></button>`).join('')}</div>
    </div>`;
}

function renderUserResultStage() {
  return `
    <div class="user-result-stage">
      <img src="${state.userImage}" alt="我上传的成果影像">
      <div class="user-result-bar"><span><i data-lucide="check-circle"></i>我的成果 · 已替代演示画布</span><button class="button ghost" data-action="clear-user-image"><i data-lucide="x"></i>移除</button></div>
    </div>`;
}

function renderStudio() {
  const typeLabels = { Web: '响应式网页', 'Three.js': '实时三维场景', '图片': '艺术影像' };
  const learningSamples = state.learningIds.map((id) => state.prompts.find((prompt) => prompt.id === id)).filter(Boolean);
  return `
    <div class="view studio-view">
      <section class="studio-heading"><button class="back-button" data-view="workbench"><i data-lucide="arrow-left"></i>返回提示词</button><div><div class="eyebrow"><span></span>OUTPUT STUDIO / 作品演示</div><h1>让提示词，<span class="serif-accent">成为作品。</span></h1></div><span class="optional-pill"><i data-lucide="info"></i>DEMO / 演示画布 · 不生成作品</span></section>
      <div class="studio-typebar"><div class="segmented">${['Web', 'Three.js', '图片'].map((type) => `<button class="${state.studioType === type ? 'active' : ''}" data-action="studio-type" data-type="${type}"><i data-lucide="${typeIcon(type)}"></i>${type}</button>`).join('')}</div><div class="studio-tools">${state.studioType === 'Web' ? `<button class="${state.device === 'desktop' ? 'active' : ''}" data-action="device" data-device="desktop" aria-label="桌面预览"><i data-lucide="monitor"></i></button><button class="${state.device === 'tablet' ? 'active' : ''}" data-action="device" data-device="tablet" aria-label="平板预览"><i data-lucide="tablet"></i></button><button class="${state.device === 'mobile' ? 'active' : ''}" data-action="device" data-device="mobile" aria-label="手机预览"><i data-lucide="smartphone"></i></button>` : ''}<button data-action="view-generated"><i data-lucide="file-text"></i>查看所用提示词</button><button data-action="upload-result"><i data-lucide="upload"></i>上传我的成果</button></div></div>
      <div class="studio-layout">
        <section class="preview-panel">
          <div class="preview-topline"><span>${state.userImage ? 'MY RESULT / 我的成果' : `DEMO CANVAS / ${typeLabels[state.studioType]} · 非生成结果`}</span><div><i></i>${state.userImage ? '已使用你上传的成果' : '演示画布'}</div></div>
          ${state.userImage ? renderUserResultStage() : state.studioType === 'Web' ? renderWebDemo() : state.studioType === 'Three.js' ? renderThreeDemo() : renderImageDemo()}
        </section>
        <aside class="output-inspector">
          <div class="inspector-heading"><span>OUTPUT / 001</span><h2>微光档案</h2><p>由你粘贴保存的提示词驱动<br>${typeLabels[state.studioType]} · ${state.userImage ? '我的成果' : '演示画布'}</p></div>
          <div class="inspector-block"><span class="inspector-label">作品参数</span><dl>${state.studioType === 'Web' ? '<div><dt>画幅</dt><dd>1440 × 960</dd></div><div><dt>结构</dt><dd>4 个章节</dd></div><div><dt>交互</dt><dd>滚动显影</dd></div>' : state.studioType === 'Three.js' ? '<div><dt>几何体</dt><dd>Triangular</dd></div><div><dt>粒子</dt><dd>420 pts</dd></div><div><dt>帧率</dt><dd>60 fps</dd></div>' : '<div><dt>尺寸</dt><dd>2048 × 1536</dd></div><div><dt>风格</dt><dd>当代静物</dd></div><div><dt>种子</dt><dd>829041</dd></div>'}</dl></div>
          <div class="inspector-block"><span class="inspector-label">参考样本</span>${learningSamples.length ? `<div class="refraction-map">${learningSamples.map((prompt) => `<span>S/${prompt.number}</span>`).join('<i></i>')}<b>△</b></div>` : '<p class="inspector-note">尚未选择参考样本，可到学习工作台添加。</p>'}<p class="inspector-note">${state.userImage ? '画布中是你的上传成果，保存后将收入作品展。' : '演示画布仅展示媒介效果，不代表生成结果；可上传你自己的成果替代它。'}</p></div>
          <button class="prompt-trace" data-action="view-generated"><i data-lucide="code"></i><span>查看完整提示词<small>你粘贴保存的提示词</small></span><i data-lucide="arrow-up-right"></i></button>
          <div class="inspector-actions"><button class="button secondary" data-view="workbench">继续编辑</button><button class="button primary" data-action="save-work"><i data-lucide="save"></i>收进作品展</button></div>
        </aside>
      </div>
      <input type="file" id="result-upload" accept="image/*" hidden>
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
            <button class="work-visual" data-action="open-work" data-id="${work.id}"><img src="${work.image}" alt="${escapeHTML(work.title)}" loading="lazy"><span class="work-open"><i data-lucide="maximize"></i>查看作品</span><span class="work-type"><i data-lucide="${typeIcon(work.type)}"></i>${work.type}${work.image.startsWith('data:') ? ' · 我的成果' : ''}</span></button>
            <div class="work-meta"><div><span>W/${String(index + 1).padStart(3, '0')}</span><h3>${escapeHTML(work.title)}</h3></div><div class="work-meta-side"><time>${escapeHTML(work.date)}</time><button class="icon-button is-danger work-delete" data-action="delete-work" data-id="${work.id}" aria-label="删除作品 ${escapeHTML(work.title)}"><i data-lucide="trash-2"></i></button></div></div>
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
  if (!modalRoot.firstChild) return;
  modalRoot.innerHTML = '';
  document.body.style.overflow = '';
  modalReturnFocus?.focus();
  modalReturnFocus = null;
}

function openModal(content, className = '') {
  if (!modalRoot.firstChild) modalReturnFocus = document.activeElement;
  document.body.style.overflow = 'hidden';
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal ${className}" role="dialog" aria-modal="true">${content}</section></div>`;
  const heading = modalRoot.querySelector('.modal-heading h2');
  if (heading) {
    heading.id = 'modal-title';
    modalRoot.querySelector('.modal')?.setAttribute('aria-labelledby', 'modal-title');
  }
  refreshIcons();
  requestAnimationFrame(() => (modalRoot.querySelector('input, textarea') || modalRoot.querySelector('button, summary'))?.focus());
}

function openCollectModal() {
  openModal(`
    <div class="modal-heading"><div><span>NEW SAMPLE / 采集微光</span><h2>把好的表达，留下来。</h2></div><button class="icon-button" data-action="close-modal" aria-label="关闭"><i data-lucide="x"></i></button></div>
    <div class="collect-tabs"><button class="${state.collectMode === 'paste' ? 'active' : ''}" data-action="collect-mode" data-mode="paste"><i data-lucide="clipboard"></i>粘贴提示词</button><button class="${state.collectMode === 'link' ? 'active' : ''}" data-action="collect-mode" data-mode="link"><i data-lucide="link"></i>从链接记录</button></div>
    <div class="collect-layout">
      <div class="collect-form">
        ${state.collectMode === 'link' ? `<label>来源链接<div class="url-input"><input id="collect-url" type="url" placeholder="https://example.com/prompt"><button class="button secondary" data-action="parse-link">记录来源</button></div><small>链接仅作为来源记录，不会抓取网页内容，请手动粘贴提示词。</small></label>` : ''}
        <label>标题<input id="collect-title" type="text" placeholder="给这条提示词一个名字"></label>
        <label>原始提示词<textarea id="collect-text" rows="10" placeholder="粘贴你收集到的完整提示词…"></textarea></label>
        <div class="form-row"><label>作品类型<select id="collect-type"><option>Web</option><option>Three.js</option><option>图片</option></select></label><label>标签<input id="collect-tags" type="text" placeholder="结构, 视觉, 动效"></label></div>
        <label>来源（可选）<input id="collect-source" type="text" placeholder="例如：awwwards.com"></label>
      </div>
      <details class="collect-preview" ${window.matchMedia('(max-width: 720px)').matches ? '' : 'open'}><summary class="preview-label"><i data-lucide="sparkles"></i>保存预览<i class="preview-chevron" data-lucide="chevron-down"></i></summary><div class="preview-sample"><span>S / NEW</span><h3 id="preview-title">未命名的微光</h3><p id="preview-text">输入提示词后，在这里确认将要保存的内容。原始内容不会被自动修改。</p><div class="preview-suggestions"><span>保存前自查</span><em>保留原始结构</em><em>识别可复用变量</em><em>补充个人笔记</em></div></div><p class="privacy-note"><i data-lucide="check"></i>仅保存在当前浏览器</p></details>
    </div>
    <div class="modal-actions"><button class="button ghost" data-action="close-modal">取消</button><button class="button primary" data-action="save-collect"><i data-lucide="plus"></i>收进样本库</button></div>
  `, 'collect-modal');
}

function openDemoOptions() {
  openModal(`
    <div class="modal-heading"><div><span>OPTIONAL OUTPUT / 可选演示</span><h2>想让这束光，落在哪里？</h2><p>选择一种媒介进入演示画布；应用不生成作品，你可以后续上传自己的成果。</p></div><button class="icon-button" data-action="close-modal" aria-label="关闭"><i data-lucide="x"></i></button></div>
    <div class="demo-options">${[
      ['Web', 'globe', '响应式网页', '在浏览器画框中查看桌面、平板与手机效果。'],
      ['Three.js', 'box', '实时三维作品', '旋转晶体、调整线框并探索实时光线。'],
      ['图片', 'image', '艺术影像', '比较四幅示例影像，或换成你自己生成的成果。'],
    ].map(([type, icon, title, description], index) => `<button data-action="choose-demo" data-type="${type}"><span>0${index + 1}</span><i data-lucide="${icon}"></i><h3>${title}</h3><p>${description}</p><em>进入画布<i data-lucide="arrow-up-right"></i></em></button>`).join('')}</div>
    <div class="modal-actions"><button class="text-button" data-action="close-modal">稍后再做</button></div>
  `, 'demo-options-modal');
}

function openPromptModal(text, title = '本次创作所用提示词') {
  openModal(`
    <div class="modal-heading"><div><span>PROMPT TRACE / 可追溯路径</span><h2>${escapeHTML(title)}</h2></div><button class="icon-button" data-action="close-modal" aria-label="关闭"><i data-lucide="x"></i></button></div>
    <pre class="modal-prompt">${escapeHTML(text)}</pre>
    <div class="modal-actions"><span class="trace-note"><i data-lucide="check-circle"></i>与当前作品版本关联</span><button class="button primary" data-action="copy-modal"><i data-lucide="copy"></i>复制提示词</button></div>
  `, 'prompt-modal');
}

function openSettings() {
  openModal(`
    <div class="modal-heading"><div><span>LOCAL SPACE / 空间设置</span><h2>你的微光，留在本地。</h2></div><button class="icon-button" data-action="close-modal" aria-label="关闭"><i data-lucide="x"></i></button></div>
    <div class="settings-content"><div><i data-lucide="archive"></i><span><strong>${state.prompts.length} 条提示词 · ${state.works.length} 件作品</strong><p>所有采集、学习和作品数据仅存储在当前浏览器的 localStorage 中。</p></span></div><div><i data-lucide="info"></i><span><strong>不调用 AI 服务</strong><p>提示词由你粘贴、成果由你上传，应用不向任何模型服务商发送内容。</p></span></div></div>
    <div class="modal-actions"><button class="button danger" data-action="reset-data"><i data-lucide="trash-2"></i>恢复初始示例</button><button class="button primary" data-action="close-modal">完成</button></div>
  `, 'settings-modal');
}

function openDeletePromptModal(id) {
  const prompt = state.prompts.find((item) => item.id === id);
  if (!prompt) return;
  openModal(`
    <div class="modal-heading"><div><span>CONFIRM / 确认删除</span><h2>删除这条提示词？</h2><p>「${escapeHTML(prompt.title)}」删除后无法恢复，学习集中的相关样本也会一并移除。</p></div><button class="icon-button" data-action="close-modal" aria-label="关闭"><i data-lucide="x"></i></button></div>
    <div class="modal-actions"><button class="button secondary" data-action="close-modal">取消</button><button class="button danger" data-action="confirm-delete-prompt" data-id="${id}"><i data-lucide="trash-2"></i>确认删除</button></div>
  `, 'confirm-modal');
}

function openDeleteBulkModal() {
  const count = state.bulkSelected.size;
  if (!count) return;
  openModal(`
    <div class="modal-heading"><div><span>CONFIRM / 确认删除</span><h2>删除所选的 ${count} 条提示词？</h2><p>删除后无法恢复，学习集中的相关样本也会一并移除。</p></div><button class="icon-button" data-action="close-modal" aria-label="关闭"><i data-lucide="x"></i></button></div>
    <div class="modal-actions"><button class="button secondary" data-action="close-modal">取消</button><button class="button danger" data-action="confirm-delete-bulk"><i data-lucide="trash-2"></i>全部删除</button></div>
  `, 'confirm-modal');
}

function openDeleteWorkModal(id) {
  const work = state.works.find((item) => item.id === id);
  if (!work) return;
  openModal(`
    <div class="modal-heading"><div><span>CONFIRM / 确认删除</span><h2>删除这件作品？</h2><p>「${escapeHTML(work.title)}」删除后无法恢复，其留存的生成提示词记录也会一并移除。</p></div><button class="icon-button" data-action="close-modal" aria-label="关闭"><i data-lucide="x"></i></button></div>
    <div class="modal-actions"><button class="button secondary" data-action="close-modal">取消</button><button class="button danger" data-action="confirm-delete-work" data-id="${id}"><i data-lucide="trash-2"></i>确认删除</button></div>
  `, 'confirm-modal');
}

function deletePrompts(ids) {
  const idSet = new Set(ids);
  state.prompts = state.prompts.filter((prompt) => !idSet.has(prompt.id));
  state.learningIds = state.learningIds.filter((item) => !idSet.has(item));
  idSet.forEach((id) => state.bulkSelected.delete(id));
  if (idSet.has(state.selectedPromptId)) state.selectedPromptId = state.prompts[0]?.id || null;
  persist();
}

function deleteWork(id) {
  state.works = state.works.filter((work) => work.id !== id);
  persist();
}

function saveGenerated() {
  const content = draftText().trim();
  if (!content) {
    toast('请先粘贴 AI 帮你打磨后的提示词', 'info');
    document.querySelector('#new-prompt')?.focus();
    return;
  }
  const id = `p-${Date.now()}`;
  const title = state.objective.trim() ? state.objective.trim().slice(0, 24) : content.split('\n')[0].slice(0, 24) || '未命名的新提示词';
  const prompt = {
    id, number: String(state.prompts.length + 1).padStart(3, '0'), title,
    type: 'Web', source: 'prism.local', url: '#', tags: ['个人创作', '学习集'],
    favorite: false, date: '刚刚', excerpt: content.slice(0, 88).replaceAll('\n', ' '),
    content, variables: ['核心意象', '创作目标', '媒介', '视觉方向'], note: '由学习工作台粘贴保存，可继续补充笔记。',
  };
  state.prompts.unshift(prompt);
  state.selectedPromptId = id;
  state.draft = '';
  persist();
  closeModal();
  render();
  toast('新提示词已收进样本库');
}

function saveWork() {
  const image = state.userImage || (state.studioType === 'Web' ? starterWorks[0].image : state.studioType === 'Three.js' ? starterWorks[1].image : studioImages[state.selectedImage]);
  const title = state.userImage ? '我的成果 · 自传影像'
    : state.studioType === 'Web' ? '微光档案 · 数字暗房'
    : state.studioType === 'Three.js' ? 'PRISM · 折射实验'
    : `微光影像 · 0${state.selectedImage + 1}`;
  state.works.unshift({
    id: `w-${Date.now()}`,
    title,
    type: state.studioType,
    date: '刚刚',
    promptId: state.selectedPromptId,
    promptContent: draftText(),
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
  state.mobileDetailOpen = false;
  render();
}

document.addEventListener('click', (event) => {
  if (state.sortOpen && !event.target.closest('.sort-wrap')) {
    state.sortOpen = false;
    document.querySelector('.sort-menu')?.remove();
    document.querySelector('.sort-button')?.setAttribute('aria-expanded', 'false');
  }
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) {
    state.view = viewButton.dataset.view;
    state.mobileDetailOpen = false;
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
    case 'select-prompt':
      state.selectedPromptId = id; state.mobileDetailOpen = true; render();
      if (window.matchMedia('(max-width: 720px)').matches) window.scrollTo(0, 0);
      break;
    case 'close-prompt-detail':
      state.mobileDetailOpen = false; render();
      if (window.matchMedia('(max-width: 720px)').matches) window.scrollTo(0, 0);
      break;
    case 'workbench-panel':
      state.workbenchPanel = button.dataset.panel; render();
      if (window.matchMedia('(max-width: 720px)').matches) window.scrollTo(0, 0);
      break;
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
    case 'filter-type': state.typeFilter = type; state.mobileDetailOpen = false; render(); break;
    case 'filter-tag': state.tagFilter = tag; state.view = 'library'; state.mobileDetailOpen = false; render(); break;
    case 'toggle-sort': state.sortOpen = !state.sortOpen; render(); break;
    case 'set-sort': state.sort = button.dataset.sort; state.sortOpen = false; render(); break;
    case 'clear-filters': clearFilters(); break;
    case 'copy-samples': {
      const samples = state.learningIds.map((item) => state.prompts.find((prompt) => prompt.id === item)).filter(Boolean);
      if (!samples.length) { toast('学习集还是空的', 'info'); break; }
      copyText(samples.map((prompt) => `【样本 S/${prompt.number}】${prompt.title}\n${prompt.content}`).join('\n\n———\n\n'));
      break;
    }
    case 'copy-generated': copyText(draftText()); break;
    case 'save-generated': saveGenerated(); break;
    case 'download-generated': downloadText('prism-新提示词.md', draftText()); break;
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
    case 'upload-result': document.querySelector('#result-upload')?.click(); break;
    case 'clear-user-image': state.userImage = ''; render(); toast('已移除上传的成果'); break;
    case 'download-image': {
      const source = state.userImage || studioImages[state.selectedImage];
      const anchor = document.createElement('a');
      anchor.href = source;
      anchor.download = source.startsWith('data:') ? 'prism-我的成果.jpg' : `prism-${source.split('/').pop()}`;
      anchor.click(); break;
    }
    case 'view-generated': {
      if (!draftText().trim()) { toast('还没有粘贴提示词，请先在学习工作台填写', 'info'); break; }
      openPromptModal(draftText(), '这件作品所用提示词'); break;
    }
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
      openPromptModal(work?.promptContent || prompt?.content || draftText(), work?.title || '作品关联提示词'); break;
    }
    case 'collect-mode': state.collectMode = button.dataset.mode; openCollectModal(); break;
    case 'parse-link': {
      const input = document.querySelector('#collect-url');
      if (!input?.value.trim()) { toast('请先输入来源链接', 'info'); input?.focus(); break; }
      const source = document.querySelector('#collect-source');
      if (source) { try { source.value = new URL(input.value).hostname; } catch { source.value = input.value; } }
      toast('已记录来源链接，请手动粘贴提示词内容');
      document.querySelector('#collect-text')?.focus();
      break;
    }
    case 'save-collect': {
      const text = document.querySelector('#collect-text')?.value.trim();
      if (!text) { toast('请先粘贴或整理提示词内容', 'info'); document.querySelector('#collect-text')?.focus(); break; }
      const newId = `p-${Date.now()}`;
      const title = document.querySelector('#collect-title')?.value.trim() || '未命名的微光';
      const promptType = document.querySelector('#collect-type')?.value || 'Web';
      const source = document.querySelector('#collect-source')?.value.trim() || 'manual.local';
      state.prompts.unshift({ id: newId, number: String(state.prompts.length + 1).padStart(3, '0'), title, type: promptType, source, url: source.startsWith('http') ? source : '#', tags: (document.querySelector('#collect-tags')?.value || '收藏').split(/[,，]/).map((item) => item.trim()).filter(Boolean).slice(0, 4), favorite: false, date: '刚刚', excerpt: text.slice(0, 88), content: text, variables: ['主题', '风格', '输出格式'], note: '' });
      state.selectedPromptId = newId; state.mobileDetailOpen = true; state.view = 'library'; persist(); closeModal(); render(); toast('新微光已收进样本库'); break;
    }
    case 'reset-data':
      localStorage.removeItem('prism-prompts'); localStorage.removeItem('prism-works'); localStorage.removeItem('prism-learning'); localStorage.removeItem('prism-draft'); location.reload(); break;
    case 'delete-prompt': openDeletePromptModal(id); break;
    case 'confirm-delete-prompt': { deletePrompts([id]); closeModal(); render(); toast('提示词已删除'); break; }
    case 'delete-bulk': openDeleteBulkModal(); break;
    case 'confirm-delete-bulk': {
      const count = state.bulkSelected.size;
      deletePrompts([...state.bulkSelected]);
      closeModal(); render(); toast(`已删除 ${count} 条提示词`); break;
    }
    case 'delete-work': openDeleteWorkModal(id); break;
    case 'confirm-delete-work': { deleteWork(id); closeModal(); render(); toast('作品已删除'); break; }
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
      state.mobileDetailOpen = false;
      render();
      const input = document.querySelector('#global-search');
      input?.focus(); input?.setSelectionRange(value.length, value.length);
    }, 160);
  }
  if (target.id === 'objective') state.objective = target.value;
  if (target.id === 'new-prompt') {
    state.draft = target.value;
    persist();
    const hasDraft = !!target.value.trim();
    document.querySelector('[data-action="save-generated"]')?.toggleAttribute('disabled', !hasDraft);
    document.querySelector('[data-action="open-demo-options"]')?.toggleAttribute('disabled', !hasDraft);
    document.querySelector('[data-action="download-generated"]')?.toggleAttribute('disabled', !hasDraft);
    document.querySelectorAll('.process-step')[2]?.classList.toggle('active', hasDraft);
  }
  if (target.id === 'collect-title') document.querySelector('#preview-title').textContent = target.value || '未命名的微光';
  if (target.id === 'collect-text') document.querySelector('#preview-text').textContent = target.value.slice(0, 180) || '输入提示词后，在这里确认整理结果。原始内容不会被自动覆盖。';
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'prompt-note') {
    const prompt = state.prompts.find((item) => item.id === event.target.dataset.id);
    if (prompt) { prompt.note = event.target.value; persist(); toast('个人笔记已保存'); }
  }
  if (event.target.id === 'result-upload') {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('请选择图片文件', 'info'); return; }
    readImageFile(file)
      .then((dataUrl) => { state.userImage = dataUrl; render(); toast('已上传我的成果，保存作品时将使用它'); })
      .catch(() => toast('图片读取失败，请换一张试试', 'info'));
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
  if (event.key === 'Escape' && state.sortOpen) {
    state.sortOpen = false;
    render();
    return;
  }
  if (event.key === 'Escape' && modalRoot.firstChild) {
    event.preventDefault();
    closeModal();
    return;
  }
  if (event.key === 'Tab' && modalRoot.firstChild) {
    const focusable = [...modalRoot.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, a[href], [tabindex]:not([tabindex="-1"])')]
      .filter((element) => element.getClientRects().length);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || !modalRoot.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !modalRoot.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
    return;
  }
  if (modalRoot.firstChild) return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); document.querySelector('#global-search')?.focus();
  }
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && state.view === 'workbench') {
    event.preventDefault(); saveGenerated();
  }
});

render();
