const fetch = require('node-fetch');
const { Octokit } = require('@octokit/rest');
const fs = require('fs');

// GitHub username and token via environment variables
const USERNAME = process.env.GITHUB_USER || 'anukchat';
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error('Error: Set the GITHUB_TOKEN environment variable.');
  process.exit(1);
}

// Pass a fetch implementation to Octokit
const octokit = new Octokit({
  auth: TOKEN,
  request: { fetch }
});

async function fetchAllStarred(username) {
  let page = 1;
  const perPage = 100;
  let results = [];

  while (true) {
    const { data } = await octokit.activity.listReposStarredByUser({
      username,
      per_page: perPage,
      page
    });

    if (data.length === 0) break;
    results = results.concat(data);
    page++;
  }

  return results;
}

async function main() {
  console.log(`Fetching starred repos for ${USERNAME}...`);
  const stars = await fetchAllStarred(USERNAME);

  // Categorize by primary language
  const categories = {};
  stars.forEach(repo => {
    const lang = repo.language || 'Others';
    if (!categories[lang]) categories[lang] = [];
    categories[lang].push(repo);
  });

  // Build README content
  let md = `# Awesome Starred Repositories for ${USERNAME}\n\n`;
  Object.keys(categories).sort().forEach(lang => {
    const list = categories[lang];
    md += `## ${lang} (${list.length})\n\n`;

    list.forEach(r => {
      md += `- [${r.full_name}](${r.html_url})`;
      if (r.description) md += ` — ${r.description}`;
      md += `\n`;
    });
    md += `\n`;
  });

  fs.writeFileSync('README.md', md);
  console.log('README.md generated with', stars.length, 'entries.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});