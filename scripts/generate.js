const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

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

async function fetchStars(user) {
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

;(async () => {
  const user  = 'anukchat';
  const stars = await fetchStars(user);

  const buckets = {};
  Object.keys(categoryTopicMap).forEach(cat => buckets[cat] = []);

  for (const r of stars) {
    const fullName = `${r.owner.login}/${r.name}`;

    const topics = await fetchTopics(r.owner.login, r.name);
    let placed = false;

    for (const [cat, topicList] of Object.entries(categoryTopicMap)) {
      if (topicList.some(t => topics.includes(t))) {
        buckets[cat].push(r);
        placed = true;
        break;
      }
    }

    if (!placed) {
      const desc = (r.description || '').toLowerCase();
      for (const [cat, topicList] of Object.entries(categoryTopicMap)) {
        if (topicList.some(t => desc.includes(t))) {
          buckets[cat].push(r);
          placed = true;
          break;
        }
      }
    }

    if (!placed) buckets['🔖 Others'].push(r);
  }

  let md = `
<p align="center"><img src="assets/awesome-logo.png" width="120" alt="Awesome Repos"/></p>
<h1 align="center">🚀 Awesome GitHub Repos</h1>
<p align="center">A categorized showcase of my ⭐️-starred repositories.</p>

<p align="center">
  <a href="#table-of-contents">📑 Table of Contents</a>
</p>

---

## 📑 Table of Contents
`;

  for (const cat of Object.keys(categoryTopicMap)) {
    const slug = cat.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/ +/g, '-');
    md += `- [${cat}](#${slug})\n`;
  }
  md += `\n---\n\n`;

  for (const cat of Object.keys(categoryTopicMap)) {
    const list = buckets[cat];
    if (!list.length) continue;
    list.sort((a, b) => b.stargazers_count - a.stargazers_count);

    const slug = cat.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/ +/g, '-');
    md += `<a id="${slug}"></a>\n`;
    md += `<details>\n<summary style="font-size:1.2em;margin:8px 0;"><strong>${cat}</strong></summary>\n\n`;
    md += `<table><tbody>\n`;

    for (const row of chunk(list, 2)) {
      md += `  <tr>\n`;
      for (const r of row) {
        md += `    <td width="48%" valign="top">\n`;
        md += `\n### 🔗 [${r.full_name}](${r.html_url})\n`;
        md += `${(r.description || '').replace(/[\r\n]+/g, ' ').slice(0, 100)}${(r.description || '').length > 100 ? '…' : ''}  \n`;
        md += `${getHeat(r.stargazers_count)}  \n`;
        md += `![Stars](https://img.shields.io/github/stars/${r.full_name}?style=social) ![Forks](https://img.shields.io/github/forks/${r.full_name}?style=social)\n\n`;
        md += `    </td>\n`;
      }
      if (row.length < 2) md += `    <td width="48%"></td>\n`;
      md += `  </tr>\n`;
    }
    md += `</tbody></table>\n\n</details>\n\n`;
  }

  const outPath = path.join(__dirname, '..', 'README.md');
  fs.writeFileSync(outPath, md);
  console.log('✅ README.md generated with two-column layout and automated categorization.');
})();
