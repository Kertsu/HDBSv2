const mongoose = require('mongoose')

const auditTrailSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }, 
    email:{
        type: String,
    },
    actionType:{
        type: String,
        required: true
    },
    actionDetails:{
        type: String,
        required: true
    },
    ipAddress:{
        type: String,
        required: true
    },
    status:{
        type: String,
        required: true,
        enum: ["success", "failed"]
    },
    additionalContext:{
        type: String
    },

}, {timestamps: true})

module.exports = mongoose.model('AuditTrail', auditTrailSchema)