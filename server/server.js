const { MongoClient } = require('mongodb');

const app = require('express')()
const http = require('http')
const { Server } = require('socket.io')
const cors = require("cors")
const mongoose = require("mongoose");
app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

async function main() {
  //connecting to MongoDB
  const uri = "mongodb+srv://danitbenoz2:Danit%40120@cluster0.altzoi2.mongodb.net/CodeApp?retryWrites=true&w=majority"

  // Create a new MongoClient
  const client = new MongoClient(uri);
  // console.log(client.db('CodeApp').collection('codes').find({"room_id": "1"}));
  try{
    await client.connect();
    const cursor = client.db('CodeApp').collection('codes').find({ room_id: "1" });
    const documents = await cursor.toArray();
    console.log(documents);

    await listDatabases(client)
    console.log("Connected to MongoDB");
  }
  catch(e){
    console.error(e);
  } finally {
    await client.close();
  }
}

main().catch(console.error);

async function listDatabases(client){
 const databaseList = await client.db().admin().listDatabases();
 console.log("Databases:");
 databaseList.databases.forEach(db=>{
  console.log(`-${db.name}`);
 })

}


// async function connect(){
//   try{
//     await mongoose.connect(uri);
//     console.log("Connected to MongoDB");
//   } catch(error) {
//     console.error(error);
//   }
// }
// connect();

// const codeSchema = new mongoose.Schema({
//   roomId: { type: String, required: true },
//   code: { type: String, required: true },
// });

// const Code = mongoose.model('Code', codeSchema);

// module.exports = Code;

// app.post('/api/save-code', async (req, res) => {
//   const { roomId, code } = req.body;

//   console.log('Received save-code request:', { roomId, code });

//   try {
//     // Save code to MongoDB
//     const newCode = new Code({ roomId, code });
//     await newCode.save();

//     console.log('Code saved successfully.');

//     res.status(200).json({ success: true });
//   } catch (error) {
//     console.error('Error saving code to MongoDB:', error);
//     res.status(500).json({ success: false, error: 'Internal Server Error' });
//   }
// });


app.get('/', function (req, res) {
  res.send('Hello from the server!')
})

const socketID_to_Users_Map = {}
const roomID_to_Code_Map = {}

async function getUsersinRoom(roomId, io) {
  const socketList = await io.in(roomId).allSockets()
  const userslist = []
  socketList.forEach((each => {
    (each in socketID_to_Users_Map) && userslist.push(socketID_to_Users_Map[each].username)
  }))

  return userslist
}

async function updateUserslistAndCodeMap(io, socket, roomId) {
  socket.in(roomId).emit("member left", { username: socketID_to_Users_Map[socket.id].username })

  // update the user list
  delete socketID_to_Users_Map[socket.id]
  const userslist = await getUsersinRoom(roomId, io)
  socket.in(roomId).emit("updating client list", { userslist: userslist })

  userslist.length === 0 && delete roomID_to_Code_Map[roomId]
}

//Whenever someone connects this gets executed
io.on('connection', function (socket) {
  console.log('A user connected', socket.id)

  socket.on("when a user joins", async ({ roomId, username }) => {
    console.log("username: ", username)
    socketID_to_Users_Map[socket.id] = { username }
    socket.join(roomId)

    const userslist = await getUsersinRoom(roomId, io)

    // for other users, updating the client list
    socket.in(roomId).emit("updating client list", { userslist: userslist })

    // for this user, updating the client list
    io.to(socket.id).emit("updating client list", { userslist: userslist })

    // send the latest code changes to this user when joined to existing room
    if (roomId in roomID_to_Code_Map) {
      io.to(socket.id).emit("on language change", { languageUsed: roomID_to_Code_Map[roomId].languageUsed })
      io.to(socket.id).emit("on code change", { code: roomID_to_Code_Map[roomId].code })
    }

    // alerting other users in room that new user joined
    socket.in(roomId).emit("new member joined", {
      username
    })
  })

  // for other users in room to view the changes
  socket.on("update language", ({ roomId, languageUsed }) => {
    if (roomId in roomID_to_Code_Map) {
      roomID_to_Code_Map[roomId]['languageUsed'] = languageUsed
    } else {
      roomID_to_Code_Map[roomId] = { languageUsed }
    }
  })

  // for user editing the code to reflect on his/her screen
  socket.on("syncing the language", ({ roomId }) => {
    if (roomId in roomID_to_Code_Map) {
      socket.in(roomId).emit("on language change", { languageUsed: roomID_to_Code_Map[roomId].languageUsed })
    }
  })

  // for other users in room to view the changes
  socket.on("update code", ({ roomId, code }) => {
    if (roomId in roomID_to_Code_Map) {
      roomID_to_Code_Map[roomId]['code'] = code
    } else {
      roomID_to_Code_Map[roomId] = { code }
    }
  })

  // for user editing the code to reflect on his/her screen
  socket.on("syncing the code", ({ roomId }) => {
    if (roomId in roomID_to_Code_Map) {
      socket.in(roomId).emit("on code change", { code: roomID_to_Code_Map[roomId].code })
    }
  })

  socket.on("leave room", ({ roomId }) => {
    socket.leave(roomId)
    updateUserslistAndCodeMap(io, socket, roomId)
  })

  socket.on("disconnecting", (reason) => {
    socket.rooms.forEach(eachRoom => {
      if (eachRoom in roomID_to_Code_Map) {
        updateUserslistAndCodeMap(io, socket, eachRoom)
      }
    })
  })

  //Whenever someone disconnects this piece of code executed
  socket.on('disconnect', function () {
    console.log('A user disconnected')
  })
})

//you can store your port number in a dotenv file, fetch it from there and store it in PORT
//we have hard coded the port number here just for convenience
const PORT = process.env.PORT || 5000

server.listen(PORT, function () {
  console.log(`listening on port : ${PORT}`)
})




