import re

with open('components/ResumeExamplesData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

titles = [
    'Sleek Professional Resume',
    'Modern Color Accent Resume',
    'Professional and Clear Resume'
]

for title in titles:
    content = re.sub(r'(title: \"' + title + '\",)', r'\g<1>\n    isTealDemo: true,', content)

with open('components/ResumeExamplesData.ts', 'w', encoding='utf-8') as f:
    f.write(content)
