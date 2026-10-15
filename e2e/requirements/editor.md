# Feature: editor

## Happy paths

- [edit heading]: changing a section heading updates the editor
- [edit text]: changing text updates the editor
- [format text]: toggling bold marks the control active

## User interactions

- [section toggle]: clicking the section switch changes its pressed state
- [add section]: clicking add section creates a new section card
- [collapse]: clicking a section title hides its fields
- [nested delete]: deleting a nested section removes only that section

## Regression coverage

- [semantic fields]: editing a formatted row never exposes its backend markers
