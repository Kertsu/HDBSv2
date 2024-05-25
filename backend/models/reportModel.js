const mongoose = require("mongoose");

const ReportSchema = mongoose.Schema({ 
    
}, { timestamps: true });

module.exports = mongoose.model("Report", ReportSchema);
