const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'main.js');
let content = fs.readFileSync(filepath, 'utf8');

function formatFeatures(match, prefix, text) {
    if (text.includes('\n-') || text.includes('\n*')) {
        return match;
    }

    // Split by semicolon
    const parts = text.split(';').map(p => p.trim()).filter(p => p);

    let formatted = "**Key Features:**\n";
    for (const part of parts) {
        formatted += `- ${part}\n`;
    }
    return formatted.trimEnd();
}

function formatLimitations(match, prefix, text) {
    if (text.includes('\n-') || text.includes('\n*')) {
        return match;
    }

    // Split by period
    const parts = text.split(/\.\s+|\.$/).map(p => p.trim()).filter(p => p);

    let formatted = "**Limitations:**\n";
    for (const part of parts) {
        formatted += `- ${part}.\n`;
    }
    return formatted.trimEnd();
}

content = content.replace(/(\*\*Key Features:\*\*\s*)([^\n]+)/g, formatFeatures);
content = content.replace(/(\*\*Limitations:\*\*\s*)([^\n`]+)/g, formatLimitations);

fs.writeFileSync(filepath, content, 'utf8');
console.log('Formatting successful via Node.');
