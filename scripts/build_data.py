#!/usr/bin/env python3
"""Collect the three projects' pipeline outputs into assets/js/data.js.

Expects the project repositories checked out next to this one:

    revenue-trust/  experiment-lab/  mobility-pipeline/  project1/

    python3 scripts/build_data.py           # refresh the site's data.js
    python3 scripts/build_data.py --sync    # also copy the dashboard code into each repo

Nothing on the site is typed in by hand: every chart reads these files.
"""
import argparse
import json
import shutil
from pathlib import Path

SITE = Path(__file__).resolve().parents[1]
PROJECTS = {
    'revenue-trust': {
        'title': 'Revenue Trust',
        'lead': 'Revenue models built from raw orders, refunds and a payment ledger, published only when every day reconciles, and a May→June bridge that traces the drop to a channel.',
        'note': 'Simulated e-commerce scenario (seed 41), January–June 2025.',
    },
    'experiment-lab': {
        'title': 'Experiment Lab',
        'lead': 'A randomized onboarding test that raised activation and still got a hold, plus a second pass checking the intervals with a bootstrap and the guardrail’s power.',
        'note': 'Simulated experiment (seed 418), 12,000 users, September–October 2026.',
    },
    'mobility-pipeline': {
        'title': 'Mobility Pipeline',
        'lead': 'Daily trip metrics from a feed that resends, delivers late and corrects fares, loaded batch by batch with reconciliation and a restatement audit.',
        'note': 'Generated taxi-style records (seed 4026), 1–14 January 2026. Not real TLC data.',
    },
}
SITE_URL = 'https://beyzamercanse.github.io/project1/'
REPO_URL = 'https://github.com/beyzamercanse/'


def load(repo):
    folder = SITE.parent / repo / 'dashboard'
    data = json.loads((folder / 'data.json').read_text())
    extra = folder / 'robustness.json'
    if extra.exists():
        data['robustness'] = json.loads(extra.read_text())
    return data


DASHBOARD_HTML = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} Dashboard</title>
<meta name="description" content="{lead}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Figtree:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="site-header">
  <a class="brand" href="{site}"><span class="monogram">HM</span><span class="brand-name">Hera Beyza Mercan</span></a>
  <nav class="site-nav" aria-label="Main"><a href="{site}work/{repo}.html">Project write-up</a><a href="{repo_url}{repo}">Code</a></nav>
</header>
<main>
  <div class="col stack">
    <h1>{title}</h1>
    <p class="lead">{lead}</p>
    <p class="small muted">{note} Every figure is read from <code>dashboard/data.json</code>, which the pipeline writes. Run <code>python3 dashboard/refresh.py</code> after a new pipeline run.</p>
  </div>
  <section class="dash" id="dashboard" aria-label="Dashboard"></section>
</main>
<footer class="site-footer"><span>Hera Beyza Mercan · Amsterdam</span><a href="{repo_url}{repo}">github.com/beyzamercanse/{repo}</a></footer>
<script src="data.js"></script>
<script src="charts.js"></script>
<script src="dashboards.js"></script>
<script>Dashboards.render('{repo}', document.getElementById('dashboard'), window.PROJECT_DATA, {{ tiles: true }});</script>
</body>
</html>
'''

REFRESH_PY = '''"""Rebuild dashboard/data.js from the pipeline output so index.html also works offline (file://)."""
import json
from pathlib import Path

here = Path(__file__).resolve().parent
data = json.loads((here / "data.json").read_text())
extra = here / "robustness.json"
if extra.exists():
    data["robustness"] = json.loads(extra.read_text())
(here / "data.js").write_text("window.PROJECT_DATA = " + json.dumps(data, separators=(",", ":")) + ";\\n")
print("dashboard/data.js refreshed")
'''


def sync(repo):
    meta = PROJECTS[repo]
    folder = SITE.parent / repo / 'dashboard'
    for old in ['assets', 'docs']:
        if (folder / old).is_dir():
            shutil.rmtree(folder / old)
    shutil.copyfile(SITE / 'assets/js/charts.js', folder / 'charts.js')
    shutil.copyfile(SITE / 'assets/js/dashboards.js', folder / 'dashboards.js')
    shutil.copyfile(SITE / 'assets/css/site.css', folder / 'style.css')
    (folder / 'index.html').write_text(DASHBOARD_HTML.format(repo=repo, site=SITE_URL, repo_url=REPO_URL, **meta))
    (folder / 'refresh.py').write_text(REFRESH_PY)
    data = load(repo)
    (folder / 'data.js').write_text('window.PROJECT_DATA = ' + json.dumps(data, separators=(',', ':')) + ';\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sync', action='store_true', help='copy dashboard code into each project repo')
    args = parser.parse_args()
    bundle = {repo: load(repo) for repo in PROJECTS}
    (SITE / 'assets/js/data.js').write_text('window.PORTFOLIO_DATA = ' + json.dumps(bundle, separators=(',', ':')) + ';\n')
    print('assets/js/data.js:', ', '.join(bundle))
    if args.sync:
        for repo in PROJECTS:
            sync(repo)
            print('synced', repo + '/dashboard')


if __name__ == '__main__':
    main()
