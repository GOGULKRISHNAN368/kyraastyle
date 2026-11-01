import { useMemo, useState } from 'react';
import Checkbox from './Checkbox.jsx';
import Pagination from './Pagination.jsx';
import EmptyState from './EmptyState.jsx';

export default function DataTable({ columns, rows, rowKey = 'id', selectable = false, selectedIds, onSelectionChange, pageSize = 5, draggable = false, onReorder }) {
  const [sort, setSort] = useState({ key: '', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [localSelected, setLocalSelected] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const selected = selectedIds ?? localSelected;
  const ordered = useMemo(() => {
    const result = [...(rows || [])];
    if (sort.key) result.sort((a, b) => `${a[sort.key] ?? ''}`.localeCompare(`${b[sort.key] ?? ''}`, undefined, { numeric: true }) * (sort.direction === 'asc' ? 1 : -1));
    return result;
  }, [rows, sort]);
  const pages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const visible = ordered.slice((page - 1) * pageSize, page * pageSize);
  const toggle = (key) => {
    const next = selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key];
    if (selectedIds === undefined) setLocalSelected(next);
    onSelectionChange?.(next);
  };
  const dropRow = (event, targetIndex) => {
    event.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) return setDragIndex(null);
    const reordered = [...visible];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setDragIndex(null);
    onReorder?.(reordered);
  };
  if (!rows?.length) return <EmptyState title="No records found" description="Records will appear here when they are added."/>;
  const content = (row) => columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>);
  const cardContent = (row) => columns.map((column) => <div className="table-card-field" key={column.key}><span>{column.label}</span><div className="table-card-value">{column.render ? column.render(row) : row[column.key]}</div></div>);
  return <div className="data-table-wrap">
    <div className="table-scroll"><table className="data-table"><thead><tr>{draggable && <th><span className="sr-only">Reorder</span></th>}{selectable && <th><span className="sr-only">Select</span></th>}{columns.map((column) => <th key={column.key}>{column.sortable === false ? column.label : <button className="sort-button" onClick={() => setSort((s) => ({ key: column.key, direction: s.key === column.key && s.direction === 'asc' ? 'desc' : 'asc' }))}>{column.label}{sort.key === column.key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}</button>}</th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={row[rowKey]} draggable={draggable} onDragStart={() => setDragIndex(index)} onDragOver={(event) => draggable && event.preventDefault()} onDrop={(event) => draggable && dropRow(event, index)}>{draggable && <td><span className="drag-handle" aria-label="Drag to reorder">⠿</span></td>}{selectable && <td><Checkbox label={`Select ${row.name || row[rowKey]}`} checked={selected.includes(row[rowKey])} onChange={() => toggle(row[rowKey])}/></td>}{content(row)}</tr>)}</tbody></table></div>
    <div className="table-cards">{visible.map((row, index) => <article className="table-card" key={row[rowKey]} draggable={draggable} onDragStart={() => setDragIndex(index)} onDragOver={(event) => draggable && event.preventDefault()} onDrop={(event) => draggable && dropRow(event, index)}>{draggable && <span className="drag-handle" aria-label="Drag to reorder">⠿</span>}{selectable && <Checkbox label={`Select ${row.name || row[rowKey]}`} checked={selected.includes(row[rowKey])} onChange={() => toggle(row[rowKey])}/>}<div>{cardContent(row)}</div></article>)}</div>
    <Pagination page={page} pages={pages} onChange={setPage}/>
  </div>;
}
