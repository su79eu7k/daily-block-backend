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
    // console.log(error)
    return errorDetails[error.message]
  },
  schema: buildSchema(`
    type Distinct {
      distinct: [Float]!
    }

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
      name: String
      picture: String
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

    input AuthUserGoogleInput {
      email: String!
      name: String!
      picture: String!
    }

    type RootQuery {
      familyIndex: Distinct!
      blocks(familyIndex: [Float!], label: String): [Block!]
      login(email: String!, password: String!): AuthData!
    }

    type RootMutation {
      createBlock(blockInput: BlockInput): Block
      deleteFamilyBlocks(date: Float!): DeletedCount!
      createUser(userInput: UserInput): User
      authUserGoogle(authUserGoogleInput: AuthUserGoogleInput): AuthData!
    }

    schema {
      query: RootQuery
      mutation: RootMutation
    }`
  ),
  rootValue: {
    familyIndex: async (args, req) => {
      if (!req.isAuth) {
        throw new Error(errorTypes.UNAUTHORIZED)
      }

      const blocksQuery = { creator: req.userId }

      try {
        return { distinct: await Block.find(blocksQuery).distinct('date') }
      } catch (error) {
        console.log(error)
      }
    },
    blocks: async (args, req) => {
      if (!req.isAuth) {
        throw new Error(errorTypes.UNAUTHORIZED)
      }

      console.log(args)

      let blocksQuery
      if (args.label === '') {
        blocksQuery = { creator: req.userId, date: { $in: args.familyIndex } }
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

      const token = jwt.sign({ userId: user.id }, process.env.jwtSecretKey, {
        expiresIn: '1h'
      })

      return { token: token }
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

      try {
        const res = await block.save()
        const createdBlock = { ...res._doc, _id: res.id }

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

      let blocksQuery
      try {
        blocksQuery = { creator: req.userId, date: args.date }
        const familyBlocks = await Block.find(blocksQuery, '_id')

        const user = await User.findById(req.userId)
        familyBlocks.forEach((elem) => { user.createdBlocks.pull(elem) })
        await user.save()

        const res = await Block.deleteMany(blocksQuery)

        return { deletedCount: res.deletedCount }
      } catch (error) {
        console.log(error)
      }
    },
    createUser: async (args) => {
      const user = await User.findOne({ email: args.userInput.email })
      if (user) {
        throw new Error(errorTypes.USER_EXISTS)
      }

      const hashedPassword = await bcrypt.hash(args.userInput.password, 12)
      const userHashed = new User({
        email: args.userInput.email,
        password: hashedPassword
      })
      try {
        const res = await userHashed.save()

        return { ...res._doc, _id: res.id, password: null }
      } catch (error) {
        console.log(error)
      }
    },
    authUserGoogle: async (args) => {
      const user = await User.findOne({ email: args.authUserGoogleInput.email })
      if (!user) {
        const user = new User({
          email: args.authUserGoogleInput.email,
          name: args.authUserGoogleInput.name,
          picture: args.authUserGoogleInput.picture
        })
        await user.save()
      }
      const token = jwt.sign({ userId: user.id }, process.env.jwtSecretKey, {
        expiresIn: '1h'
      })

      return { token: token }
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
