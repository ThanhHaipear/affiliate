import { Link } from "react-router-dom";

function CategoryMenu({ categories = [] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {categories.map((category) => (
        <Link
          key={category.value || category.name}
          to={category.to || `/products?category=${encodeURIComponent(category.value || category.name)}`}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-cyan-300 hover:text-slate-900"
        >
          {category.label || category.name}
        </Link>
      ))}
    </div>
  );
}

export default CategoryMenu;
