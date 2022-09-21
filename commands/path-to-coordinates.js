import { range } from 'lodash';

export const pathToCoords = (path, scale, numPoints, translateX, translateY) => {
  const length = path.getTotalLength();
  const getRange = range(numPoints);
  // Always include the max value in the range.
  // This is helpful for detecting closed polygons vs lines
  getRange.push(numPoints);
  const coords = getRange.map((i) => {
    const point = path.getPointAtLength(length * i / numPoints);
    return [point.x * scale + translateX, point.y * scale + translateY];
  });
  return {
    path,
    coords,
  };
};
