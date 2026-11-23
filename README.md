# Portfolio site

Source for my portfolio: [beyzamercanse.github.io/project1](https://beyzamercanse.github.io/project1/).

Plain HTML, CSS and JavaScript with no build step or framework. The charts are small hand-written SVG helpers (`assets/js/charts.js`). The dashboards (`assets/js/dashboards.js`) read the JSON each project's pipeline exports, so no number on a chart is typed in by hand.

The background (`assets/js/background.js`) is a canvas of 1,200 points (760 on small screens) that morphs between shapes drawn from each project: forward curves for RiskLedger, an order book for TickStream, a power grid for GridFlow, an embedding space for Desk Copilot, a revenue bridge, A/B distributions and a pipeline. The home page cycles through them, hovering a project shows its shape, and project pages hold their own (`<body data-scene="...">`). It has a pause button, stays still for `prefers-reduced-motion`, and stops drawing while the tab is hidden.

## Pages

- `index.html`: intro, the energy-trading and AI projects (RiskLedger, GridFlow, Desk Copilot, TickStream) and the analytics-engineering projects
- `work/revenue-trust.html`, `work/experiment-lab.html`, `work/mobility-pipeline.html`: goal, architecture, how it works, dashboard, and what I changed after the first version
- `alytro.html`: the company I'm building
- `about.html`: education and experience

## Updating the data

With the project repositories cloned next to this one:

```text
revenue-trust/  experiment-lab/  mobility-pipeline/  project1/
```

```sh
python3 scripts/build_data.py          # rebuild assets/js/data.js from the projects' dashboard/*.json
python3 scripts/build_data.py --sync   # also copy the dashboard code into each project's dashboard/ folder
```

Both commands also re-stamp the `?v=` content hashes on every page's CSS and JS links.

## Hosting

GitHub Pages, deployed from the `main` branch root (Settings → Pages). `.nojekyll` makes Pages serve the files as they are.
