const fs = require('fs');

const QUERY = `
{
  Page(page: 1, perPage: 50) {
    media(sort: POPULARITY_DESC, type: ANIME) {
      genres
      tags { name }
      studios { edges { node { name } } }
    }
  }
}
`;

async function fetchInitialData() {
  console.log('Fetching initial cache data from AniList...');
  
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY })
  });

  const { data } = await response.json();
  const media = data.Page.media;

  const cache = {
    genres: new Set(),
    tags: new Set(),
    studios: new Set()
  };

  media.forEach(m => {
    m.genres.forEach(g => cache.genres.add(g));
    m.tags.forEach(t => cache.tags.add(t.name));
    m.studios.edges.forEach(e => cache.studios.add(e.node.name));
  });

  const result = {
    genres: Array.from(cache.genres).sort(),
    tags: Array.from(cache.tags).sort(),
    studios: Array.from(cache.studios).sort()
  };

  fs.writeFileSync('./initialCache.json', JSON.stringify(result, null, 2));
  console.log('initialCache.json generated successfully!');
}

fetchInitialData().catch(console.error);
