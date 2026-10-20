/**
 * Single source of truth for the landing's visual tokens.
 *
 * The palette is emitted as CSS custom properties by `ALMANAC_THEME_CSS`, so
 * both the stylesheet and the components read the same values. Light and dark
 * are intentionally the only variants; the manual theme switch toggles
 * `data-theme` on <html> and the media query keeps the OS preference as the
 * default.
 */

export type AlmanacPalette = {
  bg: string;
  bg2: string;
  paper: string;
  ink: string;
  ink2: string;
  ink3: string;
  rule: string;
  strong: string;
  stamp: string;
  leaf: string;
  leafSoft: string;
  amber: string;
  st0: string;
  st1: string;
  st2: string;
  st3: string;
  st4: string;
  shadow: string;
  grainOpacity: string;
  grainBlend: string;
};

const light: AlmanacPalette = {
  bg: "#f1f3f0",
  bg2: "#e5e9e4",
  paper: "#f8f9f6",
  ink: "#15231b",
  ink2: "#43514a",
  ink3: "#5f6c63",
  rule: "#cbd2ca",
  strong: "#15231b",
  stamp: "#b0281c",
  leaf: "#1f4d36",
  leafSoft: "#dce6de",
  amber: "#8a5c0d",
  st0: "#d3d9d1",
  st1: "#cdbd8d",
  st2: "#9dba85",
  st3: "#3f7d57",
  st4: "#c9923f",
  shadow: "0 22px 40px -28px rgba(21, 35, 27, 0.55)",
  grainOpacity: "0.07",
  grainBlend: "multiply",
};

const dark: AlmanacPalette = {
  bg: "#121915",
  bg2: "#0d1310",
  paper: "#19231d",
  ink: "#ece8dc",
  ink2: "#b4beb5",
  ink3: "#8a978d",
  rule: "#2c3931",
  strong: "#ece8dc",
  stamp: "#ea6a58",
  leaf: "#86c9a0",
  leafSoft: "#1f3328",
  amber: "#e0b25a",
  st0: "#2b362f",
  st1: "#7a6c43",
  st2: "#5f8a55",
  st3: "#2f7a52",
  st4: "#b8853a",
  shadow: "0 22px 40px -28px rgba(0, 0, 0, 0.9)",
  grainOpacity: "0.05",
  grainBlend: "screen",
};

export const almanacTokens = {
  color: { light, dark },
  font: {
    display:
      'var(--font-almanac-serif), Spectral, Georgia, "Times New Roman", serif',
    body: 'var(--font-almanac-sans), Archivo, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  motion: {
    stamp: "600ms",
    reveal: "800ms",
    revealStagger: "100ms",
    plateReveal: "1200ms",
    easing: "cubic-bezier(.2,.8,.2,1)",
    parallax: 0.14,
  },
  layout: {
    max: "1240px",
    header: "64px",
    gutter: "clamp(16px, 3.5vw, 32px)",
  },
} as const;

function variables(palette: AlmanacPalette): string {
  return `
    --alm-bg: ${palette.bg};
    --alm-bg2: ${palette.bg2};
    --alm-paper: ${palette.paper};
    --alm-ink: ${palette.ink};
    --alm-ink2: ${palette.ink2};
    --alm-ink3: ${palette.ink3};
    --alm-rule: ${palette.rule};
    --alm-strong: ${palette.strong};
    --alm-stamp: ${palette.stamp};
    --alm-leaf: ${palette.leaf};
    --alm-leaf-soft: ${palette.leafSoft};
    --alm-amber: ${palette.amber};
    --alm-st0: ${palette.st0};
    --alm-st1: ${palette.st1};
    --alm-st2: ${palette.st2};
    --alm-st3: ${palette.st3};
    --alm-st4: ${palette.st4};
    --alm-shadow: ${palette.shadow};
    --alm-grain-op: ${palette.grainOpacity};
    --alm-grain-blend: ${palette.grainBlend};
  `;
}

function buildThemeCss(): string {
  return `
.almanac-world {
  ${variables(light)}
  --alm-font-display: ${almanacTokens.font.display};
  --alm-font-body: ${almanacTokens.font.body};
  --alm-header: ${almanacTokens.layout.header};
  --alm-max: ${almanacTokens.layout.max};
  --alm-gutter: ${almanacTokens.layout.gutter};
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .almanac-world {
    ${variables(dark)}
    color-scheme: dark;
  }
}

:root[data-theme="dark"] .almanac-world {
  ${variables(dark)}
  color-scheme: dark;
}

@media (max-width: 560px) {
  .almanac-world {
    --alm-header: 60px;
  }
}
`;
}

export const ALMANAC_THEME_CSS = buildThemeCss();
