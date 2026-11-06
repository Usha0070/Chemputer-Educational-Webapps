# Chemputer: Interactive Chemistry Tools

Bangla interactive simulations for SSC chemistry (Chapter 4, the periodic table).
Live site: https://usha0070.github.io/Chemputer-Educational-Webapps/

| Page | Tool |
|---|---|
| `index.html` | Home: list of all tools |
| `electron_configuration_shortcut.html` | Electron-configuration shortcut animation (Z = 1–118) |
| `electron_configue_calculator.html` | Configuration, period and group calculator (Z = 1–36) |
| `electron_configue_by_blocks.html` | Group from configuration, block by block |
| `periodic_properties_visualizer.html` | Periodic-trend visualizer |
| `periodic_table_mnemonics.html` | Group mnemonics with flip cards |

## Editing

The HTML pages and everything in `assets/` are **generated**. Edit the files in `src/`, then rebuild:

```bash
npm install      # once
npm run build    # regenerates index.html, the tool pages and assets/
npm run serve    # preview at http://localhost:5501
```

Commit the regenerated files too. GitHub Pages serves the repository as-is, with no CI step.

```
src/
  site.js           page list, titles, descriptions, nav + footer templates
  styles.css        shared styles (Tailwind)
  lib/chem.js       elements, Aufbau order, exceptions, period/group rules
  ui/               shared React components and icons
  tools/*.jsx       one file per tool
tailwind.config.js  theme colours (surfaces, accent, s/p/d/f block colours)
build.mjs           build script
```

To add a tool, add an entry to `TOOLS` in `src/site.js` and create `src/tools/<entry>.jsx`.
The home page and the "next tool" links update automatically.

The plan for growing the site to the full Class 9–10 book (and later HSC) is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
