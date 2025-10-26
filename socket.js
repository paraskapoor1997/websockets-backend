const socket = require('socket.io');
const Message = require('./model/Message');
const initializeSocket = (server) => {

    const io = socket(server, {
        cors: {
            origin: "http://localhost:3000", //react app
            methods: ["GET", "POST"]
        }
    });
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on('joinChat',async ({ username, room }) => {
            socket.join(room);
            try{
                const messages = await Message.find({room})
                .sort({createdAt:1}) //oldest first
                .limit(50)
                socket.emit('chatHistory', messages)
            }catch(err){
                console.log("error fetching chat history", err)
            }
        })

        socket.on('sendMessage',async ({ username, room, text }) => {
            console.log(`Message from ${username} in room ${room}: ${text}`);
            const newMessage = new Message({room, sender: username, text})
            try{
                await newMessage.save()
            }catch(err){
                console.log("error saving messages", err)
            }
            io.to(room).emit('messageReceived', {_id:newMessage._id, id:username, text });
        })

        socket.on('disconnect', () => {
            console.log('User disconnected', socket.id);
        });
    });
}

module.exports = { initializeSocket };