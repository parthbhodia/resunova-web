# Resunova Profile Flow Documentation

## 1. Complete Profile Creation Flow
- **Entry Point**: User accesses the Profile section from the sidebar/navigation.
- **State Check**: System checks the `profileStatus`.
- **New User**: If the user has no existing profile data (`profileStatus === 'new'`), present the onboarding screen.
- **Options Presented**: 
  - Option A: "Upload Resume" (Automated extraction)
  - Option B: "Build Manually" (Wizard-based entry)

## 2. Resume Upload Flow
- **Trigger**: User selects "Upload Resume" and drops/selects a PDF or DOCX file.
- **Uploading State**: Display loading indicator ("Uploading resume...").
- **Processing State**: Transition to AI analysis state ("Analyzing resume and extracting details...").
- **Extraction Phase**: AI extracts:
  - Personal Details (Name, Email, Phone, Links)
  - Education History
  - Skills
  - Experience History
  - Projects
- **Preview State**: Show the extracted data in a structured preview layout.
- **Review & Edit**: User can manually edit any incorrectly extracted fields or add missing ones.
- **Completion**: User clicks "Save Profile". System updates `profileStatus` to `completed` and redirects to the Profile Dashboard.

## 3. Manual Wizard Flow
- **Trigger**: User selects "Build Manually".
- **Wizard Structure**:
  - Step 1: Personal Information (Basic details, contact, social links)
  - Step 2: Education (Degrees, institutions, dates)
  - Step 3: Skills (Core competencies, tools, languages)
  - Step 4: Experience (Work history, roles, achievements)
  - Step 5: Projects (Key projects, links, descriptions)
  - Step 6: Review (Final overview of all entered data)
- **UI Elements**:
  - Global Progress Bar indicating current step.
  - "Next" and "Back" navigation buttons.
  - "Save Draft" or Auto-save functionality.
- **Completion**: On Step 6, user clicks "Publish Profile". Status updates to `completed`.

## 4. User Leaving Midway Flow (Incomplete Profile)
- **Trigger**: User navigates away or closes the browser during the Wizard or Resume review.
- **State Preservation**: 
  - Save `profileStatus = draft`.
  - Save `currentStep` (if in wizard) or the current state of extracted data.
  - Calculate and save `completionPercentage`.
- **Return Experience**:
  - When the user returns to the Profile section, display a banner/prompt: "Continue setting up your profile (X% complete)".
  - Clicking "Continue" resumes from the saved `currentStep` or the draft preview.

## 5. Existing User Flow (Completed Profile)
- **Trigger**: User with `profileStatus === 'completed'` navigates to Profile.
- **Dashboard View**: Present a modern SaaS dashboard displaying:
  - Profile Header (Avatar, Name, Title, Contact)
  - Career Summary
  - Skills Cloud/List
  - Timeline of Education and Experience
  - Projects Showcase
- **Analytics & Gamification**:
  - Profile Score (e.g., "Strength: Expert")
  - Completion Checklist ("Add a portfolio link to reach 100%")
  - AI Recommendations ("Consider adding more details to your latest role")
- **Update via Resume**: User can upload a new resume to update their profile.
  - **Conflict Resolution**: System compares old data vs. new extracted data. Shows a diff/confirmation screen asking the user before replacing existing information.

## 6. Edge Cases & Error Handling
- **Invalid File Type**: If a user uploads an unsupported file (e.g., .txt, .jpg instead of .pdf/.docx), show an immediate error message before upload begins.
- **Upload Failure**: If the network drops or the server rejects the file, display a retry button and a descriptive error message.
- **Missing Resume Sections**: If the AI cannot find certain sections (e.g., no Education found), highlight these sections in the preview as "Needs Attention" or leave them blank for manual entry.
- **Empty Profile Data**: If the manual wizard is submitted with completely empty fields, validate and prompt the user to at least fill in mandatory fields (e.g., Name, Email).
- **Existing Profile Updates**: During a new resume upload on an existing profile, ensure no data is silently overwritten. Always present a confirmation dialogue for changes.
