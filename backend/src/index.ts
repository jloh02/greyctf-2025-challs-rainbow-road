import { Server } from "socket.io";
import { canMoveBetween, FLAG_IMAGE, getSmallMazeData, initializeMaze, WALLS } from "./maze";

const userPositions: Map<string, { x: number; y: number }> = new Map();

const io = new Server({
  cors: {
    origin: process.env.NODE_ENV === "production" ? undefined : "http://localhost:5173",
  },
});

function initializeSocketServer() {
  io.on("connection", (socket) => {
    console.log("A user connected with ID:", socket.id);
    userPositions.set(socket.id, { x: 0, y: 0 });

    socket.emit("mazeUpdate", getSmallMazeData(0, 0)); // Send initial maze data

    socket.on("moveDirection", (data) => {
      const { direction } = data;
      const position = userPositions.get(socket.id);

      console.log(`User ${socket.id} moved ${direction} from position`, position);

      if (position) {
        let newX = position.x;
        let newY = position.y;

        switch (direction) {
          case "up":
            newY -= 1;
            break;
          case "down":
            newY += 1;
            break;
          case "left":
            newX -= 1;
            break;
          case "right":
            newX += 1;
            break;
        }

        // Check bounds and walls
        if (
          newX >= 0 && newX < FLAG_IMAGE.length &&
          newY >= 0 && newY < FLAG_IMAGE.length &&
          canMoveBetween(position.x, position.y, newX, newY)
        ) {
          userPositions.set(socket.id, { x: newX, y: newY });
          socket.emit("mazeUpdate", getSmallMazeData(newX, newY));
        }
      }
    });

    socket.on("disconnect", () => {
      userPositions.delete(socket.id);
      console.log("A user disconnected with ID:", socket.id);
    });
  });
}

initializeMaze(initializeSocketServer);
io.listen(4000);