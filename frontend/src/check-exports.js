const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const isPageFile = fileName === 'page.tsx' || fileName === 'page.ts';
    const isLayoutFile = fileName === 'layout.tsx' || fileName === 'layout.ts';
    const isRouteFile = fileName === 'route.ts' || fileName === 'route.tsx';

    if (isPageFile || isLayoutFile) {
        // Check for default export
        if (!content.includes('export default')) {
            console.log(`❌ Missing default export in: ${filePath}`);
            return false;
        }
        // Check for arrow function default export (which can cause issues)
        if (content.match(/export\s+default\s*=\s*\(/)) {
            console.log(`⚠️  Arrow function default export in: ${filePath}`);
        }
    }

    if (isRouteFile) {
        // Check for invalid default export in route files
        if (content.includes('export default')) {
            console.log(`❌ Route file should not have default export: ${filePath}`);
            return false;
        }
        // Check for at least one HTTP method export
        const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
        const hasHttpMethod = httpMethods.some(method =>
            content.includes(`export async function ${method}`) ||
            content.includes(`export function ${method}`) ||
            content.includes(`export const ${method}`)
        );

        if (!hasHttpMethod) {
            console.log(`❌ Route file missing HTTP method exports: ${filePath}`);
            return false;
        }
    }

    return true;
}

function checkDirectory(dir) {
    const files = fs.readdirSync(dir);
    let hasErrors = false;

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            hasErrors = checkDirectory(filePath) || hasErrors;
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            if (!checkFile(filePath)) {
                hasErrors = true;
            }
        }
    });

    return hasErrors;
}

// Check the app directory
const appDir = path.join(process.cwd(), 'src', 'app');
console.log('Checking exports in app directory...\n');

const hasErrors = checkDirectory(appDir);

if (!hasErrors) {
    console.log('\n✅ All exports look correct!');
} else {
    console.log('\n❌ Found export issues. Please fix the above problems.');
}