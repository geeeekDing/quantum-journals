'use strict';

const el = Object.fromEntries([
  'journalFilters', 'topicGroup', 'topic', 'topicFilters', 'from', 'to', 'hasAbstract', 'search',
  'papers', 'statistics', 'listTitle', 'count', 'message', 'more', 'reset', 'totalPublished',
  'totalAccepted', 'updated', 'sourceList', 'feedLink', 'topicStatsLink',
].map(id => [id, document.getElementById(id)]));
const tabs = [...document.querySelectorAll('[data-status]')];
const labels = { published: '已发表', accepted: '已接收' };
const dateLabels = { publication: '发表', publisher_feed: '发表源', accepted_feed: '接收源', observed: '收录' };
const topicGroups = new Map(RESEARCH_GROUPS);
const params = new URLSearchParams(location.search);
const statsView = params.get('view') === 'topics';
const pageSize = 18;
let visible = pageSize;
let status = '';
let papers = [];
let journals = new Map();
let selectedJournal = '';

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
  for (const [group, children] of paper.researchTopics) {
    for (const tag of children.length ? children : [group]) topics.append(node('span', tag, 'tag'));
  }
  article.append(topics, abstractSection(paper));
  const links = node('div', '', 'links');
  links.append(external('出版社页面 ↗', paper.url), external('状态来源 ↗', paper.evidence));
  if (paper.doi) links.append(external('DOI ↗', 'https://doi.org/' + paper.doi));
  article.append(links);
  return article;
}

function filterQuery() {
  return new URLSearchParams(Object.entries({
    status, journal: selectedJournal, from: el.from.value, to: el.to.value,
    q: el.search.value.trim(), abstract: el.hasAbstract.checked ? '1' : '',
  }).filter(([, value]) => value));
}

function viewURL(view, group = '', child = '') {
  const query = filterQuery();
  if (view) query.set('view', view);
  if (group) query.set('group', group);
  if (child) query.set('topic', child);
  return query.size ? '?' + query : './';
}

function updateChildOptions(selected = '') {
  const rules = topicGroups.get(el.topicGroup.value);
  const children = (rules || []).map(([name]) => new Option(name));
  el.topic.replaceChildren(new Option(rules ? '全部二级主题' : '先选择一级主题', ''), ...children);
  el.topic.disabled = !rules;
  if (children.some(option => option.value === selected)) el.topic.value = selected;
}

function renderStatistics(matches) {
  const coverage = matches.filter(paper => paper.researchTopics.size).length;
  el.count.textContent = matches.length + ' 篇 · ' + coverage + ' 篇已分类';
  const panels = RESEARCH_GROUPS.map(([group, rules]) => {
    const groupPapers = matches.filter(paper => paper.researchTopics.has(group));
    const panel = node('section', '', 'stat-group');
    const header = node('div', '', 'stat-heading');
    header.append(node('h3', group), statLink(group + ' · ' + groupPapers.length + ' 篇', groupPapers.length, group));
    const list = node('ul', '', 'stat-children');
    for (const [child] of rules) {
      const count = groupPapers.filter(paper => paper.researchTopics.get(group).includes(child)).length;
      const item = node('li');
      item.append(node('span', child), statLink(child + ' · ' + count + ' 篇', count, group, child));
      list.append(item);
    }
    const groupOnly = groupPapers.filter(paper => !paper.researchTopics.get(group).length).length;
    if (groupOnly) {
      const item = node('li');
      item.append(node('span', '仅一级主题'), node('span', groupOnly + ' 篇', 'stat-count'));
      list.append(item);
    }
    panel.append(header, list);
    return panel;
  });
  el.statistics.replaceChildren(node('p', '同一篇论文在每个主题内只计一次。', 'stat-note'), ...panels);
}

function statLink(label, count, group, child = '') {
  const link = node(count ? 'a' : 'span', count + ' 篇', 'stat-count');
  if (count) {
    link.href = viewURL('', group, child);
    link.setAttribute('aria-label', label);
  }
  return link;
}

