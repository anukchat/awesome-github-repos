// scripts/generate.js
const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function fetchStars(user) {
  let page = 1, stars = [];
  while (true) {
    const { data } = await octokit.activity.listReposStarredByUser({
      username: user,
      per_page: 100,
      page
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

  // Ensure the output directory exists
  const outputDir = path.join(__dirname, '..', 'by-owner');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Group repos by owner and write each file
  const byOwner = stars.reduce((map, repo) => {
    map[repo.owner.login] = map[repo.owner.login] || [];
    map[repo.owner.login].push(repo);
    return map;
  }, {});

  for (const [owner, repos] of Object.entries(byOwner)) {
    // Sort by star count descending
    repos.sort((a, b) => b.stargazers_count - a.stargazers_count);

    // Build Markdown content
    let md = `# 👤 ${owner}\n\n`;
    repos.forEach(r => {
      md += `- [${r.full_name}](${r.html_url}) — ${r.stargazers_count} ⭐️ / ${r.forks_count} 🍴\n`;
    });

    // Write the per-owner file
    const filePath = path.join(outputDir, `${owner}.md`);
    fs.writeFileSync(filePath, md);
  }
})();
