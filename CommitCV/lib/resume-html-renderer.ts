/**
 * Direct HTML renderer for resume templates
 * Parses LaTeX and generates pixel-perfect HTML that matches the original formatting
 */

export class ResumeHtmlRenderer {

  /**
   * Parse LaTeX resume and generate HTML with preserved formatting
   */
  static renderToHtml(latexSource: string): string {
    // Extract document body
    const docMatch = latexSource.match(/\\begin\{document\}([\s\S]*)\\end\{document\}/)
    if (!docMatch) return '<p>Error: Could not find document body</p>'

    const body = docMatch[1]

    let html = '<div class="resume-document">'

    // Parse and render each section
    html += this.parseHeader(body)
    html += this.parseSections(body)

    html += '</div>'

    return html
  }

  /**
   * Parse the header section
   */
  private static parseHeader(latex: string): string {
    const headerMatch = latex.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/)
    if (!headerMatch) return ''

    const header = headerMatch[1]

    // Extract name
    const nameMatch = header.match(/\\textbf\{\\Huge\\s*\\scshape\s*([^}]+)\}/)
    const name = nameMatch ? nameMatch[1].trim() : ''

    // Extract contact info
    const contactMatch = header.match(/\\small\s+([^\s]+@[^\s]+)\s+\$\|\$\s+\\small\s+([^\s]+)\s+\$\|\$\s+\\href\{[^}]+\}\{\\underline\{([^}]+)\}\}/)

    let html = '<div class="resume-header">'
    if (name) {
      html += `<h1 class="resume-name">${this.escapeHtml(name)}</h1>`
    }
    if (contactMatch) {
      html += '<div class="resume-contact">'
      html += `<span>${this.escapeHtml(contactMatch[1])}</span>`
      html += ' <span class="separator">|</span> '
      html += `<span>${this.escapeHtml(contactMatch[2])}</span>`
      html += ' <span class="separator">|</span> '
      html += `<span>${this.escapeHtml(contactMatch[3])}</span>`
      html += '</div>'
    }
    html += '</div>'

    return html
  }

  /**
   * Parse all sections
   */
  private static parseSections(latex: string): string {
    let html = ''

    // Find all sections
    const sectionRegex = /\\section\{([^}]+)\}([\s\S]*?)(?=\\section\{|\\end\{document\})/g
    let match

    while ((match = sectionRegex.exec(latex)) !== null) {
      const sectionName = match[1]
      const sectionContent = match[2]

      html += `<div class="resume-section">`
      html += `<h2 class="resume-section-title">${this.escapeHtml(sectionName)}</h2>`

      // Check what type of content this section has
      if (sectionContent.includes('\\resumeSubHeadingListStart')) {
        html += this.parseSubHeadingList(sectionContent)
      } else if (sectionContent.includes('\\resumeItemListStart')) {
        html += this.parseItemList(sectionContent)
      } else if (sectionContent.includes('\\begin{itemize}')) {
        html += this.parseSimpleItemize(sectionContent)
      }

      html += '</div>'
    }

    return html
  }

  /**
   * Parse resumeSubHeadingList (for Education, Experience, Projects)
   */
  private static parseSubHeadingList(content: string): string {
    let html = '<div class="resume-entries">'

    // Find all resumeSubheading commands
    const subheadingRegex = /\\resumeSubheading\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}([\s\S]*?)(?=\\resumeSubheading|\\resumeSubSubheading|\\resumeSubHeadingListEnd)/g
    let match

    while ((match = subheadingRegex.exec(content)) !== null) {
      const [_, title, date, subtitle, location, rest] = match

      html += '<div class="resume-entry">'
      html += '<div class="resume-entry-header">'
      html += `<div class="resume-entry-left"><strong>${this.processText(title)}</strong></div>`
      html += `<div class="resume-entry-right">${this.processText(date)}</div>`
      html += '</div>'
      html += '<div class="resume-entry-subheader">'
      html += `<div class="resume-entry-left"><em>${this.processText(subtitle)}</em></div>`
      html += `<div class="resume-entry-right"><em>${this.processText(location)}</em></div>`
      html += '</div>'

      // Parse items if present
      if (rest.includes('\\resumeItemListStart')) {
        html += this.parseItemList(rest)
      }

      html += '</div>'
    }

    // Find all resumeSubSubheading commands
    const subsubheadingRegex = /\\resumeSubSubheading\{([^}]+)\}\{([^}]+)\}([\s\S]*?)(?=\\resumeSubheading|\\resumeSubSubheading|\\resumeSubHeadingListEnd)/g

    while ((match = subsubheadingRegex.exec(content)) !== null) {
      const [_, title, date, rest] = match
      const cleanTitle = title.replace(/\\textbf\{([^}]*)\}/, '$1')

      html += '<div class="resume-entry">'
      html += '<div class="resume-entry-header">'
      html += `<div class="resume-entry-left"><strong>${this.processText(cleanTitle)}</strong></div>`
      html += `<div class="resume-entry-right"><em>${this.processText(date)}</em></div>`
      html += '</div>'

      // Parse items if present
      if (rest.includes('\\resumeItemListStart')) {
        html += this.parseItemList(rest)
      }

      html += '</div>'
    }

    html += '</div>'
    return html
  }

  /**
   * Parse resumeItemList
   */
  private static parseItemList(content: string): string {
    const itemListMatch = content.match(/\\resumeItemListStart([\s\S]*?)\\resumeItemListEnd/)
    if (!itemListMatch) return ''

    const items = itemListMatch[1]
    let html = '<ul class="resume-items">'

    const itemRegex = /\\resumeItem\{((?:[^{}]|\{[^}]*\})*)\}/g
    let match

    while ((match = itemRegex.exec(items)) !== null) {
      const itemText = match[1].replace(/\\textbf\{\s*\}/g, '') // Remove empty textbf
      html += `<li>${this.processText(itemText)}</li>`
    }

    html += '</ul>'
    return html
  }

  /**
   * Parse simple itemize environment (for Skills, Interests)
   */
  private static parseSimpleItemize(content: string): string {
    const itemizeMatch = content.match(/\\begin\{itemize\}[\s\S]*?\[leftmargin=[^\]]+\]([\s\S]*?)\\end\{itemize\}/)
    if (!itemizeMatch) return ''

    const items = itemizeMatch[1]
    let html = '<div class="resume-simple-list">'

    const itemRegex = /\\item\s+\\small\s+\\textbf\{([^:}]+):\}\{([^}]+)\}/g
    let match

    while ((match = itemRegex.exec(items)) !== null) {
      html += `<div class="resume-list-item"><strong>${this.escapeHtml(match[1])}:</strong> ${this.escapeHtml(match[2])}</div>`
    }

    html += '</div>'
    return html
  }

  /**
   * Process text with LaTeX commands
   */
  private static processText(text: string): string {
    return text
      .replace(/\\textbf\{([^}]*)\}/g, (_, content) => content ? `<strong>${this.escapeHtml(content)}</strong>` : '')
      .replace(/\\textit\{([^}]*)\}/g, (_, content) => content ? `<em>${this.escapeHtml(content)}</em>` : '')
      .replace(/\\texttt\{([^}]*)\}/g, (_, content) => content ? `<code>${this.escapeHtml(content)}</code>` : '')
      .replace(/\\small\s*/g, '')
      .replace(/\\\\/g, '<br>')
      .trim()
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}

