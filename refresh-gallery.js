const { execSync } = require('child_process');

function run(cmd) {
    console.log(`> ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
}

try {
    run('node normalize-extensions.js');
    run('node build-manifest.js');
    run('node rename-from-manifest.js');
    run('node generate-gallery-from-manifest.js');
    console.log('Gallery refreshed (manifest-driven).');
} catch (err) {
    console.error('Failed to refresh gallery:', err.message);
    process.exit(1);
}


