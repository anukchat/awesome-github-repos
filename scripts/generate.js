// Auto-generate an awesome list, category pages, and interactive web explorer of starred GitHub repositories
const fs = require('fs');
const path = require('path');
const { allowedCategories, classifyDeterministic } = require('./classifier');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Curated fallback descriptions for repositories whose GitHub description is blank
const fallbackDescriptions = {
  'withmarbleapp/os-taxonomy': 'An open, structured skill taxonomy of primary/elementary education decomposed into fine-grained learning goals.',
  'google-research/harness2': 'Recursive Agent Harnessing for an Open World — research and tooling for agent harnesses.',
  'extend-hq/jevbox': 'A full-stack, permission-aware document library with document tree inspection and parsed output sharing.',
  'microsoft/AutoSaddler': 'Automatic Harness Optimization with durable updates from agent execution traces.',
  'fayazara/headlesstools': 'Headless tools for AI agents, callable as MCP tools or REST APIs from coding agents.',
  'tobi/walgit': 'A lightweight single-binary git server backed directly by an object store with no database.',
  'andrewyng/openworker': 'Open-source autonomous digital worker and agent execution environment.',
  'andrewyng/context-hub': 'Curated, versioned documentation and context hub to prevent coding agents from hallucinating APIs.',
  'am-will/codex-skills': 'Curated skills and command workflows for OpenAI Codex and coding agents.',
  'accomplish-ai/coworker': 'Open-source autonomous coworker agent project.',
  'GAIR-NLP/Context-Engineering-2.0': 'Research and implementation for Context Engineering 2.0: The Context of Context Engineering.',
  'dotgeminidev/.gemini': 'Supercharge your developer workflow with custom AI commands and Gemini CLI configurations.',
  'anthropics/claude-agent-sdk-python': 'Official Python SDK for building and orchestrating agents with Claude.',
  'MagnIeeT/leadGenerationAgentADK': 'Interactive multi-step lead generation system built on an agentic development kit.',
  'imanoop7/Ollama-OCR': 'Optical Character Recognition (OCR) pipeline powered by local vision models via Ollama.',
  'composio-temp/grok-cli': 'Command-line interface and agentic toolset powered by Grok models.',
  'run-llama/llamacloud-mcp': 'Model Context Protocol (MCP) server integration for LlamaCloud indexes and pipelines.',
  'mem0ai/mem0-mcp': 'Model Context Protocol (MCP) server for Mem0 persistent agent memory.',
  'benjichat/langgraph-home-assistant': 'Multi-agent smart home assistant built with LangGraph for household automation.',
  'langchain-ai/open_deep_research': 'Open-source autonomous deep research agent built with LangGraph.',
  'finic-ai/doctran': 'Declarative document transformation and enrichment library powered by LLMs.',
  'andrewyng/translation-agent': 'Agentic machine translation using a multi-step reflection workflow.',
  'usri/Comprehensive-Document-Translator': 'Document translation pipeline for complex multi-page documents using Azure AI.',
  'Physical-Intelligence/openpi': 'Open-source foundation models and packages for robotics published by Physical Intelligence.',
  'LMSystems-ai/Github-Agent': 'Autonomous GitHub agent that clones, modifies, and pushes repository changes with human-in-the-loop review.',
  'philschmid/mcp-openai-gemini-llama-example': 'Reference examples for connecting Anthropic MCP servers with OpenAI, Google Gemini, and Llama models.',
  'deepseek-ai/DeepSeek-V3': 'Official repository for DeepSeek-V3, a strong Mixture-of-Experts (MoE) large language model.',
  'gotohuman/gotohuman-langgraph-lead-example': 'Human-in-the-loop AI lead qualification agent built with LangGraph and gotoHuman.',
  'aws-samples/multilingual-content-processing-with-amazon-bedrock': 'Multilingual document and content processing architecture powered by Amazon Bedrock.',
  'langchain-ai/agent-protocol': 'Framework-agnostic API specification for serving LLM agents in production.',
  'aws-samples/langgraph-agents-with-amazon-bedrock': 'Workshop and reference patterns for building LangGraph AI agents on Amazon Bedrock.',
  'huggingface/huggingface-llama-recipes': 'Fine-tuning, quantization, and inference recipes for Llama models using Hugging Face.',
  'graviraja/MLOps-Basics': 'Step-by-step hands-on series covering MLOps practices: training, tracking, packaging, and deployment.',
  'kturung/langgraph_streamlit_codeassistant': 'AI-powered Python and React code assistant built with LangGraph and Streamlit.',
  'business-science/cheatsheets': 'Collection of data science, machine learning, and Python/R cheatsheets.',
  'langchain-ai/opengpts': 'Open-source platform creating a customizable experience similar to OpenAI GPTs and Assistants API.',
  'togethercomputer/OpenChatKit': 'Open-source toolkit and base models for building specialized and general-purpose chat applications.',
  'chenfei-wu/TaskMatrix': 'Visual ChatGPT connecting conversational LLMs with visual foundation models.',
  'cpapadimitriou/Click-Through-Rate-prediction': 'Click-Through Rate (CTR) prediction pipeline using PySpark on large-scale advertising datasets.',
  'john-smilga/gatsby-strapi-portfolio-site-2020': 'Full-stack developer portfolio template built with Gatsby and Strapi CMS.',
  'landing-ai/ade-python': 'Python SDK for LandingAI Agentic Document Extraction (ADE).'
};

