const fs = require('fs');

const QUERY = `
{
  GenreCollection
  MediaTagCollection {
    name
  }
  Page(page: 1, perPage: 50) {
    media(sort: POPULARITY_DESC, type: ANIME) {
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

  const body = await response.json();
  const { data } = body;
  
  if (!data) {
    console.error('Fetch failed:', body.errors);
    return;
  }

  const cache = {
    genres: new Set(data.GenreCollection || []),
    tags: new Set((data.MediaTagCollection || []).map(t => t.name)),
    studios: new Set()
  };

  const media = data.Page?.media || [];
  media.forEach(m => {
    m.studios?.edges?.forEach(e => cache.studios.add(e.node.name));
  });

  const result = {
    genres: Array.from(cache.genres).sort(),
    tags: Array.from(cache.tags).sort(),
    studios: Array.from(cache.studios).sort()
  };

  const outPath = './public/initialCache.json';
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

  console.log(`Success! Cached ${result.genres.length} genres and ${result.tags.length} tags to ${outPath}.`);
}

fetchInitialData().catch(console.error);
