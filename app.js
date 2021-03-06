const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const { buildSchema } = require('graphql')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const Block = require('./models/block')
const User = require('./models/user')

const isAuth = require('./middleware/is-auth')
const { errorTypes, errorDetails } = require('./errors/error-types')

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})
app.use(isAuth)
app.use('/graphql', graphqlHTTP({
  customFormatErrorFn: (error) => {
    return errorDetails[error.message]
  },
  schema: buildSchema(`
    type Block {
      _id: ID!
      label: String!
      content: String!
      date: Float!
      sn: Int!
    }

    type User {
      _id: ID!
      email: String!
      password: String
    }

    type AuthData {
      userId: ID!
      token: String!
      tokenExpiration: Int!
    }

    type DeletedCount {
      deletedCount: Int!
    }

    input BlockInput {
      label: String!
      content: String!
      date: Float!
      sn: Int!
    }

    input UserInput {
      email: String!
      password: String!
    }

    type RootQuery {
      familyBlocks(date: Float!): [Block!]
      blocks(label: String!): [Block!]
      login(email: String!, password: String!): AuthData!
    }

    type RootMutation {
      createBlock(blockInput: BlockInput): Block
      deleteFamilyBlocks(date: Float!): DeletedCount!
      createUser(userInput: UserInput): User
    }

    schema {
      query: RootQuery
      mutation: RootMutation
    }
    `),
  rootValue: {
    familyBlocks: async (args, req) => {
      if (!req.isAuth) {
        throw new Error(errorTypes.UNAUTHORIZED)
      }

      const blocksQuery = { creator: req.userId, date: args.date }

      try {
        const blocks = await Block.find(blocksQuery).sort({ sn: 1 })
        return blocks.map(block => {
          return { ...block._doc, _id: block.id }
        })
      } catch (error) {
        console.log(error)
      }
    },
    blocks: async (args, req) => {
      if (!req.isAuth) {
        throw new Error(errorTypes.UNAUTHORIZED)
      }

      let blocksQuery
      if (args.label === '') {
        blocksQuery = { creator: req.userId }
      } else {
        blocksQuery = { creator: req.userId, label: args.label }
      }

      try {
        const blocks = await Block.find(blocksQuery).sort({ date: -1, sn: 1 })
        return blocks.map(block => {
          return { ...block._doc, _id: block.id }
        })
      } catch (error) {
        console.log(error)
      }
    },
    login: async ({ email, password }) => {
      const user = await User.findOne({ email: email })
      if (!user) {
        throw new Error('User does not exist!')
      }

      const isEqual = await bcrypt.compare(password, user.password)
      if (!isEqual) {
        throw new Error('Password is incorrect!')
      }

      const token = jwt.sign({ userId: user.id }, 'temporarySecretKey', {
        expiresIn: '1h'
      })

      return { userId: user.id, token: token, tokenExpiration: 1 }
    },
    createBlock: async (args, req) => {
      if (!req.isAuth) {
        throw new Error(errorTypes.UNAUTHORIZED)
      }

      const block = new Block({
        label: args.blockInput.label,
        content: args.blockInput.content,
        date: args.blockInput.date,
        sn: args.blockInput.sn,
        creator: req.userId
      })

      let createdBlock
      try {
        const res = await block.save()
        createdBlock = { ...res._doc, _id: res.id }

        const user = await User.findById(req.userId)
        if (!user) {
          throw new Error('User not found.')
        }
        user.createdBlocks.push(block)
        await user.save()

        return createdBlock
      } catch (error) {
        console.log(error)
      }
    },
    deleteFamilyBlocks: async (args, req) => {
      if (!req.isAuth) {
        throw new Error(errorTypes.UNAUTHORIZED)
      }

      const blocksQuery = { creator: req.userId, date: args.date }

      try {
        const res = await Block.deleteMany(blocksQuery)
        return { deletedCount: res.deletedCount }
      } catch (error) {
        console.log(error)
      }
    },
    createUser: async (args) => {
      try {
        const user = await User.findOne({ email: args.userInput.email })
        if (user) {
          throw new Error('User already exists.')
        }

        const hashedPassword = await bcrypt.hash(args.userInput.password, 12)
        const userHased = new User({
          email: args.userInput.email,
          password: hashedPassword
        })
        const res = await userHased.save()

        return { ...res._doc, _id: res.id, password: null }
      } catch (error) {
        console.log(error)
      }
    }
  },
  graphiql: true
}))

mongoose.connect(
  `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.d7f4t.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`
).then(
  app.listen(8000)
).catch(error => {
  console.log(error)
})
