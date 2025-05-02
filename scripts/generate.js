// scripts/generate.js
const fs = require('fs');
const { Octokit } = require('@octokit/rest');
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function fetchStars(user) {
  let page = 1, stars = [];
  while (true) {
    const { data } = await octokit.activity.listReposStarredByUser({
      username: user, per_page: 100, page
    });
    if (!data.length) break;
    stars.push(...data);
    page++;
  }
  return stars;
}

(async () => {
  const user = 'anukchat';
  const stars = await fetchStars(user);

  // Group by owner
  const byOwner = stars.reduce((map, r) => {
    map[r.owner.login] = map[r.owner.login] || [];
    map[r.owner.login].push(r);
    return map;
  }, {});

  // For each owner, generate a Markdown file
  for (const [owner, repos] of Object.entries(byOwner)) {
    repos.sort((a,b) => b.stargazers_count - a.stargazers_count);
    let md = `# 👤 ${owner}\n\n`;
    repos.forEach(r => {
      md += `- [${r.full_name}](${r.html_url}) — ${r.stargazers_count} ⭐️ / ${r.forks_count} 🍴\n`;
    });
    fs.writeFileSync(`by-owner/${owner}.md`, md);
  }
})();
