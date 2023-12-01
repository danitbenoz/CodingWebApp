const { MongoClient } = require('mongodb');

const app = require('express')()
const http = require('http')
const { Server } = require('socket.io')
const cors = require("cors")
const mongoose = require("mongoose");
const bodyParser = require('body-parser'); 
app.use(cors())
app.use(bodyParser.json());

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// async function main() {
//   //connecting to MongoDB
//   const uri = "mongodb+srv://danitbenoz2:Danit%40120@cluster0.altzoi2.mongodb.net/CodeApp?retryWrites=true&w=majority"

//   // Create a new MongoClient
//   const client = new MongoClient(uri);
//   // console.log(client.db('CodeApp').collection('codes').find({"room_id": "1"}));
//   try{
//     await client.connect();
//     const cursor = client.db('CodeApp').collection('codes').find({ room_id: "1" });
//     const documents = await cursor.toArray();
//     console.log(documents);

//     await listDatabases(client)
//     console.log("Connected to MongoDB");
//   }
//   catch(e){
//     console.error(e);
//   } finally {
//     await client.close();
//   }
// }

// main().catch(console.error);

// async function listDatabases(client){
//  const databaseList = await client.db().admin().listDatabases();
//  console.log("Databases:");
//  databaseList.databases.forEach(db=>{
//   console.log(`-${db.name}`);
//  })

// }
//////////////

app.post('/saveCode', async (req, res) => {
  const { roomId, code } = req.body;
  let client; // Declare client here

  try {
    const uri = "mongodb+srv://danitbenoz2:Danit%40120@cluster0.altzoi2.mongodb.net/CodeApp?retryWrites=true&w=majority"
    client = new MongoClient(uri);
    await client.connect();
    console.log("Connected to MongoDB");
    // Check if there's an existing document for the room
    const existingDoc = await client.db('CodeApp').collection('codes').findOne({ room_id: roomId });

    if (existingDoc) {
      // Update the existing document with the new code
      await client.db('CodeApp').collection('codes').updateOne({ room_id: roomId }, { $set: { code: code } });
    } else {
      // Insert a new document if it doesn't exist
      await client.db('CodeApp').collection('codes').insertOne({ room_id: roomId, code: code });
    }

    res.status(200).json({ success: true, message: 'Code saved successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
});


app.get('/getCode/:roomId', async (req, res) => {
  const { roomId } = req.params;

  let client;

  try {
    const uri = "mongodb+srv://danitbenoz2:Danit%40120@cluster0.altzoi2.mongodb.net/CodeApp?retryWrites=true&w=majority"
    const client = new MongoClient(uri);
    await client.connect();

    const codeDocument = await client.db('CodeApp').collection('codes').findOne({ room_id: roomId });

    if (codeDocument) {
      console.log(codeDocument);
      res.json({ success: true, code: codeDocument.code });
    } else {
      res.json({ success: false, message: 'Code not found for the specified room ID.' });
    }
  } catch (error) {
    console.error('Error fetching code:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  } finally {
    if(client){
      await client.close();
    }
  }
});

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

const PORT = process.env.PORT || 5000

server.listen(PORT, function () {
  console.log(`listening on port : ${PORT}`)
})




