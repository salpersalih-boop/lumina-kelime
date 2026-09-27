import re

with open('futbol_words.js', 'r', encoding='utf-8') as f:
    raw_data = f.read().strip()

with open('script.js', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = f'''    Futbol: (function() {{
        const raw = {raw_data};
        return raw.split('\\n').filter(l => l.trim()).map((line, i) => {{
            const parts = line.split(';');
            return {{
                id: i + 1,
                groupId: Math.floor(i / 100) + 1,
                english: parts[1] ? parts[1].trim() : '',
                turkish: parts[3] ? parts[3].trim() : ''
            }};
        }});
    }})()'''

content = re.sub(
    r"    Futbol: \[\s*\{ id: 1, groupId: 1, english: 'Goal', turkish: 'Gol' \}.*?\]",
    replacement,
    content,
    flags=re.DOTALL
)

content = content.replace("let TOTAL_GROUPS_FUTBOL = 1;", "let TOTAL_GROUPS_FUTBOL = 5;")
content = content.replace("TOTAL_GROUPS_FUTBOL = 1;", "TOTAL_GROUPS_FUTBOL = Math.ceil(wordsData.length / 100);")
content = content.replace("Kelime • 1 Grup; // Fallback data", "Kelime •  Grup;")

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Script updated successfully!')
