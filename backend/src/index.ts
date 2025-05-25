import { Server } from "socket.io";

const io = new Server({
  cors: {
    origin: process.env.NODE_ENV === "production" ? undefined : "http://localhost:5173",
  },
});

io.on("connection", (socket) => {
  console.log("A user connected with ID:", socket.id);

  socket.on("message", (msg) => {
    console.log("Message received:", msg);
    // Broadcast the message to all connected clients
    io.emit("message", msg);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected with ID:", socket.id);
  });
});

io.listen(4000);