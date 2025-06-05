// Required dependencies
const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Octokit with GitHub token
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const categoryTopicMap = {
  '🧠 Foundation Models':       ['llm', 'gpt', 'bert', 'llama', 't5', 'transformer'],
  '📈 LLM Training':           ['pretraining', 'training', 'distributed-training', 'fine-tuning'],
  '⚙️ LLM Inference':          ['inference', 'onnx', 'tensorrt', 'quantization', 'optimization'],
  '🧩 Embeddings & Vector DBs': ['embedding', 'vector-search', 'faiss', 'ann', 'hnsw'],
  '🔍 RAG & Retrieval':        ['rag', 'retrieval-augmented-generation', 'retrieval', 'chunking', 'indexing'],
  '🤖 AI Agents':              ['agent', 'autonomous-agent', 'agentic', 'react-agent'],
  '🌐 Browser Automation':     ['puppeteer', 'playwright', 'selenium', 'webdriver'],
  '🛠️ AI SDKs & Tools':        ['sdk', 'framework', 'pipeline', 'cli', 'automation'],
  '🎨 Generative UI & Demos':  ['generative-ui', 'interface', 'ui', 'component-library'],
  '📚 Docs & Knowledge Bases': ['documentation', 'wiki', 'knowledge-base', 'docs'],
  '🚀 MLOps & Deployment':     ['mlops', 'deployment', 'docker', 'kubernetes'],
  '🧪 Testing & Evaluation':   ['testing', 'evaluation', 'unittest', 'pytest', 'benchmarks'],
  '✍️ Prompt Engineering':     ['prompt', 'prompt-engineering', 'prompt-library'],
  '🤖 Robotics':               ['robotics', 'ros', 'robot', 'drone'],
  '📸 OCR & Vision':           ['ocr', 'vision', 'tesseract', 'yolo', 'computer-vision'],
  '🕸️ Web Scraping':           ['scrapy', 'crawler', 'scraping', 'beautifulsoup'],
  '📊 Data Extraction':        ['information-extraction', 'parser', 'schema'],
  '🔖 Others':                 []
};

function chunk(arr, n) {
  const rows = [];
  for (let i = 0; i < arr.length; i += n) {
    rows.push(arr.slice(i, i + n));
  }
  return rows;
}

async function getStarredRepos(user) {
  const cachePath = path.join(__dirname, '..', 'starred-repos.json');
  try {
    if (fs.existsSync(cachePath)) {
      const cachedData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (new Date(cachedData.timestamp) > oneDayAgo) {
        console.log('✅ Using cached starred repositories');
        return cachedData.repos;
      }
    }
  } catch (error) {
    console.log('Cache invalid or corrupted, fetching fresh data...');
  }

  console.log('Fetching starred repositories...');
  let page = 1, all = [];
  while (true) {
    const { data } = await octokit.activity.listReposStarredByUser({
      username: user,
      per_page: 100,
      page
    });
    if (!data.length) break;
    all.push(...data);
    page++;
  }
  fs.writeFileSync(cachePath, JSON.stringify({ timestamp: new Date().toISOString(), repos: all }, null, 2));
  console.log(`✅ Cached ${all.length} starred repositories`);
  return all;
}

async function fetchTopics(owner, repo) {
  const res = await octokit.rest.repos.getAllTopics({
    owner,
    repo,
    headers: { accept: 'application/vnd.github.mercy-preview+json' }
  });
  return res.data.names;
}

function getHeat(stars) {
  if (stars > 10000) return '🔥🔥🔥';
  if (stars > 5000) return '🔥🔥';
  if (stars > 1000) return '🔥';
  return '';
}

function formatCount(count) {
  return count >= 1000 ? `${Math.floor(count / 1000)}k` : count.toString();
}

async function categorizeWithGemini(repos) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
  const prompt = `You are a repository categorization assistant...` // same prompt as before
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const categoryRegex = /\[CATEGORY_START\]\s*([^:]+):\s*([^\n]+)\s*\[CATEGORY_END\]/g;
    const categorizations = {};
    let match;
    while ((match = categoryRegex.exec(text)) !== null) {
      const repoName = match[1].trim();
      const category = match[2].trim();
      categorizations[repoName] = categoryTopicMap[category] ? category : '🔖 Others';
    }
    fs.writeFileSync(path.join(__dirname, '..', 'repo-categories.json'), JSON.stringify(categorizations, null, 2));
    console.log('✅ Saved repository categorizations to repo-categories.json');
    return categorizations;
  } catch (error) {
    console.error('Error categorizing repositories:', error);
    return Object.fromEntries(repos.map(r => [r.full_name, '🔖 Others']));
  }
}

