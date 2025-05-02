const fetch = require('node-fetch');
const { Octokit } = require('@octokit/rest');
const fs = require('fs');

const USERNAME = process.env.GITHUB_USER || 'anukchat';
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) { console.error('Set GITHUB_TOKEN'); process.exit(1); }
const octokit = new Octokit({ auth: TOKEN, request: { fetch } });

// Fetch all starred repos
async function fetchAllStarred(user) {
  let page = 1, all = [];
  while (true) {
    const { data } = await octokit.activity.listReposStarredByUser({ username: user, per_page: 100, page });
    if (!data.length) break;
    all.push(...data);
    page++;
  }
  return all;
}

// Fetch topics for each repo (optional)
async function fetchTopics(owner, repo) {
  const res = await octokit.request('GET /repos/{owner}/{repo}/topics', {
    owner, repo,
    mediaType: { previews: ['mercy'] }
  });
  return res.data.names;
}

// Render a shields.io badge as HTML <img>
function makeBadge(label, repo, style = 'flat-square', logo = null, color = null) {
  let url = `https://img.shields.io/${label}/${repo}?style=${style}`;
  if (logo) url += `&logo=${logo}`;
  if (color) url += `&color=${color}`;
  return `<img src="${url}" alt="${label}" style="margin:2px; vertical-align:middle;"/>`;
}

(async () => {
  const stars = await fetchAllStarred(USERNAME);

  // Group by repository owner
  const buckets = {};
  for (const r of stars) {
    const owner = r.owner.login;
    buckets[owner] = buckets[owner] || [];
    buckets[owner].push(r);
  }

  // Build HTML-based README
  let md = `<h1 align="center">🌟 Awesome Starred Repositories for ${USERNAME}</h1>\n`;
  md += `<p align="center"><em>Auto-generated cards grouped by repo owner.</em></p>\n\n`;

  Object.keys(buckets).sort().forEach(owner => {
    const repos = buckets[owner].sort((a, b) => b.stargazers_count - a.stargazers_count);
    md += `<h2>👤 ${owner}</h2>\n`;
    md += `<table><tr>\n`;

    repos.forEach((r, i) => {
      const avatar = `https://avatars.githubusercontent.com/u/${r.owner.id}?s=100`;
      md += `<td style="background:#f5f5f5;border-radius:8px;padding:12px;margin:4px;text-align:center;">`;
      md += `<a href=\"${r.html_url}\"><img src=\"${avatar}\" width=\"80\" style=\"border-radius:50%;margin-bottom:8px;\"/></a><br/>`;
      md += `<a href=\"${r.html_url}\" style=\"font-weight:bold;font-size:14px;\">${r.full_name}</a><br/>`;
      md += `<p style=\"font-size:12px;margin:4px;\">${r.description||''}</p>`;

      // Stars & forks badges
      md += `<p>${makeBadge('github/stars', r.full_name)} ${makeBadge('github/forks', r.full_name)}</p>`;

      md += `</td>\n`;
      if ((i + 1) % 3 === 0 && i + 1 !== repos.length) md += `</tr><tr>\n`;
    });

    md += `</tr></table>\n\n`;
  });

  fs.writeFileSync('README.md', md);
  console.log('README.md generated for', Object.keys(buckets).length, 'owners.');
})();