import { furnitureCatalog, type FurnitureDef } from './furnitureCatalog';

const aliases: Record<string, string[]> = {
  reference: ['reference', 'ref', 'sku', 'code', 'référence', 'reference fournisseur', 'code article'],
  name: ['name', 'nom', 'désignation', 'designation', 'article', 'produit'],
  type: ['type', 'famille', 'kind', 'nature'],
  width: ['width', 'largeur', 'l'],
  depth: ['depth', 'profondeur', 'p'],
  height: ['height', 'hauteur', 'h'],
  group: ['group', 'groupe', 'catégorie meuble', 'categorie meuble'],
};

function normalizeKey(value: string) { return value.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' '); }
function slug(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'article'; }
function parseNumber(value: unknown, label: string, row: number, optional = false): number | undefined {
  const raw = String(value ?? '').trim().replace(/\s/g, '').replace(',', '.');
  if (!raw && optional) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || (!optional && n === 0)) throw new Error('Ligne ' + row + ' : valeur « ' + label + ' » invalide.');
  return n;
}
function splitCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && c === delimiter) { row.push(cell.trim()); cell = ''; }
    else if (!quoted && (c === '\n' || c === '\r')) { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell.trim()); if (row.some(v => v !== '')) rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  row.push(cell.trim()); if (row.some(v => v !== '')) rows.push(row); return rows;
}
function getValue(row: Record<string, unknown>, key: keyof typeof aliases) {
  for (const alias of aliases[key]) { const found = row[normalizeKey(alias)]; if (found !== undefined) return found; }
  return undefined;
}
function normalizeType(value: unknown): 'furniture' | 'appliance' {
  const v = normalizeKey(String(value ?? 'meuble'));
  return /electro|appliance|menager|appareil/.test(v) ? 'appliance' : 'furniture';
}
function normalizeGroup(value: unknown, type: 'furniture' | 'appliance'): FurnitureDef['catalogGroup'] {
  const group = normalizeKey(String(value ?? ''));
  if (/appliance|electro|electromenager|appareil/.test(group)) return 'appliance';
  if (/wall|haut/.test(group)) return 'wall';
  if (/tall|colonne/.test(group)) return 'tall';
  if (/island|ilot/.test(group)) return 'island';
  if (/filler|fileur/.test(group)) return 'filler';
  if (/base|bas/.test(group)) return 'base';
  return type === 'appliance' ? 'appliance' : 'base';
}

function makeItem(row: Record<string, unknown>, index: number): FurnitureDef {
  const line = index + 2; const reference = String(getValue(row, 'reference') ?? '').trim(); const name = String(getValue(row, 'name') ?? '').trim();
  if (!reference) throw new Error('Ligne ' + line + ' : la référence est obligatoire.');
  if (!name) throw new Error('Ligne ' + line + ' : le nom est obligatoire.');
  const width = parseNumber(getValue(row, 'width'), 'largeur', line)!; const depth = parseNumber(getValue(row, 'depth'), 'profondeur', line)!; const height = parseNumber(getValue(row, 'height'), 'hauteur', line)!;
  return { id: 'custom-' + slug(reference), name, category: 'Kitchen', reference, width, depth, height, catalogGroup: normalizeGroup(getValue(row, 'group'), normalizeType(getValue(row, 'type'))), productType: normalizeType(getValue(row, 'type')), icon: normalizeType(getValue(row, 'type')) === 'appliance' ? '🔌' : '🗄️', color: '#cbd5e1' };
}

export function parseFurnitureCatalog(text: string, format: 'csv' | 'json'): FurnitureDef[] {
  if (text.length > 5 * 1024 * 1024) throw new Error('Le fichier dépasse la limite de 5 Mo.');
  let records: Record<string, unknown>[];
  if (format === 'json') {
    let parsed: unknown; try { parsed = JSON.parse(text); } catch { throw new Error('Le fichier JSON est illisible.'); }
    const source = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).items) ? (parsed as any).items : null);
    if (!source) throw new Error('Le JSON doit être un tableau d’articles ou contenir une clé « items ».');
    records = (source as unknown[]).map((item, i) => { if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Article ' + (i + 1) + ' : objet invalide.'); return Object.fromEntries(Object.entries(item).map(([k,v]) => [normalizeKey(k),v])); });
  } else {
    const first = text.split(/\r?\n/, 1)[0] ?? ''; const delim = [';', ',', '\t'].sort((a,b) => first.split(b).length - first.split(a).length)[0]; const rows = splitCsv(text.replace(/^\uFEFF/, ''), delim);
    if (rows.length < 2) throw new Error('Le CSV doit contenir une ligne d’en-têtes et au moins un article.');
    const keys = rows[0].map(normalizeKey); records = rows.slice(1).map(values => Object.fromEntries(keys.map((key,i) => [key, values[i] ?? ''])));
  }
  if (!records.length) throw new Error('Aucun article à importer.');
  const result = records.map(makeItem); const seen = new Set<string>();
  for (const item of result) { const key = item.reference!.toLocaleLowerCase(); if (seen.has(key)) throw new Error('Référence en double dans le fichier : ' + item.reference); seen.add(key); }
  return result;
}

export function mergeFurnitureCatalog(existing: FurnitureDef[], incoming: FurnitureDef[]) {
  const byReference = new Map(existing.map(item => [item.reference?.toLocaleLowerCase() ?? item.id, item]));
  for (const imported of incoming) {
    const reference = imported.reference!.toLocaleLowerCase();
    const starter = furnitureCatalog.find(item => item.reference?.toLocaleLowerCase() === reference);
    const current = byReference.get(reference);
    byReference.set(reference, { ...imported, id: starter?.id ?? current?.id ?? imported.id, customized: true });
  }
  return [...byReference.values()];
}

function csvCell(value: string | number | undefined) {
  const text = value == null ? '' : String(value);
  const quote = String.fromCharCode(34);
  const escaped = text.split(quote).join(quote + quote);
  return quote + escaped + quote;
}

export function furnitureCatalogToCsv(items: FurnitureDef[]) {
  const header = ['reference', 'nom', 'type', 'groupe', 'largeur', 'profondeur', 'hauteur'];
  const rows = items.map(item => [item.reference ?? item.id, item.name, item.productType === 'appliance' ? 'electromenager' : 'meuble', item.catalogGroup ?? (item.productType === 'appliance' ? 'appliance' : 'base'), item.width, item.depth, item.height].map(csvCell).join(';'));
  const newline = String.fromCharCode(10);
  return [header.join(';'), ...rows].join(newline) + newline;
}
