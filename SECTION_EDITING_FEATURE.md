# Section Box-Wise Edit Feature

## Overview
Added the ability for users to click on section headings in the resume preview and edit them inline with an editable text box. This feature allows users to customize section titles (EXPERIENCE, EDUCATION, SKILLS, etc.) directly in the preview.

## Features Implemented

### 1. **Section Selection**
- Click on any section heading to select it
- Selected sections show visual feedback:
  - Accent color border (bottom border changes to accent color)
  - Subtle background highlight
  - "[Click to edit]" hint appears below the section name
- Click again to deselect (toggle behavior)

### 2. **Inline Section Editing**
- Once a section is selected, it can be edited
- Click on the selected section heading to enter edit mode
- A textarea appears with the current section name
- Users can modify the section title text
- Press `Escape` to cancel editing (reverts to original)
- Click away or blur to save changes

### 3. **Visual Feedback**
- **Normal state**: Section heading with standard styling
- **Selected state**: 
  - Accent-colored bottom border
  - Light background tint
  - "[Click to edit]" hint shown
- **Editing state**: 
  - Textarea with focused border
  - Full keyboard editing support

### 4. **User Experience**
- Non-destructive editing: Original text reverts if user presses Escape
- Keyboard navigation: Escape key cancels editing
- Single-click toggle: Click the same section to deselect
- Disabled in presentation-only mode (read-only mode)

## Technical Implementation

### Modified Files
1. **`components/AnnotatedResumePanel.tsx`**
   - Added `selectedSectionIdx` state to track selected section
   - Added `sectionEdits` state to store edited section content
   - Implemented `onSectionSelected` callback for section selection
   - Implemented `patchSectionEdit` callback for updating section edits
   - Passed these props to `AnalyzeLiveResumeBody`

2. **`components/AnalyzeLiveResumeBody.tsx`**
   - Added new props to `Props` interface for section editing
   - Updated function parameters to accept section editing props
   - Enhanced section heading rendering with:
     - Click handler for selection
     - Conditional rendering for normal vs. edit mode
     - Visual styling based on selection state
     - Textarea for inline editing

### Code Structure

```typescript
// State management in AnnotatedResumePanel
const [selectedSectionIdx, setSelectedSectionIdx] = useState<number | null>(null);
const [sectionEdits, setSectionEdits] = useState<Record<number, string>>({});

// Handlers
const onSectionSelected = (blockIdx: number) => {
  setSelectedSectionIdx(selectedSectionIdx === blockIdx ? null : blockIdx);
};

const patchSectionEdit = (blockIdx: number, value: string | null) => {
  setSectionEdits(prev => {
    if (value === null || value === "") {
      const { [blockIdx]: _, ...rest } = prev;
      return rest;
    }
    return { ...prev, [blockIdx]: value };
  });
};

// Rendering in AnalyzeLiveResumeBody
{!isEditing ? (
  <>
    {blk.text}
    {isSelected && !presentationOnly && (
      <span>[Click to edit]</span>
    )}
  </>
) : (
  <textarea
    autoFocus
    value={editValue}
    onChange={(e) => patchSectionEdit?.(bi, e.target.value)}
    // ... event handlers
  />
)}
```

## How to Use

1. **Upload or Analyze a Resume**
   - Use the Analyze feature to upload and analyze a resume

2. **Select a Section**
   - Click on any section heading (e.g., "EXPERIENCE", "EDUCATION", "SKILLS")
   - The section will be highlighted with an accent color border
   - A "[Click to edit]" hint will appear

3. **Edit the Section**
   - While the section is selected, a textarea appears
   - Type the new section name
   - Press `Escape` to cancel (reverts changes)
   - Click away to save changes

4. **View Changes**
   - Changes are reflected in the preview immediately
   - The PDF export includes the edited section names

## Future Enhancements

Potential improvements for future iterations:

1. **Full Section Content Editing**
   - Allow editing of entire section content (not just the heading)
   - Support for multi-line sections (experience entries, education items, etc.)

2. **Section Reordering**
   - Drag and drop to reorder sections
   - Add custom sections
   - Remove sections

3. **Section Templates**
   - Predefined section layouts
   - Custom section creation with templates

4. **Undo/Redo**
   - Track editing history
   - Undo/redo functionality for section edits

5. **Integration with Structured Resume**
   - Map edited sections to structured resume data
   - Two-way sync between edits and structured model

## Testing

The feature has been committed to the staging branch:
- Commit: `ee527c2`
- Message: `feat(section-editing): add box-wise section editing feature on PDF preview`

To test locally:
1. Ensure you're on the `staging` branch
2. Run `npm run dev`
3. Navigate to the Analyze page
4. Upload a resume and run analysis
5. Click on section headings in the preview to test the feature

## Browser Compatibility

Works on all modern browsers that support:
- React hooks and state management
- CSS flexbox and transitions
- HTML5 textarea elements
- ES2020+ JavaScript features
