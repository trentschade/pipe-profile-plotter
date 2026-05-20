# Pipe Profile Plotter

An interactive browser-based tool for generating pipe profile drawings — the kind used in civil/municipal engineering to show underground pipe systems in elevation view.

No installation, no server, no dependencies. Just open `index.html` in any modern browser.

## Features

- **Live SVG drawing** that updates as you type in the data tables
- **Manholes** shown as shafts with rim caps, labeled with name, rim elevation, and invert elevation
- **Pipe segments** labeled with diameter, material, and calculated slope
- **Street crossings** marked with labeled tick marks
- **Optional layers:** ground surface elevation, hydraulic grade line (HGL), basement elevations
- **Imperial or metric** units (ft/in or m/mm), switchable at any time
- **Export** to PowerPoint (.pptx), PNG image, or SVG vector

## Getting Started

1. Open `index.html` in a browser
2. Answer the setup questions:
   - Number of pipe segments
   - Number of street crossings
   - Units (imperial or metric)
   - Optional elements to show (ground elevation, basements, HGL)
3. Click **Generate Profile** — a default drawing appears immediately
4. Fill in the data tables below the drawing to update the profile in real time

## Data Tables

| Tab | What you enter |
|-----|---------------|
| **Manholes** | Name, rim elevation, invert elevation — depth and station are calculated |
| **Pipes** | Length, diameter, material — slope is calculated from invert elevations |
| **Streets** | Name and station of each street crossing |
| **Ground Elev** | Ground surface elevation at each manhole station |
| **HGL** | Hydraulic grade line elevation at each manhole |
| **Basements** | Basement floor elevation at each manhole |

## Exporting

Click **Export ▾** in the header to download:

- **PowerPoint (.pptx)** — drawing placed on a widescreen slide, ready to annotate
- **PNG Image** — high-resolution raster image
- **SVG Vector** — scalable vector, editable in Illustrator, Inkscape, or PowerPoint

> PowerPoint export requires an internet connection on first load to fetch the [PptxGenJS](https://gitbrent.github.io/PptxGenJS/) library.

## Development

The entire app is a single self-contained HTML file (`index.html`) with no build step.

```
pipe-profile-plotter/
└── index.html   # all HTML, CSS, and JavaScript
```

To make changes, edit `index.html` and refresh the browser.
