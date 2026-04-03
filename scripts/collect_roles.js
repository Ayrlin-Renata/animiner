/**
 * scripts/collect_roles.js
 * Scrapes unique staff roles from popular AniList media to help build a priority map.
 */

const query = `
query ($page: Int) {
  Page(page: $page, perPage: 50) {
    media(sort: POPULARITY_DESC, type: ANIME) {
      id
      title { romaji }
      staff {
        edges {
          role
        }
      }
    }
  }
}
`;

async function collectRoles() {
    console.log('🔍 Fetching roles from AniList Popularity charts...');
    const roles = new Set();
    
    try {
        for (let page = 1; page <= 3; page++) {
            const response = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query, variables: { page } })
            });

            const data = await response.json();
            const mediaList = data.data.Page.media;

            mediaList.forEach(anime => {
                anime.staff.edges.forEach(edge => {
                    if (edge.role) roles.add(edge.role.trim());
                });
            });
            console.log(`✅ Page ${page} processed.`);
        }

        const sortedRoles = Array.from(roles).sort();
        const outputPath = './scripts/roles_data.json';
        const fs = require('fs');
        fs.writeFileSync(outputPath, JSON.stringify(sortedRoles, null, 2));
        
        console.log('\n--- DATA PERSISTED ---');
        console.log(`✅ Saved ${sortedRoles.length} unique roles to ${outputPath}`);

    } catch (err) {
        console.error('❌ Error fetching roles:', err);
    }
}

collectRoles();
