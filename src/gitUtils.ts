export function makeBranchSlug(id: number | string, title?: string, prefix = 'feature') {
  const raw = String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const slug = raw || `wi-${id}`;
  return `${prefix}/wi-${id}-${slug}`;
}
