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
      createMazeImage(callback);
    });
}

// TODO: prune even more walls so that maze is more open
// Use reverse backtracking algorithm to generate a maze using size of FLAG_IMAGE
export function generateMazeWalls() {
  const cellWidth = FLAG_IMAGE[0].length;
  const cellHeight = FLAG_IMAGE.length;

  // New WALLS size with walls between cells
  const width = cellWidth * 2 + 1;
  const height = cellHeight * 2 + 1;

  // Initialize all as walls (true)
  WALLS = Array.from({ length: height }, () => Array(width).fill(true));

  // visited for cell coordinates
  const visited = Array.from({ length: cellHeight }, () => Array(cellWidth).fill(false));
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  function isInCellBounds(x: number, y: number) {
    return x >= 0 && x < cellWidth && y >= 0 && y < cellHeight;
  }

  const stack = [{ x: 0, y: 0 }];
  visited[0][0] = true;
  WALLS[1][1] = false; // mark starting cell as path (top-left cell at (0,0))

  while (stack.length > 0) {
    const { x, y } = stack[stack.length - 1];

    // Shuffle directions
    const shuffled = directions.sort(() => Math.random() - 0.5);
    let moved = false;

    for (const { dx, dy } of shuffled) {
      const nx = x + dx;
      const ny = y + dy;

      if (isInCellBounds(nx, ny) && !visited[ny][nx]) {
        // Remove wall between (x,y) and (nx, ny)
        const wallX = x * 2 + dx + 1; // wall between cells in WALLS coords
        const wallY = y * 2 + dy + 1;

        // Mark cell at (nx, ny) and wall between as path (false)
        WALLS[ny * 2 + 1][nx * 2 + 1] = false;
        WALLS[wallY][wallX] = false;

        visited[ny][nx] = true;
        stack.push({ x: nx, y: ny });
        moved = true;
        break;
      }
    }

    if (!moved) {
      stack.pop();
    }
  }
}

function createMazeImage(callback: () => void) {
  const height = WALLS.length;
  const width = WALLS[0].length;

  const png = new PNG({ width, height });

  // Helper: set pixel color
  function setPixel(x: number, y: number, r: number, g: number, b: number) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = (width * y + x) << 2;
    png.data[idx] = r;
    png.data[idx + 1] = g;
    png.data[idx + 2] = b;
    png.data[idx + 3] = 255;
  }

  // Paint walls and paths
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (WALLS[y][x]) {
        // Wall pixel - paint black
        setPixel(x, y, 0, 0, 0);
      } else {
        // Path pixel - paint color from FLAG_IMAGE if even-even index (cell)
        if (y % 2 === 0 && x % 2 === 0) {
          const cellY = y / 2;
          const cellX = x / 2;
          const hex = FLAG_IMAGE[cellY][cellX];
          const { r, g, b } = hexToRgb(hex);
          setPixel(x, y, r, g, b);
        } else {
          // Wall between cells carved as path - paint color of top or left cell
          let cellHex: string | undefined;

          if (y % 2 === 1 && x % 2 === 0) {
            // vertical wall between two cells above and below, use cell above
            if (y > 0) cellHex = FLAG_IMAGE[(y - 1) / 2][x / 2];
          } else if (y % 2 === 0 && x % 2 === 1) {
            // horizontal wall between two cells left and right, use cell to the left
            if (x > 0) cellHex = FLAG_IMAGE[y / 2][(x - 1) / 2];
          } else if (y % 2 === 1 && x % 2 === 1) {
            // diagonal wall, use top-left cell
            if (y > 0 && x > 0) cellHex = FLAG_IMAGE[(y - 1) / 2][(x - 1) / 2];
          }

          if (!cellHex) {
            setPixel(x, y, 0, 0, 0);
          } else {
            const { r, g, b } = hexToRgb(cellHex);
            setPixel(x, y, r, g, b);
          }
        }
      }
    }
  }

  // Write PNG to file
  const outStream = fs.createWriteStream("maze.png");
  png.pack().pipe(outStream);

  outStream.on("finish", () => {
    console.log("Maze exploded image created: maze.png");
    callback();
  });
}

function canMoveTo(x: number, y: number): boolean {
  return (
    y >= 0 &&
    y < FLAG_IMAGE.length &&
    x >= 0 &&
    x < FLAG_IMAGE[0].length
  );
}

export function canMoveBetween(x1: number, y1: number, x2: number, y2: number): boolean {
  if (!canMoveTo(x1, y1) || !canMoveTo(x2, y2)) return false;

  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);

  // Must be adjacent cells
  if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
    const wallX = (x1 + x2 + 1);
    const wallY = (y1 + y2 + 1);

    // // Check if wall in between is passable (false means path)
    // console.log(`Checking wall at (${wallX}, ${wallY}): ${WALLS[wallY][wallX]}`);

    // // print small section of WALLS for debugging as 1 (wall) and 0 (path)
    // for (let i = -5; i <= 5; i++) {
    //   let rowStr = "";
    //   for (let j = -5; j <= 5; j++) {
    //     const debugY = wallY + i;
    //     const debugX = wallX + j;
    //     if (debugY >= 0 && debugY < WALLS.length && debugX >= 0 && debugX < WALLS[0].length) {
    //       rowStr += WALLS[debugY][debugX] ? "1" : "0";
    //     } else {
    //       rowStr += " ";
    //     }
    //   }
    //   console.log(rowStr);
    // }

    if (!WALLS[wallY][wallX]) {
      return true;
    }
  }

  return false;
}



export function getSmallMazeData(
  centerX: number,
  centerY: number,
  smallMazeRadius: number = 10
): { walls: boolean[][]; colors: string[][] } {
  // Colors grid: (2*smallMazeRadius+1) x (2*smallMazeRadius+1)
  // Walls grid: (2*smallMazeRadius+1)*2-1 x (2*smallMazeRadius+1)*2-1
  const colorSize = 2 * smallMazeRadius - 1;
  const wallSize = colorSize * 2 + 1;

  const colors: string[][] = [];
  const walls: boolean[][] = [];

  // Prepare colors (cell grid)
  for (let y = 0; y < colorSize; y++) {
    const colorRow: string[] = [];
    const mazeY = centerY - (smallMazeRadius - 1) + y;
    for (let x = 0; x < colorSize; x++) {
      const mazeX = centerX - (smallMazeRadius - 1) + x;
      if (
        mazeY >= 0 &&
        mazeY < FLAG_IMAGE.length &&
        mazeX >= 0 &&
        mazeX < FLAG_IMAGE[0].length
      ) {
        colorRow.push(FLAG_IMAGE[mazeY][mazeX]);
      } else {
        colorRow.push(""); // or "#000000"
      }
    }
    colors.push(colorRow);
  }

  // Prepare walls (wall grid)
  for (let y = 0; y < wallSize; y++) {
    const wallRow: boolean[] = [];
    const mazeY = centerY * 2 - ((wallSize) >> 1) + 2 + y;
    for (let x = 0; x < wallSize; x++) {
      const mazeX = centerX * 2 - ((wallSize) >> 1) + 2 + x;
      if (
        mazeY >= 0 &&
        mazeY < WALLS.length &&
        mazeX >= 0 &&
        mazeX < WALLS[0].length
      ) {
        wallRow.push(WALLS[mazeY][mazeX]);
      } else {
        wallRow.push(false);
      }
    }
    walls.push(wallRow);
  }

  return { walls, colors };
}
