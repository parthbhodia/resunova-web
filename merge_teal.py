import re

with open('components/ResumeExamplesData_teal.ts', 'r', encoding='utf-8') as f:
    teal_content = f.read()

with open('components/ResumeExamplesData.ts', 'r', encoding='utf-8') as f:
    main_content = f.read()

# Extract tinaMillerData
tina_match = re.search(r'(const tinaMillerData = .*?});', teal_content, re.DOTALL)
tina_code = tina_match.group(1) if tina_match else ''

# Extract array elements
teal_array_match = re.search(r'export const RESUME_EXAMPLES_DATA = \[(.*?)\];', teal_content, re.DOTALL)
teal_elements = teal_array_match.group(1).strip() if teal_array_match else ''

# Insert into main content
main_match = re.search(r'export const RESUME_EXAMPLES_DATA = \[(.*?)\];', main_content, re.DOTALL)
if main_match:
    main_elements = main_match.group(1).strip()
    
    # Prepend tinaMillerData before the export
    new_content = main_content[:main_match.start()] + tina_code + '\n\nexport const RESUME_EXAMPLES_DATA = [\n' + teal_elements + ',\n' + main_elements + '\n];\n'
    
    with open('components/ResumeExamplesData.ts', 'w', encoding='utf-8') as out:
        out.write(new_content)
    print("Merge successful")
else:
    print("Merge failed")
