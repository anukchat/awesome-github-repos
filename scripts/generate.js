const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

// Initialize Octokit with GitHub token
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Map categories to relevant topics
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

// Helper function to chunk array into rows
function chunk(arr, n) {
  const rows = [];
  for (let i = 0; i < arr.length; i += n) {
    rows.push(arr.slice(i, i + n));
  }
  return rows;
}

// Fetch all starred repositories for a user
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

// Fetch topics for a repository
async function fetchTopics(owner, repo) {
  const res = await octokit.rest.repos.getAllTopics({
    owner,
    repo,
    headers: { accept: 'application/vnd.github.mercy-preview+json' }
  });
  return res.data.names;
}

// Get heat emoji based on stars
function getHeat(stars) {
  if (stars > 10000) return '🔥🔥🔥';
  if (stars > 5000) return '🔥🔥';
  if (stars > 1000) return '🔥';
  return '';
}

// Format star and fork counts
function formatCount(count) {
  if (count >= 1000) {
    return `${Math.floor(count / 1000)}k`;
  }
  return count.toString();
}

// Main function
(async () => {
  const user = 'anukchat';
  const stars = await fetchStars(user);

  // Initialize buckets for each category
  const buckets = {};
  Object.keys(categoryTopicMap).forEach(cat => buckets[cat] = []);

  // Categorize repositories
  for (const r of stars) {
    const fullName = `${r.owner.login}/${r.name}`;
    
    const topics = await fetchTopics(r.owner.login, r.name);
    let placed = false;

    // Try to categorize by topic first
    for (const [cat, topicList] of Object.entries(categoryTopicMap)) {
      if (topicList.some(t => topics.includes(t))) {
        buckets[cat].push(r);
        placed = true;
        break;
      }
    }

    // If not categorized by topic, try by description
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

    // If still not categorized, put in Others
    if (!placed) buckets['🔖 Others'].push(r);
  }

  // Start generating markdown
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

  // Generate table of contents
  for (const cat of Object.keys(categoryTopicMap)) {
    const slug = cat.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/ +/g, '-');
    md += `- [${cat}](#${slug})\n`;
  }
  md += `\n---\n\n`;

  // Generate content for each category
  for (const cat of Object.keys(categoryTopicMap)) {
    const list = buckets[cat];
    if (!list.length) continue;
    list.sort((a, b) => b.stargazers_count - a.stargazers_count);

    const slug = cat.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/ +/g, '-');
    md += `## ${cat}\n\n`;
    
    // Create a clean layout similar to the example
    const rows = chunk(list, 2);
    
    // Start with details tag
    md += `<details open>\n<summary>Show repositories</summary>\n\n`;
    
    // Add category grid container
    md += `<div align="center">\n\n`;
    
    for (const row of rows) {
      // Start grid row
      md += `<div style="display: inline-block; width: 100%;">\n\n`;
      
      for (const repo of row) {
        // Repository card with enhanced styling
        md += `<div style="display: inline-block; width: 45%; margin: 10px; padding: 15px; border-radius: 8px; border: 1px solid #e1e4e8; background-color: #ffffff;">\n\n`;
        
        // Add avatar and repository header with flex layout
        md += `<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">\n`;
        md += `<img src="${repo.owner.avatar_url}" width="40" height="40" style="border-radius: 50%;" alt="${repo.owner.login}'s avatar"/>\n`;
        md += `<h3 style="margin: 0;"><a href="${repo.html_url}">${repo.owner.login}/${repo.name}</a> ${getHeat(repo.stargazers_count)}</h3>\n`;
        md += `</div>\n\n`;
        
        // Stats bar (stars, forks, last update)
        md += `<p align="center">\n`;
        md += `![Stars](https://img.shields.io/github/stars/${repo.full_name}?style=flat-square) `;
        md += `![Forks](https://img.shields.io/github/forks/${repo.full_name}?style=flat-square) `;
        md += `![Last Commit](https://img.shields.io/github/last-commit/${repo.full_name}?style=flat-square)\n`;
        md += `</p>\n\n`;
        
        // Description with expand/collapse
        if (repo.description) {
          const shortDesc = repo.description.replace(/\n/g, ' ').slice(0, 100);
          const hasMore = repo.description.length > 100;
          
          md += `<details>\n`;
          md += `<summary>${shortDesc}${hasMore ? '...' : ''}</summary>\n\n`;
          if (hasMore) {
            md += `${repo.description.replace(/\n/g, ' ')}\n`;
          }
          md += `</details>\n\n`;
        }
        
        // Topics/tags if available
        const topics = await fetchTopics(repo.owner.login, repo.name);
        if (topics.length) {
          md += `<p style="margin-top: 10px;">\n`;
          topics.slice(0, 5).forEach(topic => {
            md += `<code style="margin-right: 5px; padding: 3px 6px; border-radius: 3px; background-color: #f1f8ff; color: #0366d6;">${topic}</code>`;
          });
          md += `\n</p>\n`;
        }
        
        md += `</div>\n\n`;
      }
      
      md += `</div>\n\n`;
    }
    
    md += `</div>\n\n`;
    md += `</details>\n\n`;
  }

  // Write the README file
  const outPath = path.join(__dirname, '..', 'README.md');
  fs.writeFileSync(outPath, md);
  console.log('✅ README.md generated with clean layout and automated categorization.');
})();