# Themes

Available themes are: Light, Dark, & Sepia

## How themes were implemented

I followed [an
article](https://medium.com/render-beyond/build-a-flawless-multi-theme-ui-using-new-tailwind-css-v4-react-dca2b3c95510)
by Praveen Scripati and slightly modified their code by allowing more core
themes and removing need for accents.

Themes are defined in `src/app/index.css` within the `@layer base` component.
For instance, the sepia theme looks like:

```css
.sepia {
    --color-bg-1: #f5e3cf;
    --color-bg-2: #f1d9bf;
    --color-bg-3: #eed0af;
    --color-bg-4: #e4b47e;
    --color-mid-1: #dda15e;
    --color-mid-2: #c79155;
    --color-mid-3: #b1814b;
    --color-mid-4: #856138;
    --color-fg-3: #584026;
    --color-fg-2: #2c2013;
    --color-fg-1: #161009;
}
```

Here we see background colours (bg), middle ground colours (mid), and
foreground colours (fg). For the 'light' themes (Light & Sepia), bg and mid
colours are ordered from lightest to darkest, and fg colours darkest to
lightest (i.e. bg-1 is the lightest, fg-1 is the darkest). For the 'dark'
(Dark) theme, these orders are reversed (i.e. bg-1 is the darkest, fg-1 is the
lightest).

At the bottom of the `index.css` file is a block which uses the theme attribute
to set variables for each css colour so that they can be used within React
components:

```css
@theme {
    --color-bg-1: var(--bg-1);
    --color-bg-2: var(--bg-2);
    --color-bg-3: var(--bg-3);
    --color-bg-4: var(--bg-4);
    --color-mid-1: var(--mid-1);
    --color-mid-2: var(--mid-2);
    --color-mid-3: var(--mid-3);
    --color-mid-4: var(--mid-4);
    --color-fg-3: var(--fg-3);
    --color-fg-2: var(--fg-2);
    --color-fg-1: var(--fg-1);
}
```

Next, we use a custom React Hook called `useTheme` that uses localstorage to
remember the theme. It also provides the `theme` variable and `changeTheme`
function to any file that imports it.
