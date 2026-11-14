'use strict';

const el = Object.fromEntries([
  'journal', 'topic', 'from', 'to', 'hasAbstract', 'search', 'papers', 'count', 'message',
  'more', 'reset', 'totalPublished', 'totalAccepted', 'updated', 'sourceList',
].map(id => [id, document.getElementById(id)]));
const tabs = [...document.querySelectorAll('[data-status]')];
const labels = { published: '已发表', accepted: '已接收' };
const dateLabels = { publication: '发表', publisher_feed: '发表源', accepted_feed: '接收源', observed: '收录' };
const pageSize = 18;
let visible = pageSize;
let status = '';
let papers = [];
let journals = new Map();

function node(tag, text, classes = '') {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (classes) element.className = classes;
  return element;
}

function external(text, url) {
  const element = node('a', text, 'quiet');
  try {
    const parsed = new URL(url);
    if (['https:', 'http:'].includes(parsed.protocol)) {
      element.href = parsed.href;
      element.target = '_blank';
      element.rel = 'noopener noreferrer';
    }
  } catch {
    // Keep the label readable even if a source supplies a malformed URL.
  }
  return element;
}

function abstractSection(paper) {
  const section = node('section', '', 'abstract');
  if (!paper.abstract) {
    section.append(node('p', '摘要可在出版社页面查看。', 'note'));
    return section;
  }
  const original = node('p', paper.abstract);
  original.lang = 'en';
  if (paper.abstract_zh) {
    section.append(node('h4', '中文摘要'), node('p', paper.abstract_zh));
    const details = node('details');
    details.append(node('summary', '英文原摘要'), original);
    section.append(details);
  } else {
    section.append(node('h4', '英文摘要'), original);
  }
  const source = node('p', '', 'note');
  source.append('摘要来源 ', external('Crossref ↗', paper.doi ? 'https://api.crossref.org/works/' + paper.doi : paper.evidence),
    ' · ', external('Creative Commons 许可 ↗', paper.license));
  section.append(source);
  return section;
}

function card(paper) {
  const article = node('article', '', 'card');
  const meta = node('div', '', 'meta');
  const time = node('time', (dateLabels[paper.date_kind] || '日期') + ' ' + paper.date);
  time.dateTime = paper.date;
  meta.append(node('span', journals.get(paper.journal)?.short || paper.journal, 'journal'),
    node('span', labels[paper.status], 'badge ' + paper.status), time);
  const heading = node('h3');
  const title = external(paper.title, paper.url);
  title.className = '';
  title.lang = 'en';
  heading.append(title);
  article.append(meta, heading);
  if (paper.authors.length) {
    article.append(node('p', paper.authors.slice(0, 6).join(' · ') + (paper.authors.length > 6 ? ' 等' : ''), 'authors'));
  }
  const topics = node('div', '', 'topics');
  for (const tag of paper.tags) topics.append(node('span', tag, 'tag'));
  article.append(topics, abstractSection(paper));
  const links = node('div', '', 'links');
  links.append(external('出版社页面 ↗', paper.url), external('状态来源 ↗', paper.evidence));
  if (paper.doi) links.append(external('DOI ↗', 'https://doi.org/' + paper.doi));
  article.append(links);
  return article;
}

function render() {
  const query = el.search.value.trim().toLowerCase();
  const start = el.from.value;
  const end = el.to.value;
  const wrongRange = Boolean(start && end && start > end);
  const matches = wrongRange ? [] : papers.filter(paper =>
    (!status || paper.status === status) &&
    (!el.journal.value || el.journal.value === paper.journal) &&
    (!el.topic.value || paper.tags.includes(el.topic.value)) &&
    (!el.hasAbstract.checked || paper.abstract) &&
    (!start || paper.date >= start) && (!end || paper.date <= end) &&
    (!query || paper.searchable.includes(query))
  );
  el.count.textContent = matches.length + ' 篇';
  el.papers.replaceChildren(...matches.slice(0, visible).map(card));
  el.more.hidden = matches.length <= visible;
  el.message.hidden = matches.length > 0;
  el.message.textContent = wrongRange ? '开始日期需要早于或等于结束日期。' : '没有符合筛选条件的论文。';
}

function resetPage() {
  visible = pageSize;
  render();
}

function selectStatus(value) {
  status = value;
  for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.status === value));
  resetPage();
}

function renderSources(sources, health) {
  const rows = sources.map(source => {
    const item = node('li', source.name);
    const runs = health.filter(record => record.source === source.id);
    if (source.rss) item.append(external('发表源 ↗', source.rss));
    if (source.accepted) item.append(external('接收源 ↗', source.accepted));
    item.append(external('Crossref ↗', 'https://api.crossref.org/journals/' + source.issn));
    if (runs.some(run => !run.ok)) {
      item.append(runs.every(run => !run.ok) ? ' · 数据源本次未取得' : ' · 部分来源本次未取得');
    }
    return item;
  });
  el.sourceList.replaceChildren(...rows);
}

async function getJSON(url) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

async function start() {
  try {
    const [catalog, snapshot] = await Promise.all([getJSON('sources.json'), getJSON('data/papers.json')]);
    journals = new Map(catalog.map(journal => [journal.id, journal]));
    for (const journal of catalog) el.journal.add(new Option(journal.name, journal.id));
    papers = snapshot.papers.map(paper => ({ ...paper, searchable: [
      paper.title, ...paper.authors, ...paper.tags, paper.doi, paper.abstract, paper.abstract_zh,
    ].join(' ').toLowerCase() }));
    for (const tag of [...new Set(papers.flatMap(paper => paper.tags))].sort((a, b) => a.localeCompare(b, 'zh'))) {
      el.topic.add(new Option(tag));
    }
    el.totalPublished.textContent = papers.filter(paper => paper.status === 'published').length;
    el.totalAccepted.textContent = papers.filter(paper => paper.status === 'accepted').length;
    el.updated.textContent = snapshot.updated || '—';
    renderSources(catalog, snapshot.sources || []);
    for (const tab of tabs) tab.addEventListener('click', () => selectStatus(tab.dataset.status));
    for (const field of [el.journal, el.topic, el.from, el.to, el.hasAbstract]) field.addEventListener('change', resetPage);
    el.search.addEventListener('input', resetPage);
    el.more.addEventListener('click', () => { visible += pageSize; render(); });
    el.reset.addEventListener('click', () => {
      for (const field of [el.journal, el.topic, el.from, el.to, el.search]) field.value = '';
      el.hasAbstract.checked = false;
      selectStatus('');
    });
    render();
  } catch (error) {
    el.message.textContent = '暂时无法读取期刊数据，请刷新重试。';
    console.error(error);
  }
}

start();
