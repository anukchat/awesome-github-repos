// Required dependencies
const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Octokit with GitHub token
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define the fixed set of broad categories with descriptions
const allowedCategories = [
  { name: 'Large Language Models (LLMs)', desc: 'Pretrained/fine-tuned models, inference engines, model recipes, optimization.' },
  { name: 'LLMOps & Deployment', desc: 'Infrastructure, orchestration, serving, routing, monitoring for LLMs.' },
  { name: 'AI Agents & Multi-Agent Systems', desc: 'Autonomous agents, agent orchestration, frameworks, agent education.' },
  { name: 'Prompt Engineering', desc: 'Prompt tuning, optimization, system prompts, evaluation guides.' },
  { name: 'Retrieval-Augmented Generation (RAG)', desc: 'RAG frameworks, pipelines, vector DB integration, hybrid search systems.' },
  { name: 'Model Context Protocol (MCP)', desc: 'Tools, clients, servers, and implementations for managing model context.' },
  { name: 'AI Frameworks & Toolkits', desc: 'Libraries, platforms, or SDKs for building, training, evaluating models.' },
  { name: 'AI Automation & Workflow Tools', desc: 'Workflow engines, automation platforms, RPA systems powered by AI.' },
  { name: 'Conversational AI & Chatbots', desc: 'Frameworks or UIs for chat agents, voice-based interfaces, open chat UIs.' },
  { name: 'Computer Vision & Image Generation', desc: 'Vision models, image editing, Stable Diffusion tools, multimodal setups.' },
  { name: 'Speech & Audio (TTS, ASR, Music)', desc: 'Text-to-speech, speech-to-text, music generation, audio processing.' },
  { name: 'Robotics & Embodied AI', desc: 'Robotics platforms, AI for robotics, humanoid or autonomous systems.' },
  { name: 'Machine Learning (Traditional)', desc: 'Non-LLM ML projects, courses, guides, systems design.' },
  { name: 'MLOps & ML Infrastructure', desc: 'Tools for ML pipelines, CI/CD, experimentation, cloud ML infra.' },
  { name: 'AI in Education & Courses', desc: 'Bootcamps, lecture notes, LLM/ML tutorials, beginner guides.' },
  { name: 'AI Testing & Evaluation', desc: 'Tools or frameworks for model testing, hallucination detection, safety.' },
  { name: 'Natural Language Processing (NLP)', desc: 'Language understanding, transformers, tokenizers, datasets.' },
  { name: 'AI UX/UI Design & Interaction', desc: 'Web/Desktop interfaces for AI tools, UI component generation, agent UI.' },
  { name: 'Generative AI', desc: 'Image, video, podcast, music generation using AI.' },
  { name: 'Data Engineering & Pipelines', desc: 'ETL tools, doc parsers, enrichment tools, structured input generators.' },
  { name: 'Knowledge Management & Graphs', desc: 'Semantic search, AI memory, graph systems, Q&A layers.' },
  { name: 'Low-Code / No-Code AI Tools', desc: 'Platforms for visual programming, app building with minimal code.' },
  { name: 'Web Scraping & Automation', desc: 'Crawlers, browser automation, task schedulers, data collectors.' },
  { name: 'System & Software Design', desc: 'Resources and examples on low-level and high-level system design.' },
  { name: 'DevOps & Cloud Infrastructure', desc: 'Self-hosting, deployment frameworks, containerized AI setups.' },
  { name: 'Productivity & Developer Tools', desc: 'Resume builders, markdown tools, GitHub UIs, icon generators.' },
  { name: 'Search & Indexing Tools', desc: 'Local search, search engine clones, AI-enhanced discovery.' },
  { name: 'Finance & Quantitative Tools', desc: 'Tools for trading, analysis, hedge funds, forecasting.' },
  { name: 'IoT & Edge AI', desc: 'Projects combining AI with IoT, edge compute, ESP32-based systems.' },
  { name: 'Awesome Lists & Aggregators', desc: 'Curated resources, educational repositories, prompt or tool collections.' },
  { name: 'Others', desc: 'If none of the above fit.' }
];

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

