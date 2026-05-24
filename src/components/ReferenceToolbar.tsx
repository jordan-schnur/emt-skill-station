interface ReferenceToolbarProps {
  query: string;
  onQueryChange: (q: string) => void;
  categories: string[];
  activeCategory: string;
  onCategoryChange: (c: string) => void;
  placeholder?: string;
}

export function ReferenceToolbar({
  query,
  onQueryChange,
  categories,
  activeCategory,
  onCategoryChange,
  placeholder = "Search…",
}: ReferenceToolbarProps) {
  return (
    <div class="ref-toolbar">
      <div class="ref-search-wrap">
        <input
          class="ref-search-input"
          type="search"
          role="searchbox"
          value={query}
          placeholder={placeholder}
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck={false}
          onInput={e => onQueryChange((e.target as HTMLInputElement).value)}
        />
        {query && (
          <button
            class="ref-search-clear"
            type="button"
            aria-label="Clear search"
            onClick={() => onQueryChange("")}
          >×</button>
        )}
      </div>
      <div class="ref-filter-row">
        {categories.map(cat => (
          <button
            key={cat}
            class={`ref-filter-chip${cat === activeCategory ? " active" : ""}`}
            type="button"
            onClick={() => onCategoryChange(cat)}
          >{cat}</button>
        ))}
      </div>
    </div>
  );
}
