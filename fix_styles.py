import re

teal_styles = ['teal-clean', 'teal-professional', 'teal-modern', 'teal-clear']
idx = 0

with open('components/ResumeExamplesData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

def replace_style(match):
    global idx
    style = teal_styles[idx % 4]
    idx += 1
    return match.group(1) + '\"stylePreset\": \"' + style + '\"'

new_content = re.sub(r'(\"customization\": \{.*?)\"stylePreset\": \"modern\"', replace_style, content)

with open('components/ResumeExamplesData.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Done!')