function normalizeRepo(raw) {
  // Handle both standard repo objects and application/vnd.github.star+json { starred_at, repo } objects
  const r = raw.repo ? raw.repo : raw;
  const starredAt = raw.starred_at || r.starred_at || null;
  const fullName = r.full_name;
  const description = (r.description && r.description.trim())
    ? r.description.trim()
    : (fallbackDescriptions[fullName] || '');
  return {
    id: r.id,
    name: r.name,
    full_name: fullName,
    html_url: r.html_url,
    description,
    stargazers_count: r.stargazers_count || 0,
    forks_count: r.forks_count || 0,
    language: r.language || null,
    topics: Array.isArray(r.topics) ? r.topics : [],
    license: (r.license && (r.license.spdx_id || typeof r.license === 'string'))
      ? (typeof r.license === 'string' ? r.license : r.license.spdx_id)
      : null,
    archived: Boolean(r.archived),
    pushed_at: r.pushed_at || null,
    created_at: r.created_at || null,
    updated_at: r.updated_at || null,
    starred_at: starredAt,
    homepage: r.homepage || '',
    owner: {
      login: r.owner ? r.owner.login : fullName.split('/')[0],
      avatar_url: r.owner ? r.owner.avatar_url : `https://github.com/${fullName.split('/')[0]}.png`
    }
  };
}

async function getStarredRepos(user) {
  const localFreshPath = process.env.FRESH_STARS_FILE || '/tmp/fresh-stars.json';
  const cachePath = path.join(__dirname, '..', '.cache', 'starred-repos.json');
  const legacyCachePath = path.join(__dirname, '..', 'starred-repos.json');

  if (!process.env.FORCE_REFRESH && fs.existsSync(localFreshPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(localFreshPath, 'utf8'));
      const list = Array.isArray(data) ? data : (data.repos || []);
      if (list.length > 0) {
        console.log(`✅ Loaded ${list.length} fresh starred repositories from ${localFreshPath}`);
        return list.map(normalizeRepo);
      }
    } catch (e) {
      console.warn('Could not parse local fresh stars file, fetching from GitHub API...');
    }
  }

  if (!process.env.FORCE_REFRESH && fs.existsSync(cachePath)) {
    try {
      const cachedData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      if (new Date(cachedData.timestamp) > sixHoursAgo && Array.isArray(cachedData.repos) && cachedData.repos.length > 0) {
        console.log(`✅ Using cached starred repositories (${cachedData.repos.length} repos)`);
        return cachedData.repos.map(normalizeRepo);
      }
    } catch {}
  }

  console.log(`🌐 Fetching fresh starred repositories for @${user} from GitHub API...`);
  let page = 1;
  const all = [];
  try {
    const headers = {
      'Accept': 'application/vnd.github.star+json',
      'User-Agent': 'awesome-github-repos-generator',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }
    while (true) {
      const url = `https://api.github.com/users/${encodeURIComponent(user)}/starred?per_page=100&page=${page}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`GitHub API HTTP ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) break;
      all.push(...data.map(normalizeRepo));
      if (data.length < 100) break;
      page++;
    }
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify({ timestamp: new Date().toISOString(), repos: all }, null, 2));
    console.log(`✅ Fetched and cached ${all.length} starred repositories`);
    return all;
  } catch (err) {
    console.warn(`⚠️ GitHub API fetch failed (${err.message}), checking fallback cache...`);
    if (fs.existsSync(legacyCachePath)) {
      const legacy = JSON.parse(fs.readFileSync(legacyCachePath, 'utf8'));
      return (legacy.repos || []).map(normalizeRepo);
    }
    throw err;
  }
}

