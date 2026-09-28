import { useEffect, useState } from 'react';
import { api } from '../api';
import CategoryTile from '../components/CategoryTile';
import { Loader } from '../components/Guards';

export default function Categories() {
  const [list, setList] = useState(null);

  useEffect(() => {
    api('/categories').then(setList).catch(() => setList([]));
  }, []);

  if (!list) return <Loader />;

  return (
    <>
      <h1>Embroidery design categories</h1>
      <p className="muted">Pick a category to see all its designs.</p>
      <div className="cat-grid mt">
        {list.map((c) => <CategoryTile key={c._id} category={c} />)}
      </div>
    </>
  );
}
