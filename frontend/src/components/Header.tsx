import { Link, NavLink } from 'react-router-dom';
import type { Category } from '../api/client';
import { SearchBar } from './SearchBar';

interface HeaderProps {
  categories: Category[];
  searchTerm: string;
  onSearch: (term: string) => void;
}

export function Header({ categories, searchTerm, onSearch }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          Product Catalogue
        </Link>
        {/* key resets the input when the URL's search term changes (e.g. back button). */}
        <SearchBar key={searchTerm} initialTerm={searchTerm} onSearch={onSearch} />
      </div>
      {categories.length > 0 && (
        <nav aria-label="Categories" className="category-nav">
          <ul>
            {categories.map((category) => (
              <li key={category.slug}>
                <NavLink to={`/category/${category.slug}`}>{category.name}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
