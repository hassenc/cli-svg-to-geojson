Development in progress
Inspired from [mapbox/svg-to-geojson](https://github.com/mapbox/svg-to-geojson)


1- First convert png to svg.
Select colors, then replace secondary colors by white
> https://www.pngtosvg.com/

2 - Use inkscape-template.svg and inkscape to align the svg file on the map template

3 - Convert svg to geojson
> yarn cli convert -f path/to/file.svg

4 - File is exported to convert.YYYY-mm-dd.json
