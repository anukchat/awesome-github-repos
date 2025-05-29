const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Octokit with GitHub token
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Initialize Gemini
const genAI = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

// Map categories to relevant topics
const categoryTopicMap = {
  '🧠 Foundation Models':       ['llm', 'gpt', 'bert', 'llama', 't5', 'transformer'],
  '📈 LLM Training':            ['pretraining', 'training', 'distributed-training', 'fine-tuning'],
  '⚙️ LLM Inference':           ['inference', 'onnx', 'tensorrt', 'quantization', 'optimization'],
  '🧩 Embeddings & Vector DBs':  ['embedding', 'vector-search', 'faiss', 'ann', 'hnsw'],
  '🔍 RAG & Retrieval':         ['rag', 'retrieval-augmented-generation', 'retrieval', 'chunking', 'indexing'],
  '🤖 AI Agents':               ['agent', 'autonomous-agent', 'agentic', 'react-agent'],
  '🌐 Browser Automation':      ['puppeteer', 'playwright', 'selenium', 'webdriver'],
  '🛠️ AI SDKs & Tools':         ['sdk', 'framework', 'pipeline', 'cli', 'automation'],
  '🎨 Generative UI & Demos':   ['generative-ui', 'interface', 'ui', 'component-library'],
  '📚 Docs & Knowledge Bases':  ['documentation', 'wiki', 'knowledge-base', 'docs'],
  '🚀 MLOps & Deployment':      ['mlops', 'deployment', 'docker', 'kubernetes'],
  '🧪 Testing & Evaluation':    ['testing', 'evaluation', 'unittest', 'pytest', 'benchmarks'],
  '✍️ Prompt Engineering':      ['prompt', 'prompt-engineering', 'prompt-library'],
  '🤖 Robotics':                ['robotics', 'ros', 'robot', 'drone'],
  '📸 OCR & Vision':            ['ocr', 'vision', 'tesseract', 'yolo', 'computer-vision'],
  '🕸️ Web Scraping':            ['scrapy', 'crawler', 'scraping', 'beautifulsoup'],
  '📊 Data Extraction':         ['information-extraction', 'parser', 'schema'],
  '🔖 Others':                  []
};

// Fetch and cache starred repositories
async function getStarredRepos(user) {
  const cachePath = path.join(__dirname, '..', 'starred-repos.json');
  try {
    if (fs.existsSync(cachePath)) {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (new Date(cached.timestamp).getTime() > oneDayAgo) {
        console.log('✅ Using cached starred repositories');
        return cached.repos;
      }
    }
  } catch (err) {
    console.warn('Cache load failed, fetching fresh data...');
  }

  console.log('Fetching starred repositories...');
  let page = 1;
  const all = [];
  while (true) {
    const { data } = await octokit.activity.listReposStarredByUser({ username: user, per_page: 100, page });
    if (!data.length) break;
    all.push(...data);
    page++;
  }
  fs.writeFileSync(cachePath, JSON.stringify({ timestamp: new Date().toISOString(), repos: all }, null, 2));
  console.log(`✅ Cached ${all.length} starred repositories`);
  return all;
}

// Fetch topics for a repository
async function fetchTopics(owner, repo) {
  const res = await octokit.rest.repos.getAllTopics({
    owner,
    repo,
    headers: { accept: 'application/vnd.github.mercy-preview+json' }
  });
  return res.data.names || [];
}

