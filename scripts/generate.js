const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Octokit with GitHub token
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// Cache starred repositories
async function getStarredRepos(user) {
  const cachePath = path.join(__dirname, '..', 'starred-repos.json');
  
  try {
    // Try to load from cache first
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

  // Fetch fresh data if cache doesn't exist or is old
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

  // Save to cache
  const cacheData = {
    timestamp: new Date().toISOString(),
    repos: all
  };
  fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
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

// Categorize repositories using Gemini
async function categorizeWithGemini(repos) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
  
  const prompt = `You are a repository categorization assistant. Your task is to categorize GitHub repositories into specific categories.

Available categories:
${Object.keys(categoryTopicMap).join('\n')}

For each repository below, determine its primary purpose and assign it to exactly one category from the list above.

Repositories to categorize:
${repos.map(r => `
[REPO_START]
name: ${r.full_name}
description: ${r.description || 'No description'}
topics: ${(r.topics || []).join(', ')}
[REPO_END]
`).join('\n')}

IMPORTANT: Your response must follow this exact format:
1. Start each repository's categorization with [CATEGORY_START]
2. Then the repository name exactly as provided
3. Then a colon
4. Then the exact category name from the list above
5. End with [CATEGORY_END]

Example format:
[CATEGORY_START]
owner/repo: 🧠 Foundation Models
[CATEGORY_END]

[CATEGORY_START]
another/repo: 🛠️ AI SDKs & Tools
[CATEGORY_END]

Do not include any other text, explanations, or formatting in your response.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Extract categorizations using regex
    const categoryRegex = /\[CATEGORY_START\]\s*([^:]+):\s*([^\n]+)\s*\[CATEGORY_END\]/g;
    const categorizations = {};
    let match;
    
    while ((match = categoryRegex.exec(text)) !== null) {
      const repoName = match[1].trim();
      const category = match[2].trim();
      categorizations[repoName] = category;
    }
    
    // Verify all categories exist in our map
    for (const [repo, category] of Object.entries(categorizations)) {
      if (!Object.keys(categoryTopicMap).includes(category)) {
        console.warn(`Invalid category "${category}" for repository ${repo}, defaulting to Others`);
        categorizations[repo] = '🔖 Others';
      }
    }
    
    // Save the mapping to a file
    const mappingPath = path.join(__dirname, '..', 'repo-categories.json');
    fs.writeFileSync(mappingPath, JSON.stringify(categorizations, null, 2));
    console.log('✅ Saved repository categorizations to repo-categories.json');
    
    return categorizations;
  } catch (error) {
    console.error('Error categorizing repositories:', error);
    // Return default categorization (all in Others) if there's an error
    return Object.fromEntries(repos.map(r => [r.full_name, '🔖 Others']));
  }
}

// Main function
(async () => {
  const user = 'anukchat';
  
  // Get starred repositories (from cache or fresh)
  const stars = await getStarredRepos(user);
  console.log(`Total starred repositories: ${stars.length}`);

  // Initialize buckets for each category
  const buckets = {};
  Object.keys(categoryTopicMap).forEach(cat => buckets[cat] = []);

  // Load existing categorizations
  const mappingPath = path.join(__dirname, '..', 'repo-categories.json');
  let categorizations = {};
  
  try {
    if (fs.existsSync(mappingPath)) {
      categorizations = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
      console.log(`✅ Loaded ${Object.keys(categorizations).length} existing categorizations`);
    }
  } catch (error) {
    console.log('No existing categorizations found, starting fresh...');
  }

  // Identify uncategorized repositories
  const uncategorizedRepos = stars.filter(r => !categorizations[r.full_name]);
  console.log(`Found ${uncategorizedRepos.length} uncategorized repositories`);

  // Only process uncategorized repositories
  if (uncategorizedRepos.length > 0) {
    console.log('Processing uncategorized repositories...');
    
    // Fetch topics for uncategorized repositories
    console.log('Fetching topics for uncategorized repositories...');
    for (const r of uncategorizedRepos) {
      const topics = await fetchTopics(r.owner.login, r.name);
      r.topics = topics;
    }

    // Categorize uncategorized repositories
    console.log('Categorizing uncategorized repositories...');
    const newCategorizations = await categorizeWithGemini(uncategorizedRepos);
    
    // Merge new categorizations with existing ones
    categorizations = { ...categorizations, ...newCategorizations };
    
    // Save the updated mapping
    fs.writeFileSync(mappingPath, JSON.stringify(categorizations, null, 2));
    console.log(`✅ Added ${Object.keys(newCategorizations).length} new categorizations`);
  } else {
    console.log('All repositories are already categorized!');
  }

  // Place repositories in their respective buckets
  for (const r of stars) {
    const category = categorizations[r.full_name] || '🔖 Others';
    buckets[category].push(r);
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
    const slug = cat.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    md += `- [${cat}](#${slug})\n`;
  }
  md += `\n---\n\n`;

  // Generate content for each category
  for (const cat of Object.keys(categoryTopicMap)) {
    const list = buckets[cat];
    if (!list.length) continue;
    list.sort((a, b) => b.stargazers_count - a.stargazers_count);

    const slug = cat.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    md += `<h2 id="${slug}">${cat}</h2>\n\n`;
    
    // Start with details tag (removed 'open' attribute to make it collapsed)
    md += `<details>\n<summary>Show repositories (${list.length})</summary>\n\n`;

    for (const repo of list) {
      // Repository header with avatar and name
      md += `### `;
      md += `<img src="${repo.owner.avatar_url}" width="20" align="top" alt="${repo.owner.login}"/> `;
      md += `[${repo.owner.login}/${repo.name}](${repo.html_url})`;
      
      // Heat indicator on same line as title
      const heat = getHeat(repo.stargazers_count);
      if (heat) md += ` ${heat}`;
      md += '\n\n';

      // Description
      if (repo.description) {
        md += `> ${repo.description}\n\n`;
      }

      // Stats badges
      md += `<div align="center">\n\n`;
      md += `[![Stars](https://img.shields.io/github/stars/${repo.full_name}?style=flat-square&labelColor=343b41)](${repo.html_url}/stargazers) `;
      md += `[![Forks](https://img.shields.io/github/forks/${repo.full_name}?style=flat-square&labelColor=343b41)](${repo.html_url}/network/members) `;
      md += `[![Last Commit](https://img.shields.io/github/last-commit/${repo.full_name}?style=flat-square&labelColor=343b41)](${repo.html_url}/commits)\n\n`;
      md += '</div>\n\n';
      
      // Topics as inline code
      if (repo.topics && repo.topics.length) {
        md += repo.topics.slice(0, 5).map(topic => `\`${topic}\``).join(' ') + '\n\n';
      }

      // Add separator between repos
      if (list.indexOf(repo) !== list.length - 1) {
        md += '---\n\n';
      }
    }
    
    md += `</details>\n\n`;
    
    // Add space between categories
    md += '---\n\n';
  }

  // Write the README file
  const outPath = path.join(__dirname, '..', 'README.md');
  fs.writeFileSync(outPath, md);
  console.log('✅ README.md generated with GitHub-compatible layout');
})();