// Retry helper for async functions
async function withRetry(fn, args = [], retries = 3, delay = 1000) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn(...args);
    } catch (err) {
      lastErr = err;
      if (i < retries - 1) await new Promise(res => setTimeout(res, delay));
    }
  }
  throw lastErr;
}

async function fetchTopics(owner, repo) {
  return withRetry(async (owner, repo) => {
    const res = await octokit.rest.repos.getAllTopics({
      owner,
      repo,
      headers: { accept: 'application/vnd.github.mercy-preview+json' }
    });
    return res.data.names;
  }, [owner, repo]);
}

async function fetchReadme(owner, repo) {
  return withRetry(async (owner, repo) => {
    try {
      const { data } = await octokit.repos.getReadme({ owner, repo });
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      return content.slice(0, 2000); // Limit to 2k chars for prompt
    } catch {
      return '';
    }
  }, [owner, repo]);
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

// Load or initialize category map from repo-categories.json
function loadCategoryMap() {
  const mappingPath = path.join(__dirname, '..', 'repo-categories.json');
  let categorizations = {};
  let dynamicCategoryMap = {};
  if (fs.existsSync(mappingPath)) {
    categorizations = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    // Build dynamic category map from existing categories
    Object.values(categorizations).forEach(cat => {
      if (!dynamicCategoryMap[cat]) {
        dynamicCategoryMap[cat] = [];
      }
    });
  }
  // Add initial categories if not present
  allowedCategories.forEach(cat => {
    if (!dynamicCategoryMap[cat.name]) dynamicCategoryMap[cat.name] = [];
  });
  return dynamicCategoryMap;
}

// Assign a default emoji to new categories
function assignEmoji(categoryName) {
  // Try to infer emoji from name, else use 🆕
  return `🆕 ${categoryName}`;
}

async function categorizeWithGemini(repos, categorizations, mappingPath) {
  if (!repos.length) return {};
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
  let prompt = `You are a repository categorization assistant. For each repo, choose the best category from the list below. Use the descriptions to guide your choice. If none fit, use 'Others'.\n\n`;
  prompt += allowedCategories.map(c => `- ${c.name}: ${c.desc}`).join('\n');
  prompt += `\n\nFormat: [CATEGORY_START] owner/repo: Category Name [CATEGORY_END]\n\n`;
  for (const repo of repos) {
    prompt += `Repo: ${repo.full_name}\nTopics: ${(repo.topics||[]).join(', ')}\nREADME: ${(repo.readme||'').slice(0, 500)}\n\n`;
  }
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const categoryRegex = /\[CATEGORY_START\]\s*([^:]+):\s*([^\n]+)\s*\[CATEGORY_END\]/g;
    const newCategorizations = {};
    let match;
    const allowedNames = allowedCategories.map(c => c.name);
    while ((match = categoryRegex.exec(text)) !== null) {
      let repoName = match[1].trim();
      let category = match[2].trim();
      if (!allowedNames.includes(category)) {
        category = 'Others';
      }
      newCategorizations[repoName] = category;
      categorizations[repoName] = category;
    }
    // Cache after each batch
    fs.writeFileSync(mappingPath, JSON.stringify(categorizations, null, 2));
    return newCategorizations;
  } catch (error) {
    console.error('Error categorizing repositories:', error);
    // Still cache what we have so far
    fs.writeFileSync(mappingPath, JSON.stringify(categorizations, null, 2));
    return {};
  }
}

