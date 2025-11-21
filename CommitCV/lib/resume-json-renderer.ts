/**
 * HTML Renderer for Resume JSON structure
 * Generates pixel-perfect HTML preview matching LaTeX output
 */

import { Resume, Header, Section, Subsection, Bullet, Paragraph } from '@/lib/types/Resume'

export class ResumeJsonRenderer {

  /**
   * Render Resume JSON to HTML with exact LaTeX formatting
   */
  static renderToHtml(resume: Resume): string {
    let html = '<div class="resume-document">'

    // Render header
    html += this.renderHeader(resume.header)

    // Render all sections
    for (const section of resume.sections) {
      html += this.renderSection(section)
    }

    html += '</div>'

    return html
  }

  /**
   * Render the header with name and contact info
   */
  private static renderHeader(header: Header): string {
    let html = '<div class="resume-header">'

    // Name
    html += `<h1 class="resume-name">${this.escapeHtml(header.name)}</h1>`

    // Contact info
    if (header.subheaders && header.subheaders.length > 0) {
      html += '<div class="resume-contact">'

      for (let i = 0; i < header.subheaders.length; i++) {
        const item = header.subheaders[i]

        if (item.link) {
          html += `<a href="${this.escapeHtml(item.link)}" class="resume-link">${this.escapeHtml(item.text)}</a>`
        } else {
          html += `<span>${this.escapeHtml(item.text)}</span>`
        }

        if (i < header.subheaders.length - 1) {
          html += ' <span class="separator">|</span> '
        }
      }

      html += '</div>'
    }

    html += '</div>'

    return html
  }

  /**
   * Render a section (Education, Experience, etc.)
   */
  private static renderSection(section: Section): string {
    let html = '<div class="resume-section">'
    html += `<h2 class="resume-section-title">${this.escapeHtml(section.name)}</h2>`

    // Render subsections (for Education, Experience, Projects)
    if (section.subsections && section.subsections.length > 0) {
      html += '<div class="resume-entries">'

      for (const subsection of section.subsections) {
        html += this.renderSubsection(subsection)
      }

      html += '</div>'
    }

    // Render section-level bullets (for Awards)
    if (section.bulletCollection && section.bulletCollection.length > 0) {
      html += this.renderBulletList(section.bulletCollection)
    }

    // Render section-level paragraphs (for Skills, Interests)
    if (section.paragraphCollection && section.paragraphCollection.length > 0) {
      html += this.renderParagraphList(section.paragraphCollection)
    }

    html += '</div>'

    return html
  }

  /**
   * Render a subsection (individual job, education entry, project)
   */
  private static renderSubsection(subsection: Subsection): string {
    let html = '<div class="resume-entry">'

    // Check if this is a full entry (with location) or sub-entry (without location)
    const isFullEntry = subsection.location && subsection.subtitle

    if (isFullEntry) {
      // Full entry: \resumeSubheading format
      html += '<div class="resume-entry-header">'
      html += `<div class="resume-entry-left"><strong>${this.escapeHtml(subsection.title)}</strong></div>`
      html += `<div class="resume-entry-right">${this.escapeHtml(subsection.date || '')}</div>`
      html += '</div>'

      html += '<div class="resume-entry-subheader">'
      html += `<div class="resume-entry-left"><em>${this.escapeHtml(subsection.subtitle || '')}</em></div>`
      html += `<div class="resume-entry-right"><em>${this.escapeHtml(subsection.location || '')}</em></div>`
      html += '</div>'
    } else {
      // Sub-entry: \resumeSubSubheading format
      html += '<div class="resume-entry-header">'
      html += '<div class="resume-entry-left">'

      if (subsection.link) {
        html += `<strong><a href="${this.escapeHtml(subsection.link)}" class="resume-link">${this.escapeHtml(subsection.title)}</a></strong>`
      } else {
        html += `<strong>${this.escapeHtml(subsection.title)}</strong>`
      }

      if (subsection.subtitle) {
        html += ` | <em>${this.escapeHtml(subsection.subtitle)}</em>`
      }

      html += '</div>'
      html += `<div class="resume-entry-right"><em>${this.escapeHtml(subsection.date || '')}</em></div>`
      html += '</div>'
    }

    // Render bullets
    if (subsection.bulletCollection && subsection.bulletCollection.length > 0) {
      html += this.renderBulletList(subsection.bulletCollection)
    }

    // Render paragraphs
    if (subsection.paragraphCollection && subsection.paragraphCollection.length > 0) {
      html += this.renderParagraphList(subsection.paragraphCollection)
    }

    html += '</div>'

    return html
  }

  /**
   * Render a bullet list
   */
  private static renderBulletList(bullets: Bullet[]): string {
    let html = '<ul class="resume-items">'

    for (const bullet of bullets) {
      html += '<li>'

      if (bullet.bold) {
        html += `<strong>${this.escapeHtml(bullet.bold)}</strong>`
        if (bullet.normal) {
          html += ' '
        }
      }

      if (bullet.normal) {
        html += this.escapeHtml(bullet.normal)
      }

      html += '</li>'
    }

    html += '</ul>'

    return html
  }

  /**
   * Render a paragraph list (for Skills, Interests)
   */
  private static renderParagraphList(paragraphs: Paragraph[]): string {
    let html = '<div class="resume-simple-list">'

    for (const para of paragraphs) {
      html += '<div class="resume-list-item">'

      if (para.bold) {
        html += `<strong>${this.escapeHtml(para.bold)}</strong>`
        if (para.normal) {
          html += ' '
        }
      }

      if (para.normal) {
        html += this.escapeHtml(para.normal)
      }

      html += '</div>'
    }

    html += '</div>'

    return html
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

