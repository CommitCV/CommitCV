import { describe, expect, it } from "vitest";
import { buttonClass, type ButtonVariant } from "./button-class";

const variants: ButtonVariant[] = ["primary", "secondary", "ghost"];

describe("buttonClass", () => {
    it("gives every variant of a size the same height and border width", () => {
        for (const size of ["sm", "md", "lg", "icon"] as const) {
            const shapes = variants.map((variant) => {
                const classes = buttonClass(variant, size).split(" ");
                return {
                    height: classes.filter((c) => /^h-\d+$/.test(c)),
                    border: classes.filter((c) => c === "border-2"),
                };
            });
            for (const shape of shapes) {
                expect(shape.height).toHaveLength(1);
                expect(shape.border).toHaveLength(1);
                expect(shape).toEqual(shapes[0]);
            }
        }
    });

    it("sets a border colour on every variant so none renders unborder-coloured", () => {
        for (const variant of variants) {
            expect(buttonClass(variant, "sm")).toMatch(
                /border-(transparent|border-light)/,
            );
        }
    });

    it("makes icon buttons square at the sm height", () => {
        const sm = buttonClass("ghost", "sm").match(/\bh-\d+\b/)![0];
        const icon = buttonClass("ghost", "icon");
        expect(icon).toContain(sm);
        expect(icon).toContain(`w-${sm.slice(2)}`);
    });

    it("appends caller classes", () => {
        expect(buttonClass("primary", "sm", "gap-1")).toMatch(/ gap-1$/);
    });
});
