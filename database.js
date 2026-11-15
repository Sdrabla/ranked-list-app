const RANKING_COLUMNS = [
  'id',
  'user_id',
  'title',
  'art_rating',
  'story_rating',
  'characters_rating',
  'enjoyment_rating',
  'tags',
  'review',
  'cover_url',
  'media_type',
  'external_media_id',
  'legacy_id',
  'created_at',
  'updated_at'
].join(', ');

async function getAuthenticatedUserId(expectedUserId) {
  if (typeof supabaseClient === 'undefined') {
    throw new Error('Supabase is not initialized. Load supabase-client.js first.');
  }

  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    throw new Error(`Unable to verify the current user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('You must be signed in to access rankings.');
  }

  if (expectedUserId && data.user.id !== expectedUserId) {
    throw new Error('Your account changed. Reload the collection and try again.');
  }

  return data.user.id;
}

function itemToRankingRow(item, userId) {
  return {
    user_id: userId,
    title: item.name,
    art_rating: item.art,
    story_rating: item.story,
    characters_rating: item.characters,
    enjoyment_rating: item.enjoyment,
    tags: Array.isArray(item.tags) ? item.tags : [],
    review: item.review || '',
    cover_url: item.coverUrl ?? null,
    media_type: item.mediaType ?? null,
    external_media_id: item.externalMediaId ?? null,
    legacy_id: item.legacyId ?? (typeof item.id === 'number' ? item.id : null)
  };
}

function rankingRowToItem(row) {
  const item = new Item(
    row.id,
    row.title,
    row.art_rating,
    row.story_rating,
    row.characters_rating,
    row.enjoyment_rating,
    Array.isArray(row.tags) ? row.tags : [],
    row.review || ''
  );

  item.coverUrl = row.cover_url;
  item.mediaType = row.media_type;
  item.externalMediaId = row.external_media_id;
  item.legacyId = row.legacy_id;
  item.createdAt = row.created_at;
  item.updatedAt = row.updated_at;
  return item;
}

async function fetchRankings(expectedUserId) {
  const userId = await getAuthenticatedUserId(expectedUserId);
  const { data, error } = await supabaseClient
    .from('ranked_items')
    .select(RANKING_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Unable to fetch rankings: ${error.message}`);
  }

  return data.map(rankingRowToItem);
}

async function addRanking(item, expectedUserId) {
  const userId = await getAuthenticatedUserId(expectedUserId);
  const { data, error } = await supabaseClient
    .from('ranked_items')
    .insert(itemToRankingRow(item, userId))
    .select(RANKING_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Unable to add ranking: ${error.message}`);
  }

  return rankingRowToItem(data);
}

async function updateRanking(item, expectedUserId) {
  if (!item?.id) {
    throw new Error('A ranking ID is required to update a ranking.');
  }

  const userId = await getAuthenticatedUserId(expectedUserId);
  const { data, error } = await supabaseClient
    .from('ranked_items')
    .update({
      ...itemToRankingRow(item, userId),
      updated_at: new Date().toISOString()
    })
    .eq('id', item.id)
    .eq('user_id', userId)
    .select(RANKING_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Unable to update ranking: ${error.message}`);
  }

  return rankingRowToItem(data);
}

async function deleteRanking(id, expectedUserId) {
  if (!id) {
    throw new Error('A ranking ID is required to delete a ranking.');
  }

  const userId = await getAuthenticatedUserId(expectedUserId);
  const { error } = await supabaseClient
    .from('ranked_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Unable to delete ranking: ${error.message}`);
  }
}

async function clearRankings(expectedUserId) {
  const userId = await getAuthenticatedUserId(expectedUserId);
  const { error } = await supabaseClient
    .from('ranked_items')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Unable to clear rankings: ${error.message}`);
  }
}
