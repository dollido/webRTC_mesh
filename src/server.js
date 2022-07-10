import http from "http";
import { Server } from "socket.io";
import express from "express";
import livereload from "livereload";
import connectLiveReload from "connect-livereload";
import { instrument } from "@socket.io/admin-ui";

/** set express */
const app = express();

/** live reload */
const liveReloadServer = livereload.createServer();
liveReloadServer.server.once("connection", () => setTimeout(() => liveReloadServer.refresh("/"), 100));
app.use(connectLiveReload());



/** pug view engine */
app.set("view engine", "pug");
app.set("views", __dirname + "/views");

app.use("/public", express.static(__dirname + "/public"));



/** router */
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => {
    console.log('hello');
    res.redirect("/");
});


/** create http server */
const httpServer = http.createServer(app);

/** create io server */
const wsServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true
    }
});

instrument(wsServer, {
    auth: false
});

wsServer.on("connection", socket => {
    socket.on("join_room", (room, id) => {
        socket.join(room);
        console.log(wsServer.adapter);
        socket.to(room).emit("welcome", id);
    });
    socket.on("offer", (offer, room, newbieID, offersId) => {
        socket.to(newbieID).emit("offer", offer, offersId);
    });
    socket.on("answer", (offer, offersId, newbieId) => {
        socket.to(offersId).emit("answer", offer, newbieId);
    });
    socket.on("ice", (ice, room, othersId, myId) => {
        socket.to(othersId).emit("ice", ice, myId);
    });
    socket.on("smile", (peerHp, room, peerId) => { // 웃은 사람의 hp 업데이트
        socket.to(room).emit("smile", peerHp, peerId);
    })
})

/** open server */
const port = 3000;
httpServer.listen(port, () => { console.log(`http://localhost:${port}`) });