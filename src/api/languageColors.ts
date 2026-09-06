/**
 * Linguist colors for the languages most likely to show up in the breakdown.
 *
 * The GraphQL API returns a color with every language, but the REST
 * `repository.language` field is a bare string, so the unauthenticated path
 * looks colors up here and falls back to a deterministic hue.
 */
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Scala: '#c22d40',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  Clojure: '#db5855',
  Lua: '#000080',
  Perl: '#0298c3',
  R: '#198CE7',
  Julia: '#a270ba',
  Zig: '#ec915c',
  Nim: '#ffc200',
  OCaml: '#ef7a08',
  Erlang: '#B83998',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Shell: '#89e051',
  PowerShell: '#012456',
  Dockerfile: '#384d54',
  Makefile: '#427819',
  HCL: '#844FBA',
  Terraform: '#844FBA',
  Nix: '#7e7eff',
  'Vim script': '#199f4b',
  'Emacs Lisp': '#c065db',
  'Objective-C': '#438eff',
  'Jupyter Notebook': '#DA5B0B',
  TeX: '#3D6117',
  Solidity: '#AA6746',
  Assembly: '#6E4C13',
  SQL: '#e38c00',
  'Blade Template': '#f7523f',
  Astro: '#ff5a03',
  MDX: '#fcb32c',
};

/** Neutral grey used when a language has no known color. */
export const FALLBACK_LANGUAGE_COLOR = '#858585';

/**
 * Derives a stable color from the language name so that unknown languages are
 * still visually distinguishable from one another.
 */
const hashToColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return `hsl(${hash}, 60%, 50%)`;
};

export const getLanguageColor = (name: string): string => {
  if (LANGUAGE_COLORS[name]) {
    return LANGUAGE_COLORS[name];
  }
  return name ? hashToColor(name) : FALLBACK_LANGUAGE_COLOR;
};
