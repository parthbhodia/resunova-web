import re

with open('components/ResumeExamplesData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Just find the index of "Clean Balanced Resume Template"
idx = content.find('"Clean Balanced Resume Template"')

if idx != -1:
    # Look backwards for the {
    start_idx = content.rfind('{', 0, idx)
    
    if start_idx != -1:
        brace_count = 0
        end_idx = -1
        for i in range(start_idx, len(content)):
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_idx = i + 1
                    break
        
        if end_idx != -1:
            old_element = content[start_idx:end_idx]
            new_element = old_element.replace('Clean Balanced Resume Template', 'Modern Bookmark Resume')
            new_element = new_element.replace('teal-clean', 'teal-bookmark')
            new_element = new_element.replace('The Clean Balanced Template is all about clarity and simplicity. With its balanced use of space and monochromatic color scheme, this design accentuates your professional story without distractions.', 'The Modern Bookmark Template features a striking two-column grid with bold section headers on the left, paired with a vibrant accent bookmark for maximum visual impact.')
            
            # Insert
            content = content[:end_idx] + ',\n  ' + new_element + content[end_idx:]
            
            with open('components/ResumeExamplesData.ts', 'w', encoding='utf-8') as f:
                f.write(content)
            print("Successfully added Bookmark Template!")
        else:
            print("Could not find end of object")
    else:
        print("Could not find {")
else:
    print("Could not find title")
