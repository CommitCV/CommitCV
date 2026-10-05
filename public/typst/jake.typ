// CommitCV's resume template. Everything down to the "CommitCV
// adapters" marker is the reference template verbatim; the adapters
// below it only compose those functions, so any new kind of entry
// inherits the same layout and spacing.

#let resume(
  paper: "us-letter",
  top-margin: 0.4in,
  bottom-margin: 0.2in,
  left-margin: 0.3in,
  right-margin: 0.3in,
  font: "New Computer Modern",
  font-size: 11pt,
  personal-info-font-size: 10.5pt,
  author-name: "",
  author-position: center,
  personal-info-position: center,
  phone: "",
  location: "",
  email: "",
  website: "",
  linkedin-user-id: "",
  github-username: "",
  // CommitCV: pre-rendered contact items (links, icons) appended
  // after the named fields above.
  contact-items: (),
  body
) = {
  set document(
    title: "Résumé | " + author-name,
    author: author-name,
    keywords: "cv",
    date: none
  )

  set page(
    paper: paper,
    margin: (
      top: top-margin, bottom: bottom-margin,
      left: left-margin, right: right-margin
    ),
  )

  set text(
    font: font, size: font-size, lang: "en", ligatures: false
  )

  show heading.where(
    level: 1
  ): it => block(width: 100%)[
    #set text(font-size + 2pt, weight: "regular")
    #smallcaps(it.body)
    #v(-1em)
    #line(length: 100%, stroke: stroke(thickness: 0.4pt))
    #v(-0.2em)
  ]

  let contact_item(value, link-type: "", prefix: "") = {
    if value != "" {
      if link-type != "" {
        underline(offset: 0.3em)[#link(link-type + value)[#(prefix + value)]]
      } else {
        value
      }
    }
  }

  align(author-position, [
    #(text(font-size+16pt, weight: "extrabold")[#author-name])
    #v(-2em)
  ])

  align(personal-info-position, text(personal-info-font-size)[
    #{
      let sepSpace = 0.2em
      let items = (
        contact_item(email, link-type: "mailto:"),
        contact_item(phone),
        contact_item(website, link-type: "https://"),
        ..contact-items,
      )
      items.filter(x => x != none).join([
        #show "|": sep => {
          h(sepSpace)
          [|]
          h(sepSpace)
        }
        |
      ])
    }
  ])

  body
}

// ---
// Custom functions

#let generic_1x2(r1c1, r1c2) = {
  grid(
    columns: (1fr, 1fr),
    align(left)[#r1c1],
    align(right)[#r1c2]
  )
}

#let generic_2x2(cols, r1c1, r1c2, r2c1, r2c2) = {
  grid(
    columns: (2fr, 1fr),
    align(left)[#r1c1 \ #r2c1],
    align(right)[#r1c2 \ #r2c2]
  )
}

#let custom-title(title, spacing-between: -0.5em, body) = {
  [= #title]
  body
  v(spacing-between)
}

// Custom list to be used inside custom-title section.
#let skills(body) = {
  if body != [] {
    set par(leading: 0.6em)
    set list(
      body-indent: 0.1em,
      indent: 0em,
      marker: []
    )
    body
  }
}

// Converts datetime format into readable period.
#let period_worked(start-date, end-date) = {
  // sanity checks
  assert.eq(type(start-date), datetime)
  assert(type(end-date) == datetime or type(end-date) == str)

  if type(end-date) == str and end-date == "Present" {
    end-date = datetime.today()
  }

  return [
    // Only shows one date if the item took place within one month
    #if(start-date.year() == end-date.year() and start-date.month() == end-date.month()) [
      #start-date.display("[month repr:short] [year]")
    // Otherwise, shows the span of dates that took place
    ] else[
      #start-date.display("[month repr:short] [year]") --
      #if ( (end-date.month() == datetime.today().month()) and (end-date.year() == datetime.today().year())) [
        Present
      ] else [
        #end-date.display("[month repr:short] [year]")
      ]
    ]
  ]
}

// Pretty self-explanatory.
#let work-heading(title, company, location, start-date, end-date, body) = {
  // sanity checks
  assert.eq(type(start-date), datetime)
  assert(type(end-date) == datetime or type(end-date) == str)

  generic_2x2(
    (1fr, 1fr),
    [*#title*], [#period_worked(start-date, end-date)],
    [#emph(company)], emph(location)
  )
  v(-0.2em)
  if body != [] {
    v(-0.4em)
    set par(leading: 0.6em)
    set list(indent: 0.5em)
    body
  }
}

// Pretty self-explanatory.
#let project-heading(name, stack: "", project-url: "", body) = {
  if project-url.len() != 0 { link(project-url)[*#name*] } else {
    [*#name*]
  }
  if stack != "" {
    [
      #show "|": sep => { h(0.3em); [|]; h(0.3em) }
      |*#stack*
    ]
  }
  v(-0.2em)
  if body != [] {
    v(-0.4em)
    set par(leading: 0.6em)
    set list(indent: 0.5em)
    body
  }
}

// ---
// CommitCV adapters. The editor stores free-text cells (dates like
// "Sept. 2023 - Present", already-styled runs), so these take content
// instead of datetimes and strings.

// The body of a work-heading.
#let entry-body(body) = {
  if body != [] {
    v(-0.4em)
    set par(leading: 0.6em)
    set list(indent: 0.5em)
    body
  }
}

// work-heading with free-text cells: title / date over
// company / location.
#let work-entry(r1c1, r1c2, r2c1, r2c2, body) = {
  generic_2x2((1fr, 1fr), r1c1, r1c2, r2c1, r2c2)
  v(-0.2em)
  entry-body(body)
}

// A single left / right row with the same body spacing.
#let split-entry(r1c1, r1c2, body) = {
  generic_1x2(r1c1, r1c2)
  v(-0.2em)
  entry-body(body)
}

// Bullet lines, styled like an entry body but without its pull-up so
// they can sit inside an entry or directly under a title.
#let bullets(body) = {
  set par(leading: 0.6em)
  set list(indent: 0.5em)
  body
}
