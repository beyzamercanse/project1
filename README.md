# Portfolio site

Source for my portfolio: [beyzamercanse.github.io/project1](https://beyzamercanse.github.io/project1/).

Plain HTML, CSS and JavaScript with no build step or framework. The charts are small hand-written SVG helpers (`assets/js/charts.js`). The dashboards (`assets/js/dashboards.js`) read the JSON each project's pipeline exports, so no number on a chart is typed in by hand.

## Pages

- `index.html`: intro and the three projects
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

## Hosting

GitHub Pages, deployed from the `main` branch root (Settings → Pages). `.nojekyll` makes Pages serve the files as they are.
