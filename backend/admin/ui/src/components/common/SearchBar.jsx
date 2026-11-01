import Icon from './Icon.jsx';
export default function SearchBar({ value, onChange, placeholder = 'Search' }) {
  return <label className="search-field"><Icon name="search" size={18}/><input aria-label={placeholder} value={value} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder}/></label>;
}
