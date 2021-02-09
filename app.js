
const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const { graphql, buildSchema } = require('graphql')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const Block = require('./models/block')
const User = require('./models/user')

const app = express()
app.use(express.json())
app.use('/graphql', graphqlHTTP({
  schema: buildSchema(`
    type Block {
      _id: ID!
      label: String!
      content: String!
      date: Float!
    }

    type User {
      _id: ID!
      email: String!
      password: String
    }

    input BlockInput {
      label: String!
      content: String!
      date: Float!
    }

    input UserInput {
      email: String!
      password: String!
    }

    type RootQuery {
      blocks: [Block!]
    }

    type RootMutation {
      createBlock(blockInput: BlockInput): Block
      createUser(userInput: UserInput): User
    }

    schema {
      query: RootQuery
      mutation: RootMutation
    }
    `),
    rootValue: {
      blocks: () => {
        return Block.find()
        .then(blocks => {
          return blocks.map(block => {
            return { ...block._doc, _id: block.id }
          })
        }).catch(err => {
          console.log(err)
          throw err
        })
      },
      createBlock: (args) => {
        const block = new Block({
          label: args.blockInput.label,
          content: args.blockInput.content,
          date: args.blockInput.date,
          creator: "60227c9fb6aa9b77283bca4c"
        })
        let createdBlock
        return block
        .save()
        .then(res => {
          createdBlock = { ...res._doc, _id: res.id }
          return User.findById("60227c9fb6aa9b77283bca4c")
        })
        .then(user => {
          if (!user) {
            throw new Error('User not found.')
          }
          user.createdBlocks.push(block)
          return user.save()
        })
        .then(res => {
          return createdBlock
        })
        .catch(err => {
          console.log(err)
          throw err
        })
      },
      createUser: (args) => {
        return User.findOne({email: args.userInput.email}).then(user => {
          if (user) {
            throw new Error('User exists already.')
          }
          return bcrypt.hash(args.userInput.password, 12)
        })
        .then(hashedPassword => {
          const user = new User({
            email: args.userInput.email,
            password: hashedPassword
          })
          return user.save()
        })
        .then(res => {
          return {...res._doc, _id: res.id, password: null}
        })
        .catch(err => {
          throw err
        })
      }
    },
    graphiql: true
  }))

  mongoose.connect(
    `mongodb+srv://${process.env.MONGO_USER}:${
      process.env.MONGO_PASSWORD}@cluster0.d7f4t.mongodb.net/${
        process.env.MONGO_DB}?retryWrites=true&w=majority`
      ).then(
        app.listen(3000)
      ).catch(err => {
        console.log(err)
      })
