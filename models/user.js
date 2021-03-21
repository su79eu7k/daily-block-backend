const mongoose = require('mongoose')

const Schema = mongoose.Schema

const userSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  createdBlocks: {
    type: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Block'
      }
    ]
  }
})

module.exports = mongoose.model('User', userSchema)
