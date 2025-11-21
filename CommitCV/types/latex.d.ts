declare module 'latex.js' {
  export class HtmlGenerator {
    constructor(options?: { hyphenate?: boolean })
  }

  export function parse(
    latex: string,
    options: { generator: HtmlGenerator }
  ): {
    htmlDocument(): Document
  }
}

