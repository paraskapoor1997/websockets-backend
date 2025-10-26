const mongoose = require('mongoose');

const messageScehma = mongoose.Schema({
    room:{type: String,
        required: true
    },
    sender:{
        type: String,
        required: true
    },
    text:{
        type: String,
        required: true
    },
    createdAt:{
        type: Date,
        default: Date.now
    },
})

module.exports = mongoose.model("Message", messageScehma)