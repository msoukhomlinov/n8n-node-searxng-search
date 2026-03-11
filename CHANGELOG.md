# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 0.5.0 (2026-03-11)

### Changed

- Renamed the dedicated node to **SearXNG Search AI Tool** for clearer AI-specific identification in the tool picker.
- Removed the redundant `usableAsTool` flag from the dedicated AI tool node to avoid duplicate tool-style listings.

## 0.4.0 (2026-03-11)

### Changed

- Renamed the main node UI and docs consistently to **SearXNG Search** while keeping internal node and credential identifiers unchanged for compatibility.

## 0.3.0 (2026-03-10)

Initial forked version.

### Features (continued)

- **SearXNG Search Tool node** (`SearxngAiTools`): dedicated AI Tools node exposing SearXNG web search as a structured LangChain tool for the n8n AI Agent. Supports `query`, `categories`, `language`, `time_range`, `safesearch`, `pageno`, and `engines` parameters via a Zod schema. Configurable `maxResults` (1–50, default 10). Returns structured JSON `{ success, query, results, total_available }`. All errors returned as structured JSON with `error_type` and `suggestion` — never thrown — so the agent can self-correct. Implements n8n toolkit compatibility probe (`n8n-core` StructuredToolkit → `@langchain/classic` Toolkit fallback).

### Features

- **Dynamic option loaders**: Categories, Engines, Language, Enabled Plugins, and Disabled Plugins now populate dynamically from the connected SearXNG instance via `/config` endpoint
- **Autocomplete dropdown**: Replaced free-text autocomplete field with a fixed dropdown of documented backends (DBpedia, DuckDuckGo, Google, Mwmbl, Qwant, Startpage, Swisscows, Wikipedia)

### Bug Fixes

- `time_range`: sentinel value `'all'` is no longer sent to the API; only documented values (`day`, `month`, `year`) are forwarded
- `language`: sentinel value `'all'` is no longer sent to the API

### Breaking Changes

- `theme` field removed — only affects HTML rendering pipeline, not search results
- `time_range` option `'week'` removed — undocumented in SearXNG API
- `engines`, `enabled_plugins`, `disabled_plugins` changed from comma-separated strings to multi-select dropdowns