// Categorize repositories using Gemini
async function categorizeWithGemini(repos) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
  const prompt = `You are a repository categorization assistant. Assign each repository to one of the following categories:\n${Object.keys(categoryTopicMap).join('\n')}\n` +
    repos.map(r => `[REPO]\nname: ${r.full_name}\ndescription: ${r.description || 'No description'}\ntopics: ${(r.topics || []).join(', ')}\n`).join('\n') +
    `\nRespond using the following format for each repo:\n[CATEGORY_START]\n<full_name>: <category>\n[CATEGORY_END]`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const regex = /\[CATEGORY_START\]\s*([^:]+):\s*([^\n]+)\s*\[CATEGORY_END\]/g;
    const categorizations = {};
    let m;
    while ((m = regex.exec(text)) !== null) {
      categorizations[m[1].trim()] = m[2].trim();
    }
    // Default any invalid categories to Others
    for (const key of Object.keys(categorizations)) {
      if (!Object.keys(categoryTopicMap).includes(categorizations[key])) {
        categorizations[key] = '🔖 Others';
      }
    }
    fs.writeFileSync(path.join(__dirname, '..', 'repo-categories.json'), JSON.stringify(categorizations, null, 2));
    console.log('✅ Saved repository categorizations');
    return categorizations;
  } catch (err) {
    console.error('Categorization error:', err);
    return Object.fromEntries(repos.map(r => [r.full_name, '🔖 Others']));
  }
}

// Heat indicator based on star count
function getHeat(stars) {
  if (stars > 10000) return ' 🔥🔥🔥';
  if (stars > 5000 ) return ' 🔥🔥';
  if (stars > 1000 ) return ' 🔥';
  return '';
}

// Main execution
(async () => {
  const user = 'anukchat';
  const stars = await getStarredRepos(user);

  // Initialize buckets
  const buckets = {};
  Object.keys(categoryTopicMap).forEach(cat => buckets[cat] = []);

  // Load existing categorizations
  let categorizations = {};
  const mappingPath = path.join(__dirname, '..', 'repo-categories.json');
  try {
    if (fs.existsSync(mappingPath)) {
      categorizations = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
      console.log('✅ Loaded existing categorizations');
    }
  } catch (err) {
    console.warn('No existing categorizations found');
  }

  // Fetch topics and categorize uncategorized repos
  const uncategorized = stars.filter(r => !categorizations[r.full_name]);
  if (uncategorized.length) {
    console.log(`Found ${uncategorized.length} uncategorized repos, processing...`);
    for (const r of uncategorized) {
      r.topics = await fetchTopics(r.owner.login, r.name);
    }
    const newCats = await categorizeWithGemini(uncategorized);
    categorizations = { ...categorizations, ...newCats };
  }

  // Assign repos to buckets
  stars.forEach(r => {
    const cat = categorizations[r.full_name] || '🔖 Others';
    buckets[cat].push(r);
  });

  // Generate pure Markdown README
  let md = '';
  md += '![Awesome Repos Logo](assets/awesome-logo.png)\n\n';
  md += '# 🚀 Awesome GitHub Repos\n\n';
  md += 'A categorized showcase of my ⭐️-starred repositories.\n\n';
  md += '## 📑 Table of Contents\n\n';
  Object.keys(categoryTopicMap).forEach(cat => {
    if (buckets[cat].length) {
      const slug = cat.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      md += `- [${cat}](#${slug})\n`;
    }
  });
  md += '\n---\n\n';
  Object.entries(buckets).forEach(([cat, list]) => {
    if (!list.length) return;
    md += `## ${cat}\n\n`;
    list.sort((a, b) => b.stargazers_count - a.stargazers_count).forEach(repo => {
      md += `### [${repo.owner.login}/${repo.name}](${repo.html_url})${getHeat(repo.stargazers_count)}\n\n`;
      if (repo.description) md += `${repo.description}\n\n`;
      md += `[![Stars](https://img.shields.io/github/stars/${repo.full_name}?style=flat-square)](${repo.html_url}/stargazers) `;
      md += `[![Forks](https://img.shields.io/github/forks/${repo.full_name}?style=flat-square)](${repo.html_url}/network/members) `;
      md += `[![Last Commit](https://img.shields.io/github/last-commit/${repo.full_name}?style=flat-square)](${repo.html_url}/commits)\n\n`;
      if (repo.topics && repo.topics.length) {
        md += repo.topics.slice(0, 5).map(t => `\`${t}\``).join(' ') + '\n\n';
      }
    });
    md += '---\n\n';
  });

  fs.writeFileSync(path.join(__dirname, '..', 'README.md'), md);
  console.log('✅ README.md generated in pure Markdown');
})();
