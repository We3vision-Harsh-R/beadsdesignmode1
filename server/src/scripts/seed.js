// Adds the starter design categories to Supabase (safe to run again)
import { db, q } from '../config/supabase.js';
import { slugify } from '../utils/helpers.js';

const CATEGORIES = [
  'Saree', 'Saree Pallu', 'Blouse', 'Lehenga', 'Dress', 'Kurti', 'Neck (Gala)', 'Dupatta',
  'Top & Dupatta', 'Garment Allover', 'Butta / Butti', 'Border / Lace', 'Daman', 'Logo',
  'Figures', 'Cross Stitch', 'Small Machine', 'Other',
];

await q(
  db.from('categories').upsert(
    CATEGORIES.map((name) => ({ name, slug: slugify(name) })),
    { onConflict: 'slug', ignoreDuplicates: true }
  )
);
console.log(`Categories ready: ${CATEGORIES.length}. Add designs and packages from the admin panel.`);
