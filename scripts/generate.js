// scripts/generate.js
const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const categories = [
  { name: '🔥 Interesting Repos',       match: repo => repo.stargazers_count >= 5000 },
  { name: '🤖 AI Models',               keywords: ['model','llm','transformer','gpt','bert'] },
  { name: '🛠️ AI Tools',               keywords: ['tool','cli','sdk','framework','pipeline'] },
  { name: '🧠 AI Agents',              keywords: ['agent','autonomous','agentic'] },
  { name: '🎨 Generative UI',           keywords: ['ui','interface','dashboard','gui','generative'] },
  { name: '📚 Knowledge Center',         keywords: ['knowledge','wiki','documentation','center','kb'] },
  { name: '🚀 MLOps & Hardware',         keywords: ['mlops','hardware','gpu','tpu','deployment','infrastructure'] },
  { name: '🤖 Robotics',                keywords: ['robot','robotics','automation','drone'] },
  { name: '🔍 OCR Engines',             keywords: ['ocr','recognition','vision','tesseract'] },
  { name: '📊 AI-based Extraction',     keywords: ['extract','parser','structured','json','schema'] },
  { name: '✍️ Prompts',                 keywords: ['prompt','prompting','template'] },
  { name: '🧪 Testing Libraries',        keywords: ['test','testing','unittest','pytest','mocha','jest'] },
  { name: '⚙️ LLM Inference',            keywords: ['inference','onnx','tensorrt','quantization'] },
  { name: '🌐 Browser Automation',       keywords: ['selenium','puppeteer','playwright','webdriver'] },
  { name: '🕸️ Scraping Frameworks',      keywords: ['scrape','scraping','crawler','spider'] },
  { name: '📦 Embeddings',               keywords: ['embedding','vector','faiss','ann','hnsw'] },
  { name: '📚 RAGs',                    keywords: ['rag','retrieval'] },
  // catch-all
  { name: '❓ Others',                  match: _ => true }
];

// chunk an array into rows of `n`
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
      username: user, per_page: 100, page
    });
    if (!data.length) break;
    all.push(...data);
    page++;
  }
  return all;
}

(async () => {
  const user = 'anukchat';
  const stars = await fetchStars(user);

  // prepare category buckets
  const buckets = {};
  categories.forEach(c => buckets[c.name] = []);

  // assign each repo
  for (const r of stars) {
    const desc = (r.description || '').toLowerCase();
    let placed = false;
    for (const cat of categories) {
      if (cat.match && cat.match(r)) {
        buckets[cat.name].push(r);
        placed = true;
        break;
      }
      if (cat.keywords && cat.keywords.some(k => desc.includes(k))) {
        buckets[cat.name].push(r);
        placed = true;
        break;
      }
    }
    if (!placed) buckets['❓ Others'].push(r);
  }

  // build README.md
  let md = `\
<p align="center">
  <img src="assets/awesome-logo.png" width="120" alt="Awesome Repos"/>
</p>
<h1 align="center">🚀 Awesome GitHub Repos</h1>
<p align="center">A categorized showcase of my ⭐-starred repositories.</p>

<p align="center">
  <a href="https://github.com/anukchat/awesome-github-repos/actions"><img src="https://github.com/anukchat/awesome-github-repos/workflows/Update%20Repos/badge.svg" alt="CI Status"/></a>
  <a href="https://github.com/anukchat/awesome-github-repos/stargazers"><img src="https://img.shields.io/github/stars/anukchat/awesome-github-repos?style=social" alt="Stars"/></a>
  <a href="https://github.com/anukchat/awesome-github-repos/network/members"><img src="https://img.shields.io/github/forks/anukchat/awesome-github-repos?style=social" alt="Forks"/></a>
  <a href="https://github.com/anukchat/awesome-github-repos/blob/main/LICENSE"><img src="https://img.shields.io/github/license/anukchat/awesome-github-repos" alt="License"/></a>
</p>\n\n`;

  for (const cat of categories) {
    const list = buckets[cat.name];
    if (!list.length) continue;
    // sort by stars desc
    list.sort((a,b) => b.stargazers_count - a.stargazers_count);

    md += `## ${cat.name}\n\n<table>\n`;
    for (const row of chunk(list, 4)) {
      md += '  <tr>\n';
      for (const r of row) {
        md += `    <td align="center" valign="top" width="260">
<a href="${r.html_url}"><img src="${r.owner.avatar_url}" width="50" alt="${r.owner.login}"/></a><br/>
<a href="${r.html_url}"><strong>${r.full_name}</strong></a><br/>
<em>${(r.description||'').replace(/[\r\n]+/g,' ').slice(0,80)}${(r.description||'').length>80?'…':''}</em><br/>
<img src="https://img.shields.io/github/stars/${r.full_name}?style=social" alt="Stars"/> 
<img src="https://img.shields.io/github/forks/${r.full_name}?style=social" alt="Forks"/>
</td>\n`;
      }
      md += '  </tr>\n';
    }
    md += '</table>\n\n';
  }

  fs.writeFileSync(path.join(__dirname, '..', 'README.md'), md);
  console.log('✅ README.md generated');
})();
