// Convert database rows (snake_case) into the JSON shape the website uses

const num = (v) => (v === null || v === undefined ? 0 : Number(v));

export const toUser = (p) =>
  p && { _id: p.id, name: p.name, email: p.email, phone: p.phone, role: p.role, createdAt: p.created_at };

export const toCategory = (c) =>
  c && { _id: c.id, name: c.name, slug: c.slug, image: c.image ?? '', createdAt: c.created_at };

export function toDesign(d, { withPaths = false } = {}) {
  if (!d) return null;
  return {
    _id: d.id,
    code: d.code,
    sku: d.sku,
    name: d.name,
    description: d.description,
    // Joined rows give a category object, plain rows give the id (used by the admin form)
    category: d.category !== undefined ? toCategory(d.category) : d.category_id,
    machineType: d.machine_type,
    price: num(d.price),
    mrp: num(d.mrp),
    isFree: d.is_free,
    images: d.images || [],
    files: (d.files || []).map((f) =>
      withPaths
        ? { _id: f.id, format: f.format, path: f.path, originalName: f.originalName, size: f.size }
        : { _id: f.id, format: f.format, originalName: f.originalName, size: f.size }
    ),
    // The Drive link is only sent to admins; customers get it after an access check
    hasDrive: Boolean(d.drive_url),
    ...(withPaths ? { driveUrl: d.drive_url || '' } : {}),
    parts: d.parts || [],
    stitches: d.stitches,
    colors: d.colors,
    area: num(d.area),
    height: num(d.height),
    width: num(d.width),
    formats: d.formats || [],
    tags: d.tags || [],
    isActive: d.is_active,
    featured: d.featured,
    downloads: d.downloads,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

export const toPackage = (p) =>
  p && {
    _id: p.id,
    name: p.name,
    type: p.type,
    limit: p.limit_count,
    validityDays: p.validity_days,
    price: num(p.price),
    mrp: num(p.mrp),
    description: p.description,
    highlight: p.highlight,
    sort: p.sort,
    isActive: p.is_active,
  };

export const toOrder = (o) =>
  o && {
    _id: o.id,
    orderNumber: o.order_number,
    user: o.user !== undefined ? toUser(o.user) : o.user_id,
    items: o.items,
    total: num(o.total),
    phone: o.phone,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    status: o.status,
    razorpayOrderId: o.razorpay_order_id,
    razorpayPaymentId: o.razorpay_payment_id,
    upiRef: o.upi_ref,
    paidAt: o.paid_at,
    adminNote: o.admin_note,
    createdAt: o.created_at,
  };
