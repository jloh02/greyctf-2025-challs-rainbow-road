import fs from "fs";
import { PNG } from "pngjs";
import { hexToRgb, rgbToHex } from "./utils";

export const FLAG_IMAGE: string[][] = []; // Hex values of pixels in the flag image
export let WALLS: boolean[][]; // Global 2D array for wall status (true = wall, false = path)

export function initializeMaze(callback: () => void) {
  // Read the flag image and parse

  fs.createReadStream('flag-out.png')
    .pipe(new PNG())
    .on('parsed', function () {
      // this.width and this.height give the image dimensions
      // this.data is a Buffer containing pixel data in RGBA format
      for (let y = 0; y < this.height; y++) {
        const row = [];
        for (let x = 0; x < this.width; x++) {
          const idx = (this.width * y + x) << 2; // same as *4

          const r = this.data[idx];
          const g = this.data[idx + 1];
          const b = this.data[idx + 2];
          // const a = this.data[idx + 3];
          // console.log(`Pixel at (${x}, ${y}) - R:${r} G:${g} B:${b} A:${a}`);

          row.push(rgbToHex(r, g, b));
        }
        FLAG_IMAGE.push(row);
      }

      generateMazeWalls();
      createMazeImage();
      callback()
    });
}


// Use reverse backtracking algorithm to generate a maze using size of FLAG_IMAGE
export function generateMazeWalls() {
  const width = FLAG_IMAGE[0].length;
  const height = FLAG_IMAGE.length;

  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  const carved = Array.from({ length: height }, () => Array(width).fill(false));
  const directions = [
    { dx: 1, dy: 0 }, // Right
    { dx: -1, dy: 0 }, // Left
    { dx: 0, dy: 1 }, // Down
    { dx: 0, dy: -1 }, // Up
  ];
  const isInBounds = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height;

  const stack = [{ x: 0, y: 0 }];
  visited[0][0] = true;
  carved[0][0] = true;

  while (stack.length > 0) {
    const { x, y } = stack[stack.length - 1];

    const shuffled = directions.sort(() => Math.random() - 0.5);
    let moved = false;

    for (const { dx, dy } of shuffled) {
      const nx = x + dx * 2;
      const ny = y + dy * 2;

      if (isInBounds(nx, ny) && !visited[ny][nx]) {
        const mx = x + dx; // wall between
        const my = y + dy;

        visited[ny][nx] = true;
        carved[ny][nx] = true;
        carved[my][mx] = true;

        stack.push({ x: nx, y: ny });
        moved = true;
        break;
      }
    }

    if (!moved) {
      stack.pop(); // backtrack
    }
  }

  // Initialize WALLS with true (assume everything is a wall)
  WALLS = Array.from({ length: height }, () => Array(width).fill(true));

  // Set carved positions as not walls
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (carved[y][x]) {
        WALLS[y][x] = false;
      }
    }
  }
}

function createMazeImage() {
  const originalHeight = WALLS.length;
  const originalWidth = WALLS[0].length;

  // Output image size: expanded with walls between pixels
  const width = originalWidth * 2 - 1;
  const height = originalHeight * 2 - 1;

  const png = new PNG({ width, height });

  // Helper: paint pixel in output image
  function setPixel(x: number, y: number, r: number, g: number, b: number) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = (width * y + x) << 2;
    png.data[idx] = r;
    png.data[idx + 1] = g;
    png.data[idx + 2] = b;
    png.data[idx + 3] = 255;
  }

  // First, set all pixels to black (walls)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      setPixel(x, y, 0, 0, 0); // default black walls
    }
  }

  // Paint original pixels (paths) on even coordinates
  for (let y = 0; y < originalHeight; y++) {
    for (let x = 0; x < originalWidth; x++) {
      if (!WALLS[y][x]) {
        // path cell — paint original pixel color from FLAG_IMAGE
        const { r, g, b } = hexToRgb(FLAG_IMAGE[y][x]);
        setPixel(2 * x, 2 * y, r, g, b);
      } else {
        // wall cell, keep black (already set)
      }
    }
  }

  // Horizontal paths between cells
  for (let y = 0; y < originalHeight; y++) {
    for (let x = 0; x < originalWidth - 1; x++) {
      if (!WALLS[y][x] && !WALLS[y][x + 1]) {
        // no wall between, paint path pixel between original pixels
        // Use average color or one side color - here choose left side's color
        const { r, g, b } = hexToRgb(FLAG_IMAGE[y][x]);
        setPixel(2 * x + 1, 2 * y, r, g, b);
      } // else keep black wall pixel
    }
  }

  // Vertical paths between cells
  for (let y = 0; y < originalHeight - 1; y++) {
    for (let x = 0; x < originalWidth; x++) {
      if (!WALLS[y][x] && !WALLS[y + 1][x]) {
        // no wall between vertically
        const { r, g, b } = hexToRgb(FLAG_IMAGE[y][x]);
        setPixel(2 * x, 2 * y + 1, r, g, b);
      }
    }
  }

  // Diagonal intersections
  for (let y = 0; y < originalHeight - 1; y++) {
    for (let x = 0; x < originalWidth - 1; x++) {
      if (
        !WALLS[y][x] &&
        !WALLS[y + 1][x] &&
        !WALLS[y][x + 1] &&
        !WALLS[y + 1][x + 1]
      ) {
        // If all four corners are paths, paint intersection path pixel
        const { r, g, b } = hexToRgb(FLAG_IMAGE[y][x]);
        setPixel(2 * x + 1, 2 * y + 1, r, g, b);
      }
    }
  }

  // Write PNG to file
  const outStream = fs.createWriteStream("maze.png");
  png.pack().pipe(outStream);

  outStream.on("finish", () => {
    console.log("Maze exploded image created: maze.png");
  });
}

function canMoveTo(x: number, y: number): boolean {
  return (
    x >= 0 && x < WALLS[0].length &&
    y >= 0 && y < WALLS.length &&
    !WALLS[y][x]
  );
}

export function canMoveBetween(x1: number, y1: number, x2: number, y2: number): boolean {
  // Check bounds
  if (!canMoveTo(x1, y1) || !canMoveTo(x2, y2)) return false;

  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);

  // Only allow cardinal movement
  if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
    return true;
  }

  return false; // diagonal or invalid step
}

export function getSmallMazeData(centerX: number, centerY: number, smallMazeRadius: number = 10): { walls: boolean[][], colors: string[][] } {
  const walls: boolean[][] = [];
  const colors: string[][] = [];

  const minY = Math.max(0, centerY - smallMazeRadius);
  const maxY = Math.min(WALLS.length - 1, centerY + smallMazeRadius);
  const minX = Math.max(0, centerX - smallMazeRadius);
  const maxX = Math.min(WALLS[0].length - 1, centerX + smallMazeRadius);

  for (let y = minY; y <= maxY; y++) {
    const wallRow: boolean[] = [];
    const colorRow: string[] = [];
    for (let x = minX; x <= maxX; x++) {
      wallRow.push(WALLS[y][x]);
      colorRow.push(FLAG_IMAGE[y][x]);
    }
    walls.push(wallRow);
    colors.push(colorRow);
  }

  return { walls, colors };
}