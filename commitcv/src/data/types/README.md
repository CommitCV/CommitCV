# Resume Data Structure

The `resume.json` file needs to contain the following structure. 
For the following arrays *styled like* `[]` you can leave them empty and they will not display, but they are required.
```json
{
  "file_name": "string",
  "last_saved_date": "date",
  "date_created": "date",
  "schema_version": 1,
  "sections": []
}
```

`file_name` is the name of the resume file when exported (without file extension).
`last_saved_date` is the date the resume was last saved.
`date_created` is the date the resume was created.
`schema_version` is the version of the resume schema (currently 1).
`sections` is an array of section objects (see Sections below).

## Sections
The format for the sections are as follows:
```json
{
  "title": "string",
  "type": "string",
  "toggled": true,
  "content": [],
  "subsections": []
}
```

**The only required fields are `type` and `title` and `toggled`.**

`title` is the Heading of the section (e.g. "Work Experience", "Education", etc).
`type` is the type of section to render (see Section Types below) (if the type has the prefix `sub` then title is not rendered.
`toggled` to indicate if the section is enabled or disabled.
`content` is an array to hold text content objects (see Content section below) (optional; can be left empty).
`subsections` is an array to hold additional sections (see Sections section below) (optional; can be left empty).

Both `content` and `subsections` can be used together or independently. To add content or subsections use the syntax:
```json
{
  "content": [
    {"text": "..."},
    {"text": "..."}
  ],
  "subsections": [
    {"title": "..."},
    {"title": "..."}
  ]
}
```
### Section Types

Sections with the `sub-` tag in front of any of the types will not render the header.

| Type      | Description                                                                                                                      | Preview  |
|-----------|----------------------------------------------------------------------------------------------------------------------------------|----------|
| header    | The main header section with the first element containing the name, and the following content displayed on the contact info line | link tbd |
| full-text | Section that has text take up the full width of the page                                                                         | link tbd |
| two-split | Two text content is split to each side                                                                                           | link tbd |
| two-three-split| Two text values left aligned, and one right aligned                                                                              | link tbd |


## Content
All content stored in the resume is stored as text objects in the content array of the section(s).

This is formatted as follows:

```json
{
  "text": "text content",
  "flags": [],
  "toggled": true
}
```

`flags` to indicate the formatting that should be applied to the text content. See the table below for all available flags and their syntax.
`toggeled` to indicate if the content is enabled or disabled.

### Content Flags

| flag | Description                                           | Syntax           | `json` code example                                                                                                                                 | preview         |
|---|-------------------------------------------------------|------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|----------------|
| bold | Bolds the text as indicated                           | \*\*text\*\*     | <pre>{<br/>    "text": "This is an example of \*\*bold text\*\*",<br/>    "flags":["bold"],<br/>    "toggled": true<br/>}</pre>                     | **bold text**   |
| italic | Italicizes the text as indicated                      | \*text\*         | <pre>{<br/>    "text": "This is an example of \*italic text\*",<br/>    "flags":["italic"],<br/>    "toggled": true<br/>}</pre>                     
| underline | Underlines the text as indicated                      | \_\_text\_\_     | <pre>{<br/>    "text": "This is an example of \_\_underlined text\_\_",<br/>    "flags":["underline"],<br/>    "toggled": true<br/>}</pre>          
| strikethrough | Strikes through the text as indicated                 | \~\~text\~\~     | <pre>{<br/>    "text": "This is an example of \~\~striked-through text\~\~",<br/>    "flags":["strikethrough"],<br/>    "toggled": true<br/>}</pre> 
| link | Makes the text a clickable link and underlines it     | \[text\]\(url\)  | <pre>{<br/>    "text": "This is an example of a \[link\]\(https://google.com\)",<br/>    "flags":["link"],<br/>    "toggled": true<br/>}</pre>      
| icon| Renders a font-awesome icon before the text | \$fa-icon-name\$ | <pre>{<br/>    "text": "This is an example of font awesome icon \$fa-file\$",<br/>    "flags":["icon"],<br/>    "toggled": true<br/>}</pre>         
| bullet | Starts the text with a bullet                         | N/A              | <pre>{<br/>    "text": "This is an example of a bullet point",<br/>    "flags":["bullet"],<br/>    "toggled": true<br/>}</pre>                      
| bigger | Makes the full text content larger (Used for headers) | N/A              | <pre>{<br/>    "text": "This is an example of bigger text",<br/>    "flags":["bigger"],<br/>    "toggled": true<br/>}</pre>                         