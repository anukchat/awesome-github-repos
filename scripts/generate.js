// scripts/generate.js

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

// initialize Octokit with the GitHub Actions token
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// === 1. Define your categories and their matching GitHub topics ===
const categoryTopicMap = {
  '🤖 AI Models':                    ['machine-learning','deep-learning','transformers','gpt','bert','llama','t5','llm'],
  '🛠️ AI Tools':                    ['tool','cli','sdk','framework','pipeline','automation','platform'],
  '🧠 AI Agents':                   ['agent','autonomous-agent','agentic'],
  '🎨 Generative UI':                ['generative-ui','ui','dashboard','interface','gui','component-library'],
  '📚 Knowledge Center':              ['documentation','wiki','knowledge-base','docs'],
  '🚀 MLOps and Hardware':            ['mlops','deployment','cuda','gpu','tpu','docker','kubernetes'],
  '🤖 Robotics':                     ['robotics','robot','ros','drone','automation'],
  '🔍 OCR Engines':                  ['ocr','computer-vision','tesseract'],
  '📊 AI-based Structured Extraction': ['information-extraction','extraction','ie','schema','parser'],
  '✍️ Prompts':                      ['prompt-engineering','prompt'],
  '🧪 Testing Libraries':             ['testing','pytest','unittest','mocha','jest'],
  '⚙️ LLM Inference':                 ['inference','onnx','tensorrt','quantization'],
  '🌐 Browser Automation':            ['selenium','puppeteer','playwright','webdriver'],
  '🕸️ Scraping Frameworks':           ['scrapy','crawler','scraping','beautifulsoup'],
  '📦 Embeddings':                    ['embedding','vector','faiss','hnsw','ann'],
  '📚 RAGs':                         ['rag','retrieval-augmented-generation','vector-search'],
  // catch-all
  '🔖 Others':                       []
};

// === 2. Utility: break an array into rows of N items ===
function chunk(arr, n) {
  const rows = [];
  for (let i = 0; i < arr.length; i += n) {
    rows.push(arr.slice(i, i + n));
  }
  return rows;
}

// === 3. Fetch all starred repos for a user ===
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

// === 4. Fetch GitHub topics for a given repo ===
async function fetchTopics(owner, repo) {
  const res = await octokit.rest.repos.getAllTopics({
    owner,
    repo,
    headers: { accept: 'application/vnd.github.mercy-preview+json' }
  });
  return res.data.names; // array of topic strings
}

// === 5. Main generation logic ===
;(async () => {
  const user  = 'anukchat';
  const stars = await fetchStars(user);

  // Prepare buckets
  const buckets = {};
  Object.keys(categoryTopicMap).forEach(cat => buckets[cat] = []);

  // Categorize each repo
  for (const r of stars) {
    const topics = await fetchTopics(r.owner.login, r.name);
    let placed = false;

    // 5a. First try matching official topics
    for (const [cat, topicList] of Object.entries(categoryTopicMap)) {
      if (topicList.some(t => topics.includes(t))) {
        buckets[cat].push(r);
        placed = true;
        break;
      }
    }

    // 5b. Fallback: match by description keywords if no topic matched
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

    // 5c. Final fallback
    if (!placed) {
      buckets['🔖 Others'].push(r);
    }
  }

  // === 6. Build README.md content ===
  let md = `\
<p align="center"><img src="assets/awesome-logo.png" width="120" alt="Awesome Repos"/></p>
<h1 align="center">🚀 Awesome GitHub Repos</h1>
<p align="center">A categorized showcase of my ⭐️-starred repositories.</p>

<p align="center">
  <a href="#table-of-contents">📑 Table of Contents</a>
</p>

---

## 📑 Table of Contents  
`;

  // 6a. Table of Contents entries
  for (const cat of Object.keys(categoryTopicMap)) {
    const slug = cat
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .trim()
      .replace(/ +/g, '-');
    md += `- [${cat}](#${slug})\n`;
  }
  md += `\n---\n\n`;

  // 6b. Render each category as a collapsible accordion with a 3-column table
  for (const cat of Object.keys(categoryTopicMap)) {
    const list = buckets[cat];
    if (!list.length) continue;

    // sort by star count descending
    list.sort((a, b) => b.stargazers_count - a.stargazers_count);

    const slug = cat
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .trim()
      .replace(/ +/g, '-');

    md += `<a id="${slug}"></a>\n`;
    md += `<details>\n<summary style="font-size:1.2em;margin:8px 0;"><strong>${cat}</strong></summary>\n\n`;
    md += `<table style="width:100%;border-collapse:separate;border-spacing:16px 16px;">\n`;

    // chunk into rows of 3 cards
    for (const row of chunk(list, 3)) {
      md += `  <tr>\n`;
      for (const r of row) {
        md += `    <td align="center" valign="top"
      style="width:30%;padding:12px;background-color:#f5f5f5;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.1);">
      <a href="${r.html_url}"><img src="${r.owner.avatar_url}" width="48" height="48" style="border-radius:50%;"/></a><br/>
      <a href="${r.html_url}"><strong>${r.full_name}</strong></a><br/>
      <em>${(r.description||'').replace(/[\r\n]+/g,' ').slice(0,80)}${(r.description||'').length > 80 ? '…' : ''}</em><br/><br/>
      <img src="https://img.shields.io/github/stars/${r.full_name}?style=social&label=stars" alt="Stars"/>
      <img src="https://img.shields.io/github/forks/${r.full_name}?style=social&label=forks" alt="Forks"/>
    </td>\n`;
      }
      md += `  </tr>\n`;
    }

    md += `</table>\n\n</details>\n\n`;
  }

  // 7. Write the generated README.md
  const outPath = path.join(__dirname, '..', 'README.md');
  fs.writeFileSync(outPath, md);
  console.log('✅ README.md generated with precise, topic-based categories.');
})();