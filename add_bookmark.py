import re

with open('components/ResumeExamplesData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Copy the first element (Clean Balanced Resume Template) and modify it for Bookmark
match = re.search(r'  \{\n    title: \"Clean Balanced Resume Template\",(.*?)skills: \{(.*?)\}\n    \}\n  \},', content, re.DOTALL)
if match:
    # Construct new element
    old_element = match.group(0)
    new_element = old_element.replace('Clean Balanced Resume Template', 'Modern Bookmark Resume')
    new_element = new_element.replace('teal-clean', 'teal-bookmark')
    new_element = new_element.replace('The Clean Balanced Template is all about clarity and simplicity. With its balanced use of space and monochromatic color scheme, this design accentuates your professional story without distractions.', 'The Modern Bookmark Template features a striking two-column grid with bold section headers on the left, paired with a vibrant accent bookmark for maximum visual impact.')
    
    # Insert it right after the first element
    content = content.replace(old_element, old_element + '\n' + new_element)
    
    with open('components/ResumeExamplesData.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added Bookmark Template")
else:
    print("Could not find base template")
