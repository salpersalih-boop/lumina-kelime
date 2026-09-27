const fs = require('fs');
let raw_data = fs.readFileSync('futbol_words.js', 'utf8').trim();
let content = fs.readFileSync('script.js', 'utf8');

const replacement = `    Futbol: (function() {
        const raw = \`${raw_data.replace(/`/g, '\\`')}\`;
        return raw.split('\\n').filter(l => l.trim()).map((line, i) => {
            const parts = line.split(';');
            return {
                id: i + 1,
                groupId: Math.floor(i / 100) + 1,
                english: parts[1] ? parts[1].trim() : '',
                turkish: parts[3] ? parts[3].trim() : ''
            };
        });
    })()`;

content = content.replace(/    Futbol: \[\s*\{ id: 1, groupId: 1, english: 'Goal', turkish: 'Gol' \}[\s\S]*?\]/g, replacement);

content = content.replace("let TOTAL_GROUPS_FUTBOL = 1;", "let TOTAL_GROUPS_FUTBOL = 5;");
content = content.replace("TOTAL_GROUPS_FUTBOL = 1;", "TOTAL_GROUPS_FUTBOL = Math.ceil(wordsData.length / 100);");
content = content.replace("Kelime • 1 Grup`; // Fallback data", "Kelime • ${Math.ceil(FALLBACK_DATA.Futbol.length / 100)} Grup`; // Fallback data");

fs.writeFileSync('script.js', content, 'utf8');
console.log('Script updated successfully via Node.js!');
