const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../public/manifest.json');
const packagePath = path.join(__dirname, '../package.json');

function bump(file) {
    if (!fs.existsSync(file)) return null;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const parts = data.version.split('.').map(Number);
    parts[2]++; // Bump patch version
    data.version = parts.join('.');
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    return data.version;
}

console.log('Bumping version...');
try {
    const newVersion = bump(manifestPath);
    if (newVersion) {
        console.log(`Updated manifest.json to version ${newVersion}`);
        
        // Sync package.json version
        if (fs.existsSync(packagePath)) {
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            pkg.version = newVersion;
            fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
            console.log(`Updated package.json to version ${newVersion}`);
        }
    } else {
        console.error('manifest.json not found!');
        process.exit(1);
    }
} catch (error) {
    console.error('Failed to bump version:', error);
    process.exit(1);
}
