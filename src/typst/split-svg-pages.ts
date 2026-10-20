/** Splits a multi-page Typst SVG into one SVG per page. */
export function splitSvgPages(source: string): string[] {
    const document = new DOMParser().parseFromString(source, "text/html");
    const root = document.querySelector("svg");
    if (!root) return [source];
    const pageNodes = Array.from(root.children).filter((child) =>
        child.classList.contains("typst-page"),
    );
    if (pageNodes.length < 2) return [source];

    const viewBox = (root.getAttribute("viewBox") ?? "")
        .split(/\s+/)
        .map(Number);
    const [width, totalHeight] = [viewBox[2], viewBox[3]];
    if (!width || !totalHeight) return [source];

    const sharedNodes = Array.from(root.children).filter(
        (child) => !child.classList.contains("typst-page"),
    );
    const pageHeight = totalHeight / pageNodes.length;

    return pageNodes.map((pageNode) => {
        const page = root.cloneNode(false) as SVGSVGElement;
        page.setAttribute(
            "viewBox",
            `0 0 ${width.toFixed(3)} ${pageHeight.toFixed(3)}`,
        );
        page.setAttribute("height", pageHeight.toFixed(3));
        page.setAttribute("data-height", pageHeight.toFixed(3));
        for (const sharedNode of sharedNodes) {
            page.appendChild(sharedNode.cloneNode(true));
        }
        const pageContent = pageNode.cloneNode(true) as SVGGElement;
        pageContent.setAttribute("transform", "translate(0, 0)");
        page.appendChild(pageContent);
        return new XMLSerializer().serializeToString(page);
    });
}
