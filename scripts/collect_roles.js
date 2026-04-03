/**
 * scripts/collect_roles.js
 * Scrapes and structures unique staff roles from popular AniList media.
 * Groups roles by base title and captures parenthetical variations.
 */

const query = `
query ($page: Int) {
  Page(page: $page, perPage: 50) {
    media(sort: POPULARITY_DESC, type: ANIME) {
      id
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
    const rolesMap = {};
    
    try {
        for (let page = 1; page <= 5; page++) {
            const response = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query, variables: { page } })
            });

            const data = await response.json();
            const mediaList = data.data.Page.media;

            mediaList.forEach(anime => {
                anime.staff.edges.forEach(edge => {
                    const fullRole = (edge.role || '').trim();
                    if (!fullRole) return;

                    // Robust parsing: Split at FIRST occurrence of '(' to handle malformed/truncated data
                    const idx = fullRole.indexOf('(');
                    let base = fullRole;
                    let info = '';

                    if (idx !== -1) {
                        base = fullRole.substring(0, idx).trim();
                        info = fullRole.substring(idx).trim();
                    }

                    if (!rolesMap[base]) {
                        rolesMap[base] = {
                            count: 0,
                            variations: new Set()
                        };
                    }

                    rolesMap[base].count++;
                    if (info) rolesMap[base].variations.add(info);
                });
            });
            console.log(`✅ Page ${page} processed.`);
        }

        // Convert Set to Array for JSON serialization
        const structuredRoles = Object.keys(rolesMap)
            .map(base => ({
                role: base,
                count: rolesMap[base].count,
                variations: Array.from(rolesMap[base].variations).sort()
            }))
            .sort((a, b) => b.count - a.count);

        const outputPath = './scripts/roles_data.json';
        const fs = require('fs');
        fs.writeFileSync(outputPath, JSON.stringify(structuredRoles, null, 2));
        
        console.log('\n--- DATA PERSISTED ---');
        console.log(`✅ Saved ${structuredRoles.length} unique base roles to ${outputPath}`);

    } catch (err) {
        console.error('❌ Error fetching roles:', err);
    }
}

collectRoles();
