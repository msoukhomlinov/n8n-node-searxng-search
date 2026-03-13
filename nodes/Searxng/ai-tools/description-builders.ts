export const TOOL_NAME = 'searxng_search';

export const TOOL_DESCRIPTION =
  'Search the web using a private SearXNG metasearch engine. ' +
  'Returns JSON with title, url, and content for each result. ' +
  'Use specific, descriptive queries for best results — avoid vague terms. ' +
  'Supported categories (comma-separated): general, images, videos, news, map, music, it, science, social_media, files. ' +
  'Optionally filter by language (BCP-47 code, e.g. "en", "de"), time range ("day", "month", "year"), ' +
  'safe search level ("0"=off, "1"=moderate, "2"=strict), page number, or specific engines (comma-separated engine names). ' +
  'Always parse the JSON response — never format results as prose. ' +
  'If results are empty, try broadening the query or removing category/engine filters. ' +
  'Response format: { schemaVersion: "1", success: boolean, resource: "search", operation: "search", result?: { items, count, totalAvailable, query }, errorType?: string, message?: string, nextAction?: string }.';

export const PARAM_DESCRIPTIONS = {
  query:
    'The search query. Use specific keywords and operators (e.g. site:, filetype:, "exact phrase") for best results. Required.',
  categories:
    'Comma-separated search categories. Options: general, images, videos, news, map, music, it, science, social_media, files. Omit for the SearXNG instance default (general).',
  language:
    'BCP-47 language code to filter results (e.g. "en", "de", "fr"). Omit for all languages.',
  time_range:
    'Filter results by recency. Values: "day" (last 24h), "month" (last 30 days), "year" (last 12 months). Omit for no time filter.',
  safesearch:
    'Safe search level. Values: "0" (off — no filtering), "1" (moderate — default), "2" (strict — maximum filtering). Omit to use instance default.',
  pageno:
    'Page number, 1-indexed (default 1). Increase to paginate through additional results beyond the first page.',
  engines:
    'Comma-separated engine names to restrict the search (e.g. "google,bing,duckduckgo"). Omit to use all enabled engines on the SearXNG instance.',
};
