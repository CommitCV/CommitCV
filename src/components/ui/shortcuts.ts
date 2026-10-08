const IS_MAC =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform);

/** The shortcut modifier as shown in tooltips. */
export const MOD_KEY = IS_MAC ? "⌘" : "Ctrl+";

/** Mod+Shift, as shown in tooltips. */
export const MOD_SHIFT_KEY = IS_MAC ? "⇧⌘" : "Ctrl+Shift+";
