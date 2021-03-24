const mongoose = require('mongoose')

const Schema = mongoose.Schema

const userSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: false
  },
  name: {
    type: String,
    required: false
  },
  picture: {
    type: String,
    required: false
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
