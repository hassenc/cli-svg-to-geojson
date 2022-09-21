import { transform } from 'pathologist';
import { createSVGWindow } from 'svgdom';
import turf from '@turf/turf';
import mapboxgl from 'mapbox-gl';
import { pathToCoords } from './path-to-coordinates';

const SCALE = 1;
const NUM_POINTS = 250;
const { x: originMercatorX, y: originMercatorY } = mapboxgl.MercatorCoordinate.fromLngLat({ lng: -20, lat: 50 }, 0);
const { x: edgeMercatorX, y: edgeMercatorY } = mapboxgl.MercatorCoordinate.fromLngLat({ lng: 50, lat: 20 }, 0);

const svgMaxXCoords = 422.8;
const svgMaxYCoords = 227.01;

const xRatio = (edgeMercatorX - originMercatorX) / (svgMaxXCoords - 0);
const yRatio = (edgeMercatorY - originMercatorY) / (svgMaxYCoords - 0);

const transformPoint = ({ x, y }) => {
  const newX = originMercatorX + x * xRatio;
  const newY = edgeMercatorY + (y - svgMaxYCoords) * yRatio;
  const mercatorPoint = new mapboxgl.MercatorCoordinate(newX, newY, 0);
  return mercatorPoint.toLngLat();
};

const transformArray = (d) => transformPoint({ x: d[0], y: d[1] });

// newY - edgeMercatorY -> svgMaxYCoords - y
// originMercatorY - edgeMercatorY -> svgMaxYCoords
//
// edgeMercatorY + y*yRatio - svgMaxYCoords*yRatio = newY
const buildFeature = (data) => {
  const { path, coords } = data;

  const feature = {
    type: 'Feature',
    properties: {},
    geometry: {},
  };

  if (path.id) {
    feature.properties.id = path.id;
  }

  if (path.getAttribute('fill')) {
    feature.properties.fill = path.getAttribute('fill');
  }

  // If the first and last coords match it should be drawn as a polygon
  if (coords[0][0] === coords[coords.length - 1][0]
      && coords[0][1] === coords[coords.length - 1][1]) {
    console.log(path, coords);
    feature.geometry = {
      type: 'Polygon',
      coordinates: [
        coords.map((d) => {
          const c = transformPoint({ x: d[0], y: d[1] });
          return [c.lng, c.lat];
        }),
      ],
    };
  } else {
    const getSum = (total, num) => total + num;
    try {
      // try to see if it should be a multipolygon
      const distances = [];
      const splits = [];
      coords.forEach((c, idx) => {
        if (idx > 0) {
          const from = turf.point([transformArray(coords[idx - 1]).lng, transformArray(coords[idx - 1]).lat]);
          const to = turf.point([transformArray(c).lng, transformArray(c).lat]);
          const options = { units: 'miles' };

          const distance = turf.distance(from, to, options);
          // get distances between points
          distances.push(distance);
        }
      });

      const distAvg = distances.reduce(getSum) / distances.length;
      coords.forEach((c, idx) => {
        if (idx > 0) {
          const from = turf.point([transformArray(coords[idx - 1]).lng, transformArray(coords[idx - 1]).lat]);
          const to = turf.point([transformArray(c).lng, transformArray(c).lat]);
          const options = { units: 'miles' };
          const distance = turf.distance(from, to, options);
          // if the following coordinate is ~2.5 farther away than average, it is most likely a new polygon
          if (distance > distAvg * 2.5) {
            splits.push(idx);
          }
        }
      });

      // idx only gets to last split - needs to get to the end of the shape
      splits.push(NUM_POINTS);

      const newShapeArray = [];
      splits.forEach((s, idx) => {
        const shape = [];
        if (idx === 0) {
          for (let i = 0; i < s; i += 1) {
            shape.push([transformArray(coords[i]).lng, transformArray(coords[i]).lat]);
          }
        } else {
          for (let i = splits[idx - 1]; i < s; i += 1) {
            shape.push([transformArray(coords[i]).lng, transformArray(coords[i]).lat]);
          }
        }
        newShapeArray.push([shape]);
      });

      newShapeArray.forEach((shape) => {
        shape[0].push(shape[0][0]);
      });

      feature.geometry = {
        type: 'MultiPolygon',
        coordinates: newShapeArray,
      };
    } catch (_) {
      feature.geometry = {
        type: 'LineString',
        coordinates: coords.map((d) => {
          const c = transformPoint({ x: d[0], y: d[1] });
          return [c.lng, c.lat];
        }),
      };
    }
  }

  return feature;
};

export const svgToGeoJSON = (svgString) => {
  const window = createSVGWindow();
  // Create an empty container to fetch paths using the dom
  const empty = window.document.createElement('div');
  empty.innerHTML = svgString;

  // const coordinates = calculateCoords(empty.querySelector('svg'));
  const paths = empty.querySelectorAll('path');

  if (!paths.length) {
    console.log({
      helpText: 'No paths were found in this SVG',
    });
    return;
  }

  return Array
    .from(paths)
    .map((path) => pathToCoords(
      path,
      SCALE,
      NUM_POINTS,
      0,
      0
    ))
    .map(buildFeature);
};

export const pathologize = (svg) => {
  const expression = /<(text|style|metadata|pattern)[\s\S]*?<\/(text|style|metadata|pattern)>/g;
  const clean = svg.replace(expression, '');

  return new Promise((resolve, reject) => {
    const transformed = transform(clean);
    if (!transformed) {
      return reject(svg);
    }
    resolve(transformed);
  });
};
