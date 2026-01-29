const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../public/manifest.json');
const packagePath = path.join(__dirname, '../package.json');
const newVersion = process.argv[2];

if (!newVersion) {
    console.error('Please provide a version number');
    process.exit(1);
}

// Validate version format (x.y.z)
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    console.error('Invalid version format. Please use x.y.z');
    process.exit(1);
}

try {
    if (fs.existsSync(manifestPath)) {
        const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        data.version = newVersion;
        fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2));
        console.log(`Updated manifest.json to version ${newVersion}`);
    } else {
        console.error('manifest.json not found!');
        process.exit(1);
    }

    // Sync package.json version
    if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        pkg.version = newVersion;
        fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
        console.log(`Updated package.json to version ${newVersion}`);
    }
} catch (error) {
    console.error('Failed to update version:', error);
    process.exit(1);
}