(async () => {
  const user = 'anukchat';
  const stars = await getStarredRepos(user);
  const buckets = {};
  Object.keys(categoryTopicMap).forEach(cat => buckets[cat] = []);

  const mappingPath = path.join(__dirname, '..', 'repo-categories.json');
  let categorizations = {};
  try {
    if (fs.existsSync(mappingPath)) {
      categorizations = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    }
  } catch {}

  const uncategorizedRepos = stars.filter(r => !categorizations[r.full_name]);
  for (const r of uncategorizedRepos) {
    r.topics = await fetchTopics(r.owner.login, r.name);
  }
  const newCategorizations = await categorizeWithGemini(uncategorizedRepos);
  categorizations = { ...categorizations, ...newCategorizations };
  fs.writeFileSync(mappingPath, JSON.stringify(categorizations, null, 2));

  for (const r of stars) {
    const category = categorizations[r.full_name] || '🔖 Others';
    buckets[category].push(r);
  }

  const recentRepos = stars.slice(0, 10);
  const topRepos = [...stars].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 10);

  function renderRepoGrid(repos) {
    return `<table><tbody>
${chunk(repos, 2).map(row =>
  `<tr>
${row.map(repo => `  <td valign="top"> <img src="${repo.owner.avatar_url}" width="20"/> <a href="${repo.html_url}">${repo.full_name}</a> ${getHeat(repo.stargazers_count)}</td>`).join('\n')}
</tr>`
).join('\n')}
</tbody></table>`;
  }

  let md = `<p align="center"><img src="assets/awesome-logo.png" width="120" alt="Awesome Repos"/></p>
<h1 align="center">🚀 Awesome GitHub Repos</h1>
<p align="center">A categorized showcase of my ⭐️-starred repositories.</p>

## 🆕 Recent Starred Repos

${renderRepoGrid(recentRepos)}

`;
  md += `## 🌟 Top Starred Repos

${renderRepoGrid(topRepos)}

---

`;

  md += `## 📑 Table of Contents

`;
  for (const cat of Object.keys(categoryTopicMap)) {
    const slug = cat.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    md += `- [${cat}](#${slug})\n`;
  }
  md += `\n---\n\n`;

  for (const cat of Object.keys(categoryTopicMap)) {
    const list = buckets[cat];
    if (!list.length) continue;
    list.sort((a, b) => b.stargazers_count - a.stargazers_count);
    const slug = cat.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    md += `<h2 id="${slug}">${cat}</h2>\n\n<details><summary>Show repositories (${list.length})</summary>\n\n`;
    for (const repo of list) {
      md += `### <img src="${repo.owner.avatar_url}" width="20" align="top" alt="${repo.owner.login}"/> [${repo.owner.login}/${repo.name}](${repo.html_url})`;
      const heat = getHeat(repo.stargazers_count);
      if (heat) md += ` ${heat}`;
      md += `\n\n`;
      if (repo.description) md += `> ${repo.description}\n\n`;
      md += `<div align="center">\n\n`;
      md += `[![Stars](https://img.shields.io/github/stars/${repo.full_name}?style=flat-square&labelColor=343b41)](${repo.html_url}/stargazers) `;
      md += `[![Forks](https://img.shields.io/github/forks/${repo.full_name}?style=flat-square&labelColor=343b41)](${repo.html_url}/network/members) `;
      md += `[![Last Commit](https://img.shields.io/github/last-commit/${repo.full_name}?style=flat-square&labelColor=343b41)](${repo.html_url}/commits)\n\n</div>\n\n`;
      if (repo.topics?.length) md += repo.topics.slice(0, 5).map(t => `\`${t}\``).join(' ') + '\n\n';
      if (list.indexOf(repo) !== list.length - 1) md += '---\n\n';
    }
    md += `</details>\n\n---\n\n`;
  }

  fs.writeFileSync(path.join(__dirname, '..', 'README.md'), md);
  console.log('✅ README.md generated with GitHub-compatible layout');
})();
