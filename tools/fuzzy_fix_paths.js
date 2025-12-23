const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const imagesDir = path.join(rootDir, 'images');

// Function to sanitize a string for comparison
function sanitizeForMatch(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// 1. Build an index of all files in images/
// Map: fileName (sanitized) -> Array of full relative paths
const fileIndex = new Map();

function indexFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            indexFiles(fullPath);
        } else {
            const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
            const fileName = path.basename(file);
            const sanitizedName = sanitizeForMatch(fileName);
            
            if (!fileIndex.has(sanitizedName)) {
                fileIndex.set(sanitizedName, []);
            }
            fileIndex.get(sanitizedName).push(relativePath);
        }
    });
}

console.log('Indexing files...');
try {
    indexFiles(imagesDir);
} catch (e) {
    console.error("Error indexing images:", e);
}
console.log(`Indexed ${fileIndex.size} unique file names.`);

// 2. Process HTML files
function findHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                findHtmlFiles(filePath, fileList);
            }
        } else {
            if (path.extname(file).toLowerCase() === '.html') {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

const htmlFiles = findHtmlFiles(rootDir);
console.log(`Found ${htmlFiles.length} HTML files:`);
htmlFiles.forEach(f => console.log(` - ${path.relative(rootDir, f)}`));

htmlFiles.forEach(filePath => {
    console.log(`Processing ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    const imgRegex = /<img[^>]+src=(["'])(.*?)\1/gi;

    content = content.replace(imgRegex, (match, quote, srcPath) => {
        if (srcPath.startsWith('http') || srcPath.startsWith('data:') || srcPath.startsWith('//')) {
            return match;
        }

        // Special fix for Calma Tower dummy image (ALWAYS CHECK FIRST)
        if (srcPath.includes('dummy_400x300') && (filePath.includes('index.html') || filePath.includes('projects.html'))) {
            const newPath = 'images/projects/projectscalma-tower/reception-copy.png';
            console.log(`  Fixed (dummy image): "${srcPath}" -> "${newPath}"`);
            modified = true;
            return match.replace(srcPath, newPath);
        }
        
        // Special fix for AR270 missing image (ALWAYS CHECK FIRST)
        if (srcPath.includes('AR270') && srcPath.includes('cover.jpg')) {
             const newPath = 'images/projects/projectscalma-tower/01.jpg';
             console.log(`  Fixed (missing AR270): "${srcPath}" -> "${newPath}"`);
             modified = true;
             return match.replace(srcPath, newPath);
        }

        // Check if file exists exactly as is (resolve relative to HTML file location)
        // If srcPath starts with /, it's root relative
        // If not, it's relative to filePath
        
        let absolutePath;
        if (srcPath.startsWith('/')) {
            absolutePath = path.join(rootDir, srcPath);
        } else {
            absolutePath = path.resolve(path.dirname(filePath), srcPath);
        }

        if (fs.existsSync(absolutePath)) {
            return match;
        }
        
        // Also check if it exists relative to root (common mistake: using "images/..." in subfolder without ../)
        const rootPathAttempt = path.join(rootDir, srcPath);
        if (fs.existsSync(rootPathAttempt)) {
             // It exists at root!
             // We should fix the path to be root-relative or correct relative path
             // Let's use root-relative for simplicity: "/images/..."
             const newPath = '/' + srcPath.replace(/\\/g, '/').replace(/^\//, '');
             console.log(`  Fixed (path relative to root): "${srcPath}" -> "${newPath}"`);
             modified = true;
             return match.replace(srcPath, newPath);
        }

        // Try to find it via fuzzy match
                try {
                    const decodedPath = decodeURIComponent(srcPath);
            const fileName = path.basename(decodedPath);
            const sanitizedFileName = sanitizeForMatch(fileName);
            
            const candidates = fileIndex.get(sanitizedFileName);
            
            if (candidates && candidates.length > 0) {
                // ... (matching logic same as before)
                // Find best match based on parent directory
                const parentDir = path.dirname(decodedPath);
                const sanitizedParent = sanitizeForMatch(parentDir);
                
                let bestMatch = null;
                let maxScore = -1;
                
                // ... (reuse existing matching logic or simplify)
                // Let's copy the logic from before but improved
                
                 candidates.forEach(candidate => {
                     // candidate is "images/foo/bar.jpg" (relative to root)
                     const candidateParent = path.dirname(candidate);
                     const sanitizedCandidateParent = sanitizeForMatch(candidateParent);
                     
                     let score = 0;
                     if (sanitizedCandidateParent.includes(sanitizedParent) || sanitizedParent.includes(sanitizedCandidateParent)) {
                         score += 10;
                     }
                     if (sanitizedCandidateParent.includes('projects' + sanitizedParent)) {
                         score += 5;
                     }
                     
                     // Name match (exact file name match is guaranteed by map key)
                     
                     // Folder overlap check
                     const srcParts = decodedPath.split('/').map(p => sanitizeForMatch(p)).filter(p => p.length > 0);
                     const candParts = candidate.split('/').map(p => sanitizeForMatch(p)).filter(p => p.length > 0);
                     
                     srcParts.forEach(part => {
                        if (candParts.some(cp => cp.includes(part) || part.includes(cp))) {
                            score += 1;
                        }
                     });
                     
                     if (score > maxScore) {
                         maxScore = score;
                         bestMatch = candidate;
                     }
                 });
                
                if (bestMatch) {
                    // bestMatch is relative to root (e.g. "images/foo.jpg")
                    // We want to insert it.
                    // If we are in a subfolder, we can use root-relative path "/images/foo.jpg"
                    // to be safe and consistent.
                    
                    const newPath = '/' + bestMatch;
                    
                    console.log(`  Fixed (fuzzy): "${srcPath}" -> "${newPath}"`);
                    modified = true;
                    return match.replace(srcPath, newPath);
                }
            } else {
                  console.log(`  Warning: No candidate found for "${srcPath}" (File: ${fileName})`);
            }

        } catch (e) {
            console.error(`  Error processing path "${srcPath}":`, e);
        }

        return match;
            });

            // Process link tags (preload, etc.)
            const linkRegex = /<link[^>]+href=([\"'])(.*?)\\1/gi;
            content = content.replace(linkRegex, (match, quote, srcPath) => {
                if (srcPath.startsWith('http') || srcPath.startsWith('data:') || srcPath.startsWith('//') || srcPath.endsWith('.css') || srcPath.endsWith('.js')) {
                    return match;
                }
                
                // Decode URI if it's encoded (like Arabic paths)
                let decodedPath = srcPath;
                try {
                    decodedPath = decodeURIComponent(srcPath);
                } catch (e) {}

                // Check if file exists exactly as is
                let absolutePath;
                if (srcPath.startsWith('/')) {
                    absolutePath = path.join(rootDir, srcPath);
                } else {
                    absolutePath = path.resolve(path.dirname(filePath), decodedPath);
                }

                if (fs.existsSync(absolutePath)) {
                    return match;
                }

                 // Try fuzzy match for link hrefs too
                try {
                    const fileName = path.basename(decodedPath);
                    const sanitizedFileName = sanitizeForMatch(fileName);
                    const candidates = fileIndex.get(sanitizedFileName);

                    if (candidates && candidates.length > 0) {
                         // Simple first match for now or best match logic
                         const bestMatch = candidates[0]; // Simplified for brevity, reuse logic if needed
                         const newPath = '/' + bestMatch;
                         console.log(`  Fixed Link (fuzzy): "${srcPath}" -> "${newPath}"`);
                         modified = true;
                         return match.replace(srcPath, newPath);
                    }
                } catch (e) {}
                
                return match;
            });
            
            // Process srcset
            const srcsetRegex = /srcset=([\"'])(.*?)\\1/gi;
            content = content.replace(srcsetRegex, (match, quote, srcsetVal) => {
                let newSrcset = srcsetVal.split(',').map(part => {
                    let trimmed = part.trim();
                    let spaceIndex = trimmed.lastIndexOf(' ');
                    let url = spaceIndex > -1 ? trimmed.substring(0, spaceIndex) : trimmed;
                    let desc = spaceIndex > -1 ? trimmed.substring(spaceIndex) : '';
                    
                    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('//')) {
                        return part;
                    }
                    
                    // Logic to fix url
                    let decodedUrl = url;
                    try { decodedUrl = decodeURIComponent(url); } catch(e){}
                    
                    // Quick check if exists
                     let absolutePath;
                    if (url.startsWith('/')) {
                        absolutePath = path.join(rootDir, url);
                    } else {
                        absolutePath = path.resolve(path.dirname(filePath), decodedUrl);
                    }
                    
                    if (fs.existsSync(absolutePath)) {
                        return part;
                    }
                    
                    // Fuzzy match
                    try {
                        const fileName = path.basename(decodedUrl);
                        const sanitizedFileName = sanitizeForMatch(fileName);
                        const candidates = fileIndex.get(sanitizedFileName);
                        if (candidates && candidates.length > 0) {
                            const bestMatch = candidates[0];
                             const newUrl = '/' + bestMatch;
                             // console.log(`  Fixed Srcset: "${url}" -> "${newUrl}"`);
                             return newUrl + desc;
                        }
                    } catch(e) {}
                    
                    // Special fix for dummy in srcset
                    if (url.includes('dummy_400x300')) {
                        return 'images/projects/projectscalma-tower/reception-copy.png' + desc;
                    }

                    return part;
                }).join(', ');
                
                if (newSrcset !== srcsetVal) {
                    console.log(`  Fixed Srcset in ${path.basename(filePath)}`);
                    modified = true;
                    return `srcset=${quote}${newSrcset}${quote}`;
                }
                return match;
            });

            if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  Updated ${filePath}`);
    }
});


