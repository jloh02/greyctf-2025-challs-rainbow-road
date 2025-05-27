import { DefaultEventsMap, Server, Socket } from "socket.io";
import { canMoveBetween, FLAG_IMAGE, getSmallMazeData, initializeMaze, isAdjacent } from "./maze";

const userPositions: Map<string, { x: number; y: number }> = new Map();

const io = new Server({
  cors: {
    origin: process.env.NODE_ENV === "production" ? undefined : "http://localhost:5173",
  },
});

function handleMove(data: any, socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, callback: any) {
  const { x, y } = data;
  const position = userPositions.get(socket.id);

  if (
    x >= 0 && x < FLAG_IMAGE[0].length &&
    y >= 0 && y < FLAG_IMAGE.length &&
    isAdjacent(x, y, position?.x, position?.y) &&
    canMoveBetween(x, y, position?.x, position?.y)
  ) {
    userPositions.set(socket.id, { x, y });
    socket.emit("mazeUpdate", getSmallMazeData(x, y));
    if (callback) callback(true);
  }
}

function handleDisconnect(socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) {
  userPositions.delete(socket.id);
  console.log("A user disconnected with ID:", socket.id);
}

function initializeSocketServer() {
  io.on("connection", (socket) => {
    console.log("A user connected with ID:", socket.id);
    userPositions.set(socket.id, { x: 0, y: 0 });

    socket.emit("mazeUpdate", getSmallMazeData(0, 0)); // Send initial maze data
    socket.on("move", (data, callback) => handleMove(data, socket, callback));
    socket.on("endGame", () => handleDisconnect(socket));
    socket.on("disconnect", () => handleDisconnect(socket));
  });
}

initializeMaze(initializeSocketServer);
io.listen(4000);