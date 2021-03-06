const mongoose = require('mongoose')

const Schema = mongoose.Schema

const blockSchema = new Schema({
  label: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  date: {
    type: Number,
    required: true
  },
  sn: {
    type: Number,
    required: true
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
})

module.exports = mongoose.model('Block', blockSchema)
