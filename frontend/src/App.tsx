import { useEffect, useState } from 'react'
import './App.css'
import { socket } from './socket'

function App() {
  const [walls, setWalls] = useState<boolean[][]>([]);
  const [colors, setColors] = useState<string[][]>([]);

  useEffect(() => {
    socket.on('mazeUpdate', (data) => {
      console.log('Maze update received:', data);
      setWalls(data.walls);
      setColors(data.colors);
    });

    socket.on('connect', () => {
      console.log('Connected to server with ID:', socket.id);
    });

    return () => {
      socket.off('connect');
      socket.off('mazeUpdate');
    };
  }, []);

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${colors[0]?.length || 1}, 1fr)`,
          gridTemplateRows: `repeat(${colors.length || 1}, 1fr)`,
          border: '5px solid black',
        }}
      >
        {colors.map((row, rowIndex) =>
          row.map((color, colIndex) => {
            const y = rowIndex * 2;
            const x = colIndex * 2;

            const wallTop = (y > 0) ? walls[y - 1][x] : false;
            const wallBottom = (y + 1 < walls.length) ? (walls[y + 1][x]) : false;
            const wallLeft = (x > 0) ? (walls[y][x - 1]) : false;
            const wallRight = (x + 1 < walls[0].length) ? (walls[y][x + 1]) : false;

            const borderStyle = '2px solid black'
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: color || 'none',
                  boxSizing: 'border-box',
                  borderTop: wallTop ? borderStyle : 'none',
                  borderBottom: wallBottom ? borderStyle : 'none',
                  borderLeft: wallLeft ? borderStyle : 'none',
                  borderRight: wallRight ? borderStyle : 'none',
                }}
              />
            );
          })
        )}
      </div>


      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
