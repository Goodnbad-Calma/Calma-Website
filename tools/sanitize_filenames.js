const fs = require('fs');
const path = require('path');
const glob = require('glob');

const rootDir = path.resolve(__dirname, '..');
const imagesDir = path.join(rootDir, 'images');

// Helper to sanitize a name
function sanitizeName(name) {
    let newName = name.replace(/\s+/g, '-');
    // Remove non-ASCII, keep dots, hyphens, underscores
    newName = newName.replace(/[^a-zA-Z0-9\.\-\_]/g, '');
    newName = newName.toLowerCase();
    // Remove repeated hyphens
    newName = newName.replace(/-+/g, '-');
    // Remove leading/trailing hyphens
    newName = newName.replace(/^-+|-+$/g, '');
    
    if (newName === '' || newName === '.') {
        return 'renamed-' + Math.random().toString(36).substring(7);
    }
    return newName;
}

// 1. Scan all files/dirs in images/
console.log('Scanning images directory...');
const items = glob.sync('**/*', { cwd: imagesDir, mark: true });

// 2. Calculate mappings
const mappings = [];
items.forEach(item => {
    // item is like "Projects/GH220 الغدير/" or "Projects/GH220 الغدير/img.jpg"
    // Remove trailing slash for processing
    const isDir = item.endsWith('/');
    const cleanItem = isDir ? item.slice(0, -1) : item;
    
    const parts = cleanItem.split('/');
    const newParts = parts.map(p => sanitizeName(p));
    
    const oldPath = cleanItem;
    const newPath = newParts.join('/');
    
    if (oldPath !== newPath) {
        mappings.push({
            oldPath: oldPath,
            newPath: newPath,
            originalParts: parts,
            newParts: newParts,
            isDir: isDir
        });
    }
});

// Sort by depth (deepest first) to rename children before parents
mappings.sort((a, b) => b.originalParts.length - a.originalParts.length);

console.log(`Found ${mappings.length} items to rename.`);

// 3. Execute renames
// We must track the *full* old path -> *full* new path for HTML updates
const fullPathMappings = new Map();

mappings.forEach(m => {
    const parentDir = path.dirname(m.oldPath);
    const oldName = path.basename(m.oldPath);
    const newName = path.basename(m.newPath);
    
    if (oldName !== newName) {
        // Source is still at the old name (but parent dirs might be original path relative to current traversal?)
        // Wait, because we traverse deep-first, the parent directory hasn't been renamed yet.
        // So path.join(imagesDir, parentDir, oldName) is correct.
        
        const src = path.join(imagesDir, parentDir, oldName);
        const destDir = path.join(imagesDir, parentDir);
        const dest = path.join(destDir, newName);
        
        if (fs.existsSync(src)) {
            // Handle case-only rename on Windows
            if (src.toLowerCase() === dest.toLowerCase()) {
                const temp = dest + '_' + Date.now();
                fs.renameSync(src, temp);
                fs.renameSync(temp, dest);
            } else {
                if (fs.existsSync(dest)) {
                    console.log(`Warning: Destination exists ${dest}. Skipping.`);
                } else {
                    fs.renameSync(src, dest);
                }
            }
            console.log(`Renamed: ${oldName} -> ${newName}`);
        } else {
            console.log(`Warning: Source not found ${src}`);
        }
    }
    
    // Add to map for HTML updates
    // We want "images/" + oldPath -> "images/" + newPath
    // But we need to handle "Projects/GH220 الغدير/img.jpg" -> "projects/gh220-al-ghadeer/img.jpg"
    // The m.oldPath is "Projects/GH220 الغدير/img.jpg"
    // The m.newPath is "projects/gh220-al-ghadeer/img.jpg"
    // This is exactly what we need.
    // However, we only processed the *segments*.
    // Wait, m.newPath was constructed by sanitizing *all* parts.
    // This is the correct *final* path.
    // So we can map oldPath -> newPath directly.
    fullPathMappings.set(m.oldPath, m.newPath);
});

// 4. Update HTML files
console.log('Updating HTML files...');
const htmlFiles = glob.sync('**/*.html', { cwd: rootDir, ignore: ['node_modules/**'] });

htmlFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Find all src/href/srcset
    const attrRegex = /(src|href|data-src|srcset)=[\"']([^\"']+)[\"']/g;
    
    content = content.replace(attrRegex, (match, attr, value) => {
        // Handle srcset
        if (attr === 'srcset') {
            const parts = value.split(',').map(part => {
                part = part.trim();
                const spaceIndex = part.lastIndexOf(' ');
                let url, descriptor;
                if (spaceIndex > -1) {
                    url = part.substring(0, spaceIndex);
                    descriptor = part.substring(spaceIndex);
                } else {
                    url = part;
                    descriptor = '';
                }
                return processUrl(url) + descriptor;
            });
            return `${attr}="${parts.join(', ')}"`;
        }
        
        return `${attr}="${processUrl(value)}"`;
    });
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${file}`);
    }
});

function processUrl(url) {
    if (url.startsWith('http') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
        return url;
    }
    
    try {
        const decoded = decodeURIComponent(url);
        // Normalize slashes
        const normalized = decoded.replace(/\\/g, '/');
        
        // Check if this path contains any of our renamed files
        // The URL might be "images/Projects/..." or "../images/Projects/..."
        // Our mappings are relative to "images/".
        
        // Find if "images/" is in the path
        const imagesIndex = normalized.indexOf('images/');
        if (imagesIndex === -1) return url;
        
        const prefix = normalized.substring(0, imagesIndex + 7); // include "images/"
        const suffix = normalized.substring(imagesIndex + 7); // the part inside images/
        
        // Check if suffix matches any old path in our map
        // Since we renamed deep files, we have mappings for files.
        // But what if the URL points to a directory? (unlikely for src)
        
        // We have a map of `Projects/GH220 الغدير/img.jpg` -> `projects/gh220-al-ghadeer/img.jpg`
        // But we also have `Projects/GH220 الغدير` -> `projects/gh220-al-ghadeer`
        // If we only check exact match, we are good.
        
        if (fullPathMappings.has(suffix)) {
            const newSuffix = fullPathMappings.get(suffix);
            // Re-encode?
            // Since newSuffix is ASCII safe, encoding does nothing except maybe spaces if we left them (we didn't).
            return prefix + newSuffix;
        }
        
        // Fallback: maybe the suffix didn't change entirely, but parts of it did?
        // Actually, fullPathMappings contains ALL changed items.
        // If `suffix` is `Projects/Safe/img.jpg`, and only `Projects` changed to `projects`,
        // then `Projects/Safe/img.jpg` IS in the map because we iterated ALL files.
        // So checking the map is sufficient.
        
        return url;
    } catch (e) {
        return url;
    }
}
