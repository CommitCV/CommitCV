# Fonts

Our main font is [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans?query=IBM+Plex+Sans).

This was imported using the [Fontsource CDN
Option](https://fontsource.org/fonts/ibm-plex-sans/cdn), where the provided
configuration was placed into `src/app/index.css`, along with a prompt hierarchical
change of the `:root` font family. 

```css
:root {
  font-family: IBM Plex Sans Variable, system-ui, Avenir, Helvetica, Arial, sans-serif;
}
```
