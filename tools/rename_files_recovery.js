const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const imagesDir = path.join(rootDir, 'images');

// EXACT SAME function as before
function sanitizeName(name) {
    let newName = name.replace(/\s+/g, '-');
    newName = newName.replace(/[^a-zA-Z0-9\.\-\_]/g, '');
    newName = newName.toLowerCase();
    newName = newName.replace(/-+/g, '-');
    newName = newName.replace(/^-+|-+$/g, '');
    
    if (newName === '' || newName === '.') {
        return 'renamed-' + Math.random().toString(36).substring(7);
    }
    return newName;
}

function processDir(dirPath) {
    console.log(`Processing directory: ${dirPath}`);
    let files;
    try {
        files = fs.readdirSync(dirPath);
    } catch (e) {
        console.error(`Error reading directory ${dirPath}:`, e);
        return;
    }

    // Process files first? Or dirs?
    // If I rename a directory, I can't process its content with old path.
    // But I am iterating `files` which are names.
    // If I rename `A` to `B`, then I should process `B`.
    
    // Let's process items.
    for (const file of files) {
        const oldFullPath = path.join(dirPath, file);
        const newName = sanitizeName(file);
        let newFullPath = path.join(dirPath, newName);
        
        let finalPath = oldFullPath;
        
        if (file !== newName) {
            // Rename needed
            if (oldFullPath.toLowerCase() === newFullPath.toLowerCase()) {
                // Case-only rename on Windows
                const tempPath = newFullPath + '_' + Date.now();
                try {
                    fs.renameSync(oldFullPath, tempPath);
                    fs.renameSync(tempPath, newFullPath);
                    console.log(`Renamed (case): ${file} -> ${newName}`);
                    finalPath = newFullPath;
                } catch (e) {
                    console.error(`Failed to rename ${file}:`, e);
                }
            } else {
                if (fs.existsSync(newFullPath)) {
                    console.log(`Warning: Destination exists ${newFullPath}. Skipping rename of ${file}.`);
                    // If directory, we merge? No, risky.
                    // Assuming structure is simple.
                    // If dest exists, we process dest.
                    finalPath = newFullPath;
                } else {
                    try {
                        fs.renameSync(oldFullPath, newFullPath);
                        console.log(`Renamed: ${file} -> ${newName}`);
                        finalPath = newFullPath;
                    } catch (e) {
                        console.error(`Failed to rename ${file}:`, e);
                    }
                }
            }
        }
        
        // If directory, recurse
        try {
            if (fs.statSync(finalPath).isDirectory()) {
                processDir(finalPath);
            }
        } catch (e) {
            console.error(`Error stat-ing ${finalPath}:`, e);
        }
    }
}

// Start
processDir(imagesDir);
