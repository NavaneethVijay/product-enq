import { Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from './components/Header';
import { useCategories } from './hooks/useProducts';
import { CategoryPage } from './pages/CategoryPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { SearchPage } from './pages/SearchPage';

export function App() {
  const categories = useCategories();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const searchTerm = location.pathname === '/search' ? (params.get('q') ?? '') : '';

  return (
    <>
      <Header
        // The header still works (brand + search) if categories fail to load.
        categories={categories.status === 'success' ? categories.data : []}
        searchTerm={searchTerm}
        onSearch={(term) => navigate(`/search?q=${encodeURIComponent(term)}`)}
      />
      <main className="page">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