function render() {
  const query = el.search.value.trim().toLowerCase();
  const start = el.from.value;
  const end = el.to.value;
  const wrongRange = Boolean(start && end && start > end);
  const matches = wrongRange ? [] : papers.filter(paper =>
    (!status || paper.status === status) &&
    (!selectedJournal || selectedJournal === paper.journal) &&
    (statsView || !el.topicGroup.value || paper.researchTopics.has(el.topicGroup.value)) &&
    (statsView || !el.topic.value || paper.researchTopics.get(el.topicGroup.value)?.includes(el.topic.value)) &&
    (!el.hasAbstract.checked || paper.abstract) &&
    (!start || paper.date >= start) && (!end || paper.date <= end) &&
    (!query || paper.searchable.includes(query))
  );
  el.feedLink.href = viewURL('');
  el.topicStatsLink.href = viewURL('topics');
  if (statsView) {
    renderStatistics(matches);
  } else {
    el.count.textContent = matches.length + ' 篇';
    el.papers.replaceChildren(...matches.slice(0, visible).map(card));
    el.more.hidden = matches.length <= visible;
  }
  el.message.hidden = matches.length > 0;
  el.message.textContent = wrongRange ? '开始日期需要早于或等于结束日期。' : '没有符合筛选条件的论文。';
  if (!matches.length && !wrongRange && status === 'accepted' && selectedJournal && !journals.get(selectedJournal)?.accepted) {
    el.message.textContent = '本站暂无该期刊的接收数据，可切换到「已发表」查看。';
  } else if (!matches.length && !wrongRange && el.hasAbstract.checked) {
    el.message.textContent = '没有符合条件且有站内摘要的论文。取消「仅看站内有摘要的论文」可查看其他条目。';
  }
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

function selectJournal(id) {
  selectedJournal = id;
  for (const button of el.journalFilters.children) {
    button.setAttribute('aria-pressed', String(button.dataset.journal === id));
  }
}

function renderJournalFilters(catalog) {
  const options = [{ id: '', name: '全部期刊', short: '全部期刊' }, ...catalog];
  const buttons = options.map(journal => {
    const button = node('button', journal.short || journal.name, 'journal-filter');
    button.type = 'button';
    button.dataset.journal = journal.id;
    button.title = journal.name;
    button.addEventListener('click', () => {
      selectJournal(journal.id);
      resetPage();
    });
    return button;
  });
  el.journalFilters.replaceChildren(...buttons);
}

function renderSources(sources, health) {
  const rows = sources.map(source => {
    const item = node('li', source.name);
    const runs = health.filter(record => record.source === source.id);
    if (source.rss) item.append(external('发表源 ↗', source.rss));
    if (source.topic_rss) item.append(external('量子信息专题 ↗', source.topic_rss));
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
    renderJournalFilters(catalog);
    papers = snapshot.papers.filter(paper => journals.has(paper.journal)).map(paper => {
      const researchTopics = classifyPaper(paper);
      const searchable = [paper.title, ...paper.authors, ...(paper.tags || []),
        ...[...researchTopics].flatMap(([group, children]) => [group, ...children]),
        paper.doi, paper.abstract, paper.abstract_zh].join(' ').toLowerCase();
      return { ...paper, researchTopics, searchable };
    });
    for (const group of topicGroups.keys()) el.topicGroup.add(new Option(group));
    const requestedJournal = params.get('journal');
    selectJournal(journals.has(requestedJournal) ? requestedJournal : '');
    if (topicGroups.has(params.get('group'))) el.topicGroup.value = params.get('group');
    updateChildOptions(params.get('topic'));
    el.from.value = params.get('from') || '';
    el.to.value = params.get('to') || '';
    el.search.value = params.get('q') || '';
    el.hasAbstract.checked = params.get('abstract') === '1';
    if (statsView) {
      el.topicFilters.hidden = true;
      el.papers.hidden = true;
      el.statistics.hidden = false;
      el.listTitle.textContent = '主题统计';
      el.feedLink.removeAttribute('aria-current');
      el.topicStatsLink.setAttribute('aria-current', 'page');
    }
    el.totalPublished.textContent = papers.filter(paper => paper.status === 'published').length;
    el.totalAccepted.textContent = papers.filter(paper => paper.status === 'accepted').length;
    el.updated.textContent = snapshot.updated || '—';
    renderSources(catalog, snapshot.sources || []);
    for (const tab of tabs) tab.addEventListener('click', () => selectStatus(tab.dataset.status));
    el.topicGroup.addEventListener('change', () => {
      updateChildOptions();
      resetPage();
    });
    for (const field of [el.topic, el.from, el.to, el.hasAbstract]) field.addEventListener('change', resetPage);
    el.search.addEventListener('input', resetPage);
    el.more.addEventListener('click', () => { visible += pageSize; render(); });
    el.reset.addEventListener('click', () => {
      for (const field of [el.topicGroup, el.from, el.to, el.search]) field.value = '';
      selectJournal('');
      updateChildOptions();
      el.hasAbstract.checked = false;
      selectStatus('');
    });
    selectStatus(Object.hasOwn(labels, params.get('status')) ? params.get('status') : '');
  } catch (error) {
    el.message.textContent = '暂时无法读取期刊数据，请刷新重试。';
    console.error(error);
  }
}

start();
