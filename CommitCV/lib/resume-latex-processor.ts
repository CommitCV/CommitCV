/**
 * Custom LaTeX macro expander for resume templates
 * Translates custom commands into standard LaTeX while preserving formatting
 */

export class ResumeLatexProcessor {

  /**
   * Expand custom resume macros into standard LaTeX that latex.js can handle
   * This preserves the visual formatting and layout
   */
  static expandMacros(latexSource: string): string {
    let expanded = latexSource

    // Remove unsupported packages and preamble
    expanded = this.cleanPreamble(expanded)

    // Expand custom commands while preserving formatting
    expanded = this.expandResumeSubheading(expanded)
    expanded = this.expandResumeSubSubheading(expanded)
    expanded = this.expandResumeItem(expanded)
    expanded = this.expandListCommands(expanded)
    expanded = this.expandHyperlinks(expanded)
    expanded = this.cleanUnsupportedCommands(expanded)

    return expanded
  }

  /**
   * Remove unsupported packages and keep only the document body
   */
  private static cleanPreamble(latex: string): string {
    // Extract everything between \begin{document} and \end{document}
    const docMatch = latex.match(/\\begin\{document\}([\s\S]*)\\end\{document\}/)
    if (!docMatch) return latex

    const body = docMatch[1]

    // Rebuild with minimal preamble
    return `\\documentclass[11pt]{article}
\\begin{document}
${body}
\\end{document}`
  }

  /**
   * Expand \resumeSubheading into tabular layout
   * \resumeSubheading{title}{date}{subtitle}{location}
   * Creates a two-column layout with title/date and subtitle/location
   */
  private static expandResumeSubheading(latex: string): string {
    const regex = /\\resumeSubheading\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}/g

    return latex.replace(regex, (_, title, date, subtitle, location) => {
      return `\\item
\\begin{minipage}[t]{0.7\\textwidth}
\\textbf{${title}}
\\end{minipage}%
\\begin{minipage}[t]{0.3\\textwidth}
\\raggedleft ${date}
\\end{minipage}

\\begin{minipage}[t]{0.7\\textwidth}
\\textit{\\small ${subtitle}}
\\end{minipage}%
\\begin{minipage}[t]{0.3\\textwidth}
\\raggedleft \\textit{\\small ${location}}
\\end{minipage}

\\vspace{2pt}`
    })
  }

  /**
   * Expand \resumeSubSubheading into two-column layout
   * \resumeSubSubheading{title}{date}
   */
  private static expandResumeSubSubheading(latex: string): string {
    const regex = /\\resumeSubSubheading\{([^}]+)\}\{([^}]+)\}/g

    return latex.replace(regex, (_, title, date) => {
      // Clean \textbf from title if present
      const cleanTitle = title.replace(/\\textbf\{([^}]*)\}/, '$1')
      return `\\item
\\begin{minipage}[t]{0.7\\textwidth}
\\textbf{\\small ${cleanTitle}}
\\end{minipage}%
\\begin{minipage}[t]{0.3\\textwidth}
\\raggedleft \\textit{\\small ${date}}
\\end{minipage}

\\vspace{2pt}`
    })
  }

  /**
   * Expand \resumeItem - keep as simple list item
   */
  private static expandResumeItem(latex: string): string {
    const regex = /\\resumeItem\{((?:[^{}]|\{[^}]*\})*)\}/g

    return latex.replace(regex, (_, content) => {
      // Clean empty \textbf{}
      const cleaned = content.replace(/\\textbf\{\s*\}/g, '')
      return `\\item \\small ${cleaned}`
    })
  }

  /**
   * Expand custom list commands
   */
  private static expandListCommands(latex: string): string {
    return latex
      // \resumeSubHeadingListStart -> itemize without bullets
      .replace(/\\resumeSubHeadingListStart/g, '\\begin{itemize}[leftmargin=0pt, label={}]')
      .replace(/\\resumeSubHeadingListEnd/g, '\\end{itemize}')

      // \resumeItemListStart -> regular itemize
      .replace(/\\resumeItemListStart/g, '\\begin{itemize}')
      .replace(/\\resumeItemListEnd/g, '\\end{itemize}')
  }

  /**
   * Expand \href and \underline for links
   */
  private static expandHyperlinks(latex: string): string {
    // \href{url}{\underline{text}} -> just show the text (latex.js doesn't support href)
    return latex.replace(/\\href\{[^}]+\}\{\\underline\{([^}]+)\}\}/g, '$1')
  }

  /**
   * Clean unsupported commands
   */
  private static cleanUnsupportedCommands(latex: string): string {
    return latex
      // Remove \scshape (small caps not supported)
      .replace(/\\scshape\s*/g, '')
      // Keep \vspace but simplify
      .replace(/\\vspace\{[^}]+\}/g, '\\vspace{3pt}')
  }
}