(async () => {
  const user = 'anukchat';
  const stars = await getStarredRepos(user);
  // Build buckets for allowed categories
  const buckets = {};
  allowedCategories.forEach(cat => buckets[cat.name] = []);

  const mappingPath = path.join(__dirname, '..', 'repo-categories.json');
  let categorizations = {};
  try {
    if (fs.existsSync(mappingPath)) {
      categorizations = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    }
  } catch {}

  // Fetch topics and README for uncategorized repos
  let uncategorizedRepos = stars.filter(r => !categorizations[r.full_name]);
  for (const r of uncategorizedRepos) {
    r.topics = await fetchTopics(r.owner.login, r.name);
    r.readme = await fetchReadme(r.owner.login, r.name);
  }
  // Batch LLM calls to avoid huge prompts and cache after each batch
  const BATCH_SIZE = 10;
  for (let i = 0; i < uncategorizedRepos.length; i += BATCH_SIZE) {
    const batch = uncategorizedRepos.slice(i, i + BATCH_SIZE);
    await categorizeWithGemini(batch, categorizations, mappingPath);
  }

  // Assign repos to buckets
  for (const r of stars) {
    const category = categorizations[r.full_name] || 'Others';
    if (!buckets[category]) buckets[category] = [];
    buckets[category].push(r);
  }

  // --- README GENERATION ---
  // Badge row
  let md = `<p align=\"center\"><img src=\"assets/awesome-logo.png\" width=\"120\" alt=\"Awesome Repos\"/></p>\n`;
  md += `<h1 align=\"center\">🚀 Awesome GitHub Repos</h1>\n`;
  md += `<p align=\"center\">Awesome & Popular AI Repos to follow, fully curated & categorized by <a href=\"https://github.com/anukchat\">Anukool Chaturvedi</a></p>\n`;
  md += `<p align=\"center\">
  <a href=\"https://github.com/anukchat/awesome-github-repos/stargazers\"><img src=\"https://img.shields.io/github/stars/anukchat/awesome-github-repos?style=flat-square\"></a>
  <a href=\"https://github.com/anukchat/awesome-github-repos/network/members\"><img src=\"https://img.shields.io/github/forks/anukchat/awesome-github-repos?style=flat-square\"></a>
  <a href=\"https://github.com/anukchat/awesome-github-repos/blob/main/LICENSE\"><img src=\"https://img.shields.io/github/license/anukchat/awesome-github-repos?style=flat-square\"></a>
  </p>\n\n`;

  // Table of Contents
  md += `---\n\n## 📑 Table of Contents\n\n`;
  allowedCategories.forEach(cat => {
    const slug = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    md += `- [${cat.name}](#${slug})\n`;
  });
  md += `\n---\n\n`;

  // Category sections
  allowedCategories.forEach(cat => {
    const list = buckets[cat.name];
    if (!list || !list.length) return;
    const slug = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    md += `<h2 id=\"${slug}\">${cat.name}</h2>\n`;
    md += `<p><i>${cat.desc}</i></p>\n`;
    md += `<details><summary>Show repositories (${list.length})</summary>\n\n`;
    list.sort((a, b) => b.stargazers_count - a.stargazers_count);
    for (const repo of list) {
      md += `### <img src=\"${repo.owner.avatar_url}\" width=\"20\" align=\"top\" alt=\"${repo.owner.login}\"/> [${repo.owner.login}/${repo.name}](${repo.html_url})`;
      const heat = getHeat(repo.stargazers_count);
      if (heat) md += ` ${heat}`;
      md += `\n\n`;
      if (repo.description) md += `> ${repo.description}\n\n`;
      md += `<div align=\"center\">\n\n`;
      md += `[![Stars](https://img.shields.io/github/stars/${repo.full_name}?style=flat-square&labelColor=343b41)](${repo.html_url}/stargazers) `;
      md += `[![Forks](https://img.shields.io/github/forks/${repo.full_name}?style=flat-square&labelColor=343b41)](${repo.html_url}/network/members) `;
      md += `[![Last Commit](https://img.shields.io/github/last-commit/${repo.full_name}?style=flat-square&labelColor=343b41)](${repo.html_url}/commits)\n\n</div>\n\n`;
      if (repo.topics?.length) md += repo.topics.slice(0, 5).map(t => `\`${t}\``).join(' ') + '\n\n';
      if (list.indexOf(repo) !== list.length - 1) md += '---\n\n';
    }
    md += `</details>\n\n---\n\n`;
  });

  // Contributing & License
  md += `## 🙌 Contributing\n\nWant to add your favorite repo? [Open a PR](CONTRIBUTING.md) or [file an issue](ISSUES.md)!\n\n`;
  md += `## 📜 License\n\nMIT © Anukool Chaturvedi\n`;

  fs.writeFileSync(path.join(__dirname, '..', 'README.md'), md);
  console.log('✅ README.md generated with enhanced UX layout');
})();