async function fetchReadmeRaw(fullName) {
  for (const file of ['README.md', 'readme.md', 'README.rst']) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${fullName}/HEAD/${file}`);
      if (res.ok) {
        const text = (await res.text())
          .replace(/<!--[\s\S]*?-->/g, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
          .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 600);
        if (text) return text;
      }
    } catch {}
  }
  return '';
}

async function categorizeWithGemini(repos) {
  if (!GEMINI_API_KEY || !repos.length) return {};
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  let prompt = `You are a repository categorization assistant. For each repo, choose the best category from the list below. Use the descriptions to guide your choice. If none fit, use 'Others'.\n\n`;
  prompt += allowedCategories.map(c => `- ${c.name}: ${c.desc}`).join('\n');
  prompt += `\n\nFormat: [CATEGORY_START] owner/repo: Category Name [CATEGORY_END]\n\n`;
  for (const repo of repos) {
    prompt += `Repo: ${repo.full_name}\nDescription: ${repo.description || ''}\nTopics: ${(repo.topics || []).join(', ')}\nREADME: ${(repo.readme || '').slice(0, 400)}\n\n`;
  }
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    if (!res.ok) {
      throw new Error(`Gemini HTTP ${res.status}`);
    }
    const json = await res.json();
    const text = (json?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
    const categoryRegex = /\[CATEGORY_START\]\s*([^:]+):\s*([^\n]+)\s*\[CATEGORY_END\]/g;
    const out = {};
    const allowedNames = allowedCategories.map(c => c.name);
    let match;
    while ((match = categoryRegex.exec(text)) !== null) {
      const repoName = match[1].trim();
      const category = match[2].trim();
      if (allowedNames.includes(category)) {
        out[repoName] = category;
      }
    }
    return out;
  } catch (err) {
    console.warn(`⚠️ Gemini categorization skipped/failed (${err.message}), using deterministic classifier.`);
    return {};
  }
}

function getHeat(stars) {
  if (stars >= 25000) return '🔥🔥🔥';
  if (stars >= 5000) return '🔥🔥';
  if (stars >= 1000) return '🔥';
  return '';
}

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function formatDateShort(iso) {
  if (!iso) return 'N/A';
  return iso.slice(0, 10);
}

function slugifyCategory(catName) {
  return catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function trimDescription(desc, maxLen = 135) {
  if (!desc) return 'No description provided.';
  const clean = desc.replace(/\r?\n/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen).trim() + '...';
}

function renderNewFlag(width = 36) {
  return `<img src="https://github.com/Anmol-Baranwal/Cool-GIFs-For-GitHub/assets/74038190/9037a869-528d-44e2-acaa-288c260ec742" width="${width}" alt="new"/>`;
}

function renderRepoCardMarkdown(repo, { showNewFlag = false, leftAlign = false, useFullDescription = false, showCategory = false, categoryName = '' } = {}) {
  const rawDesc = useFullDescription ? (repo.description || 'No description provided.') : trimDescription(repo.description, 135);
  const description = escapeHtml(rawDesc);
  const metaParts = [];
  if (repo.language) metaParts.push(`<code>${escapeHtml(repo.language)}</code>`);
  if (repo.license && repo.license !== 'NOASSERTION') metaParts.push(`⚖️ ${escapeHtml(repo.license)}`);
  if (repo.pushed_at) metaParts.push(`🕒 Updated ${formatDateShort(repo.pushed_at)}`);
  if (showCategory && categoryName) {
    const slug = slugifyCategory(categoryName);
    metaParts.push(`📂 <a href="categories/${slug}.md">${escapeHtml(categoryName)}</a>`);
  }
  const metaHtml = metaParts.length ? `<br/><small>${metaParts.join(' &nbsp;•&nbsp; ')}</small>` : '';
  const topicsSlice = (repo.topics || []).slice(0, 6);
  const topicsHtml = leftAlign && topicsSlice.length
    ? `<br/><small>🏷️ ${topicsSlice.map(t => `<code>${escapeHtml(t)}</code>`).join(' ')}</small>`
    : '';

  if (leftAlign) {
    return `<div align="left" style="border:1px solid #e5e7eb; border-radius:10px; padding:18px 20px; background:#fff;">
<img src="${repo.owner.avatar_url}" width="28" style="vertical-align:middle; border-radius:50%;"/> <strong><a href="${repo.html_url}">${repo.full_name}</a> ${getHeat(repo.stargazers_count)}</strong> ${repo.archived ? '<code>⚠️ Archived</code>' : ''}<br/><br/>
<em>${description}</em>${metaHtml}${topicsHtml}<br/><br/>
<span>
<a href="${repo.html_url}/stargazers"><img src="https://img.shields.io/github/stars/${repo.full_name}?style=flat-square&labelColor=343b41" alt="Stars: ${repo.stargazers_count}"></a>
<a href="${repo.html_url}/network/members"><img src="https://img.shields.io/github/forks/${repo.full_name}?style=flat-square&labelColor=343b41" alt="Forks: ${repo.forks_count}"></a>
</span>
</div><br/>\n`;
  }

  return `${showNewFlag ? '<div align="left">' + renderNewFlag(36) + '</div>' : ''}
<div align="center">
  <img src="${repo.owner.avatar_url}" width="32" style="border-radius:50%;"/><br/>
  <strong><a href="${repo.html_url}">${repo.full_name}</a> ${getHeat(repo.stargazers_count)}</strong>
  <br/><br/>
  <em>${description}</em>${metaHtml}
  <br/><br/>
  <span>
    <a href="${repo.html_url}/stargazers"><img src="https://img.shields.io/github/stars/${repo.full_name}?style=flat-square&labelColor=343b41" alt="Stars: ${repo.stargazers_count}"></a>
    <a href="${repo.html_url}/network/members"><img src="https://img.shields.io/github/forks/${repo.full_name}?style=flat-square&labelColor=343b41" alt="Forks: ${repo.forks_count}"></a>
  </span>
</div>\n`;
}

function renderRepoGridMarkdown(repos, columns = 2, showNewFlag = false, categorizations = {}) {
  let grid = '<table align="center">';
  for (let i = 0; i < repos.length; i += columns) {
    grid += '<tr>';
    for (let j = 0; j < columns; j++) {
      const repo = repos[i + j];
      grid += '<td width="50%" style="vertical-align:top; padding: 20px 28px; text-align:center;">';
      if (repo) {
        grid += renderRepoCardMarkdown(repo, {
          showNewFlag,
          showCategory: true,
          categoryName: categorizations[repo.full_name] || 'Others'
        });
      }
      grid += '</td>';
    }
    grid += '</tr>';
  }
  grid += '</table>';
  return grid;
}

(async () => {
  const user = 'anukchat';
  const stars = await getStarredRepos(user);

  const mappingPath = path.join(__dirname, '..', 'repo-categories.json');
  let categorizations = {};
  try {
    if (fs.existsSync(mappingPath)) {
      categorizations = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    }
  } catch {}

  const localReadmeCachePath = '/tmp/missing-readmes.json';
  let localReadmes = {};
  if (fs.existsSync(localReadmeCachePath)) {
    try {
      localReadmes = JSON.parse(fs.readFileSync(localReadmeCachePath, 'utf8'));
    } catch {}
  }

  // Identify repositories that are new or previously fell into 'Others'
  const toCategorize = stars.filter(r => !categorizations[r.full_name] || categorizations[r.full_name] === 'Others');
  console.log(`🔍 Categorizing ${toCategorize.length} repositories (new or previously in 'Others')...`);

  // Fetch READMEs for any repo in toCategorize not already in localReadmes
  const missingReadmes = toCategorize.filter(r => !localReadmes[r.full_name]);
  const BATCH_FETCH = 40;
  for (let i = 0; i < missingReadmes.length; i += BATCH_FETCH) {
    const batch = missingReadmes.slice(i, i + BATCH_FETCH);
    await Promise.all(batch.map(async r => {
      localReadmes[r.full_name] = await fetchReadmeRaw(r.full_name);
    }));
  }

  // Backfill empty descriptions from README first sentence if still empty
  for (const r of stars) {
    if (!r.description && localReadmes[r.full_name]) {
      const snippet = localReadmes[r.full_name].replace(/^#+\s*/, '').trim();
      r.description = trimDescription(snippet, 160);
    }
  }

  // Step 1: Deterministic high-precision classification
  const unresolvedForLLM = [];
  for (const r of toCategorize) {
    r.readme = localReadmes[r.full_name] || '';
    const { category, score } = classifyDeterministic(r, r.readme);
    if (category !== 'Others' && score >= 8) {
      categorizations[r.full_name] = category;
    } else {
      unresolvedForLLM.push({ repo: r, fallbackCategory: category });
    }
  }

  // Step 2: Optional Gemini API enrichment for ambiguous repos if GEMINI_API_KEY is available
  if (GEMINI_API_KEY && unresolvedForLLM.length > 0) {
    console.log(`✨ Using Gemini to classify ${unresolvedForLLM.length} ambiguous repositories...`);
    const LLM_BATCH = 15;
    for (let i = 0; i < unresolvedForLLM.length; i += LLM_BATCH) {
      const batch = unresolvedForLLM.slice(i, i + LLM_BATCH).map(x => x.repo);
      const llmResults = await categorizeWithGemini(batch);
      for (const item of unresolvedForLLM.slice(i, i + LLM_BATCH)) {
        categorizations[item.repo.full_name] = llmResults[item.repo.full_name] || item.fallbackCategory || 'Others';
      }
    }
  } else {
    for (const item of unresolvedForLLM) {
      categorizations[item.repo.full_name] = item.fallbackCategory || 'Others';
    }
  }

  // Persist deterministic sorted repo-categories.json
  const sortedMapping = {};
  Object.keys(categorizations).sort((a, b) => a.localeCompare(b)).forEach(k => {
    sortedMapping[k] = categorizations[k];
  });
  fs.writeFileSync(mappingPath, JSON.stringify(sortedMapping, null, 2) + '\n');

  // Build category buckets
  const buckets = {};
  allowedCategories.forEach(cat => { buckets[cat.name] = []; });
  for (const r of stars) {
    const category = categorizations[r.full_name] || 'Others';
    if (!buckets[category]) buckets[category] = [];
    buckets[category].push(r);
  }

  // Compute global statistics
  const totalRepos = stars.length;
  const activeCategories = allowedCategories.filter(c => (buckets[c.name] || []).length > 0);
  const langCounts = {};
  for (const r of stars) {
    if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
  }
  const topLanguages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([lang, count]) => `${lang} (${count})`)
    .join(' • ');

  const todayStr = new Date().toISOString().slice(0, 10);

  // --- 1. MAIN README GENERATION ---
  let md = `<p align="center"><img src="assets/awesome-logo.png" width="120" alt="Awesome Repos"/></p>\n`;
  md += `<h1 align="center">🚀 Awesome GitHub Repos</h1>\n`;
  md += `<p align="center">Awesome &amp; Popular AI, Agentic, and Developer Repos to follow — curated &amp; categorized by <a href="https://github.com/anukchat">Anukool Chaturvedi</a></p>\n`;
  md += `<p align="center">
  <a href="https://github.com/anukchat/awesome-github-repos/stargazers"><img src="https://img.shields.io/github/stars/anukchat/awesome-github-repos?style=flat-square" alt="Stars"></a>
  <a href="https://github.com/anukchat/awesome-github-repos/network/members"><img src="https://img.shields.io/github/forks/anukchat/awesome-github-repos?style=flat-square" alt="Forks"></a>
  <a href="https://github.com/anukchat/awesome-github-repos/blob/main/LICENSE"><img src="https://img.shields.io/github/license/anukchat/awesome-github-repos?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/Curated_Repos-${totalRepos}-2563eb?style=flat-square" alt="Curated Repos: ${totalRepos}">
  <img src="https://img.shields.io/badge/Categories-${activeCategories.length}-059669?style=flat-square" alt="Categories: ${activeCategories.length}">
  <img src="https://img.shields.io/badge/Last_Synced-${todayStr}-4f46e5?style=flat-square" alt="Last Synced: ${todayStr}">
</p>\n\n`;

  md += `<p align="center">
  <strong>🌐 <a href="https://anukchat.github.io/awesome-github-repos/">Launch Interactive Web Explorer</a></strong> &nbsp;|&nbsp;
  <strong>📑 <a href="#-table-of-contents">Browse ${activeCategories.length} Categories</a></strong> &nbsp;|&nbsp;
  <strong>🔥 <a href="#-hall-of-fame-most-starred">Hall of Fame</a></strong>
</p>\n\n`;

  md += `> **📊 Snapshot:** **${totalRepos}** starred repositories across **${activeCategories.length}** categories. **Top Languages:** ${topLanguages}.\n\n`;

  // Recent Additions Accordion (expanded by default so visitors immediately see fresh activity)
  const recentRepos = stars.slice(0, 12);
  md += `<details open align="left">\n<summary><span style='font-size:1.35em; font-weight:600; vertical-align:middle;'>🆕 Recent Additions (Latest ${recentRepos.length} Starred)</span> ${renderNewFlag(32)}</summary>\n\n`;
  md += renderRepoGridMarkdown(recentRepos, 2, true, categorizations) + '\n\n';
  md += `</details>\n\n`;

  // Hall of Fame Accordion (Top 10 Most Starred)
  const topStarred = [...stars].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 10);
  md += `<details align="left">\n<summary><span style='font-size:1.35em; font-weight:600; vertical-align:middle;'>🔥 Hall of Fame — Top 10 Most-Starred Repositories</span></summary>\n\n`;
  md += `| Rank | Repository | Category | Language | Stars | Forks |\n`;
  md += `| :--- | :--- | :--- | :--- | ---: | ---: |\n`;
  topStarred.forEach((r, idx) => {
    const cat = categorizations[r.full_name] || 'Others';
    const slug = slugifyCategory(cat);
    md += `| #${idx + 1} | [**${r.full_name}**](${r.html_url}) ${getHeat(r.stargazers_count)} | [${cat}](categories/${slug}.md) | ${r.language || '—'} | ⭐ ${r.stargazers_count.toLocaleString('en-US')} | 🍴 ${r.forks_count.toLocaleString('en-US')} |\n`;
  });
  md += `\n</details>\n\n`;

  // Table of Contents with repo counts and top repo preview
  md += `## 📑 Table of Contents\n\n`;
  md += `| Category | Repos | Description & Top Project |\n`;
  md += `| :--- | :---: | :--- |\n`;
  allowedCategories.forEach(cat => {
    const list = buckets[cat.name] || [];
    if (!list.length) return;
    const slug = slugifyCategory(cat.name);
    const topRepo = [...list].sort((a, b) => b.stargazers_count - a.stargazers_count)[0];
    const topNote = topRepo ? `<br/><small>🏆 Top: <a href="${topRepo.html_url}">${topRepo.full_name}</a> (⭐ ${formatNumber(topRepo.stargazers_count)})</small>` : '';
    md += `| ${cat.icon} **[${cat.name}](categories/${slug}.md)** | **${list.length}** | ${cat.desc}${topNote} |\n`;
  });
  md += `\n---\n\n`;

  // Quick Category Jump Links for compatibility
  md += `### 🔗 Quick Category Links\n\n`;
  allowedCategories.forEach(cat => {
    const list = buckets[cat.name] || [];
    if (!list.length) return;
    const slug = slugifyCategory(cat.name);
    md += `- ${cat.icon} [${cat.name}](categories/${slug}.md) (**${list.length}**): ${cat.desc}\n`;
  });
  md += `\n---\n\n`;
  md += `<p align="center"><small>Automated with ❤️ by <a href="scripts/generate.js">scripts/generate.js</a> • Hybrid AI + Deterministic Categorization • <a href="docs/index.html">Web Explorer</a></small></p>\n`;

  fs.writeFileSync(path.join(__dirname, '..', 'README.md'), md);

  // --- 2. CATEGORY MARKDOWN GENERATION ---
  const categoriesDir = path.join(__dirname, '..', 'categories');
  fs.mkdirSync(categoriesDir, { recursive: true });

  allowedCategories.forEach(cat => {
    const list = buckets[cat.name];
    if (!list || !list.length) return;
    const slug = slugifyCategory(cat.name);
    const filePath = path.join(categoriesDir, `${slug}.md`);

    // Sort by stars descending
    list.sort((a, b) => b.stargazers_count - a.stargazers_count);

    let catMd = `<p align="center"><img src="../assets/awesome-logo.png" width="100" alt="Awesome Repos"/></p>\n`;
    catMd += `<h1 align="center">${cat.icon} ${cat.name}</h1>\n`;
    catMd += `<p align="center"><i>${cat.desc}</i></p>\n`;
    catMd += `<p align="center"><strong>${list.length} Curated Repositories</strong> &nbsp;•&nbsp; <a href="../README.md">← Back to Main Page</a> &nbsp;•&nbsp; <a href="https://anukchat.github.io/awesome-github-repos/?category=${encodeURIComponent(cat.name)}">🌐 View in Web Explorer</a></p>\n\n`;

    // Quick summary table at top of category page
    catMd += `<details>\n<summary><strong>📋 Quick Index (${list.length} repositories, sorted by stars)</strong></summary>\n\n`;
    catMd += `| Repository | Stars | Language | Updated | Description |\n`;
    catMd += `| :--- | ---: | :--- | :--- | :--- |\n`;
    for (const repo of list) {
      catMd += `| [**${repo.full_name}**](${repo.html_url}) | ⭐ ${formatNumber(repo.stargazers_count)} | ${repo.language || '—'} | ${formatDateShort(repo.pushed_at)} | ${escapeHtml(trimDescription(repo.description, 85)).replace(/\|/g, '\\|')} |\n`;
    }
    catMd += `\n</details>\n\n---\n\n`;

    for (const repo of list) {
      catMd += renderRepoCardMarkdown(repo, { leftAlign: true, useFullDescription: true }) + '\n';
    }
    catMd = catMd.split('\n').map(line => line.trimStart()).join('\n');
    fs.writeFileSync(filePath, catMd);
  });

  // --- 3. EXPORT WEB EXPLORER DATA (docs/repos-data.js) ---
  const docsDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  const webData = {
    generatedAt: new Date().toISOString(),
    totalRepos,
    categories: allowedCategories.map(c => ({
      name: c.name,
      icon: c.icon,
      slug: slugifyCategory(c.name),
      desc: c.desc,
      count: (buckets[c.name] || []).length
    })),
    repos: stars.map((r, idx) => ({
      rankOrder: idx, // 0 = most recently starred
      full_name: r.full_name,
      name: r.name,
      owner: r.owner.login,
      avatar: r.owner.avatar_url,
      url: r.html_url,
      description: r.description || '',
      category: categorizations[r.full_name] || 'Others',
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language || null,
      license: r.license || null,
      topics: (r.topics || []).slice(0, 8),
      archived: r.archived,
      pushed_at: r.pushed_at ? r.pushed_at.slice(0, 10) : null,
      starred_at: r.starred_at ? r.starred_at.slice(0, 10) : null,
      homepage: r.homepage || null
    }))
  };
  fs.writeFileSync(
    path.join(docsDir, 'repos-data.js'),
    `window.AWESOME_REPOS_DATA = ${JSON.stringify(webData, null, 2)};\n`
  );
  // Copy logo asset to docs/assets for standalone GitHub Pages rendering
  const docsAssetsDir = path.join(docsDir, 'assets');
  fs.mkdirSync(docsAssetsDir, { recursive: true });
  const logoSrc = path.join(__dirname, '..', 'assets', 'awesome-logo.png');
  if (fs.existsSync(logoSrc)) {
    fs.copyFileSync(logoSrc, path.join(docsAssetsDir, 'awesome-logo.png'));
  }

  console.log(`🎉 Successfully generated README.md, ${activeCategories.length} category pages, and docs/repos-data.js for ${totalRepos} repositories!`);
})();
