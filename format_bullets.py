import re
import os

filepath = r"d:\My_Portfolio\main.js"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

def format_features(match):
    text = match.group(2)
    # Don't re-format if already formatted (contains line breaks starting with -)
    if '\n-' in text or '\n*' in text:
        return match.group(0)

    # Split by semicolon
    parts = [p.strip() for p in text.split(';')]
    parts = [p for p in parts if p]
    
    formatted = "**Key Features:**\n"
    for part in parts:
        formatted += f"- {part}\n"
    return formatted.rstrip()

def format_limitations(match):
    text = match.group(2)
    # Don't re-format if already formatted
    if '\n-' in text or '\n*' in text:
        return match.group(0)

    # Split by period followed by space, or period at end of string
    parts = [p.strip() for p in re.split(r'\.\s+|\.$', text)]
    parts = [p for p in parts if p]
    
    formatted = "**Limitations:**\n"
    for part in parts:
        # put the period back for limitations since we split by it
        formatted += f"- {part}.\n"
    return formatted.rstrip()

content = re.sub(r'(\*\*Key Features:\*\*\s*)([^\n]+)', format_features, content)
content = re.sub(r'(\*\*Limitations:\*\*\s*)([^\n`]+)', format_limitations, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Formatting successful.")
