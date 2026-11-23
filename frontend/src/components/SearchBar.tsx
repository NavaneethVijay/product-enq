import { type FormEvent, useState } from 'react';

interface SearchBarProps {
  initialTerm?: string;
  onSearch: (term: string) => void;
}

/** Searches only when the button is clicked (or Enter is pressed), per the acceptance criteria. */
export function SearchBar({ initialTerm = '', onSearch }: SearchBarProps) {
  const [term, setTerm] = useState(initialTerm);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = term.trim();
    if (trimmed) onSearch(trimmed);
  };

  return (
    <form role="search" className="search-bar" onSubmit={handleSubmit}>
      <label htmlFor="search-input" className="visually-hidden">
        Search products
      </label>
      <input
        id="search-input"
        type="search"
        placeholder="Search products"
        value={term}
        maxLength={100}
        onChange={(event) => setTerm(event.target.value)}
      />
      <button type="submit" className="button">
        Search
      </button>
    </form>
  );
}
