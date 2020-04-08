const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.port || 3000

const publicDirectoryPath = path.join(__dirname, '../public')
app.use(express.static(publicDirectoryPath))

let count = 0

io.on('connection', (socket) => { //this function runs for each client (socket)
    console.log("New WebSocket connection")

    socket.on('join', ({username, room}, callback)=>{

        const { error, user } = addUser({ id: socket.id, username, room })

        if(error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage("Admin","Welcome!"))
        socket.broadcast.to(user.room).emit('message',generateMessage("Admin",`${user.username} has joined!`)) //send to everyone except the socket

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()

        //socket.emit, io.emit, socket.broadcast.emit (emits to everyone)
        //io.to('room').emit (emits to everyone in a specific room)
        //socket.broadcast.to('room').emit
    })

    socket.on('sendMessage', (message, callback)=> {

        const user = getUser(socket.id)

        const filter = new Filter()
        if (filter.isProfane(message)){
            return callback('Profanity is not allowed!')
        }
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (coords, callback)=>{
       
        const user = getUser(socket.id)
        
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    //disconnect is a built-in event; no need for client to emit
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user) {
            io.to(user.room).emit('message', generateMessage("Admin", `${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})



server.listen(port, (error)=> {
    console.log(`Server is up on port ${port}!`,
    error
    )
})