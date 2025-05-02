const fetch = require('node-fetch');
const { Octokit } = require('@octokit/rest');
const fs = require('fs');

// Category keywords and colors
const categories = JSON.parse(fs.readFileSync('categories.json', 'utf8'));
const categoryColors = {
  AI: '#E0F7FA',        // light cyan
  Agentic: '#E8F5E9',   // light green
  Tools: '#FFFDE7',     // light yellow
  Others: '#EEEEEE'     // light gray
};
const categoryIcons = {
  AI: '🤖',
  Agentic: '🧠',
  Tools: '🛠️',
  Others: '📦'
};

const USERNAME = process.env.GITHUB_USER || 'anukchat';
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) { console.error('Set GITHUB_TOKEN'); process.exit(1); }
const octokit = new Octokit({ auth: TOKEN, request: { fetch } });

// Fetch all starred repos
async function fetchAllStarred(user) {
  let page=1, all=[];
  while(true) {
    const { data } = await octokit.activity.listReposStarredByUser({ username:user, per_page:100, page });
    if(!data.length) break;
    all.push(...data);
    page++;
  }
  return all;
}

// Fetch repo topics
async function fetchTopics(owner, repo) {
  const res = await octokit.request('GET /repos/{owner}/{repo}/topics', { owner, repo, mediaType:{previews:['mercy']} });
  return res.data.names;
}

// Determine category by topics
function assignCategory(topics) {
  for(const [cat, keys] of Object.entries(categories)) {
    if(keys.some(k=> topics.includes(k.toLowerCase()))) return cat;
  }
  return 'Others';
}

// Build badge markdown
function makeBadge(label, url, style='flat-square', logo=null, color=null) {
  let b = `https://img.shields.io/${label}/${url}?style=${style}`;
  if(logo) b += `&logo=${logo}`;
  if(color) b += `&color=${color}`;
  return `![${label}](${b})`;
}

(async ()=>{
  const stars = await fetchAllStarred(USERNAME);
  const buckets = {};
  for(const repo of stars) {
    const topics = await fetchTopics(repo.owner.login, repo.name);
    const cat = assignCategory(topics);
    buckets[cat] = buckets[cat]||[];
    buckets[cat].push({ ...repo, topics });
  }

  // Generate README
  let md = `# 🌟 Awesome Starred Repositories for ${USERNAME}\n\n`;
  md += '*_Auto-generated vibrant cards by category._*\n\n';

  for (const cat of Object.keys(buckets).sort()) {
    const repos = buckets[cat].sort((a, b) => b.stargazers_count - a.stargazers_count);
    const color = categoryColors[cat] || categoryColors['Others'];
    const icon = categoryIcons[cat] || '';
    md += `## ${icon} ${cat}

`;
    md += '<table><tr>\n';

    repos.forEach((r,i) => {
      const bg = color;
      const avatar = `https://avatars.githubusercontent.com/u/${r.owner.id}?s=100`;
      md += `<td align="center" width="220" style="background:${bg};border-radius:8px;padding:12px;margin:4px;">`;
      md += `<a href=\"${r.html_url}\"><img src=\"${avatar}\" width=\"80px\" style=\"border-radius:50%;margin-bottom:8px;\"/><br/>`;
      md += `<b>${r.full_name}</b></a><br/>`;
      md += `<sub>${r.description||''}</sub><br/><br/>`;

      // badges row
      md += makeBadge('github/stars', r.full_name);
      md += '&nbsp;';
      md += makeBadge('github/forks', r.full_name);
      md += '&nbsp;';
      md += makeBadge('github/issues', r.full_name, 'flat-square', null, 'ffb100');
      md += '&nbsp;';
      md += makeBadge('github/license', r.full_name, 'flat-square', null, 'green');
      md += '<br/><br/>';

      // topic badges
      r.topics.forEach(t => {
        const label = encodeURIComponent(t);
        md += `![${t}](https://img.shields.io/badge/${label}-${label}-informational?style=flat-square&logo=github)&nbsp;`;
      });
      md += '</td>\n';

      if((i+1)%3===0 && i+1!==repos.length) md += '</tr><tr>\n';
    });

    md += '</tr></table>\n\n';
  }

  fs.writeFileSync('README.md', md);
  console.log('README.md generated with', Object.keys(buckets).length, 'categories.');
})();