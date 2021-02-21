const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const { buildSchema } = require('graphql')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const Block = require('./models/block')
const User = require('./models/user')

const isAuth = require('./middleware/is-auth')

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
    familyBlocks: (args, req) => {
      const blocksQuery = { creator: req.userId, date: args.date }

      return Block.find(blocksQuery)
        .then(blocks => {
          return blocks.map(block => {
            return { ...block._doc, _id: block.id }
          })
        }).catch(err => {
          console.log(err)
          throw err
        })
    },
    blocks: (args, req) => {
      let blocksQuery
      if (args.label === '') {
        blocksQuery = { creator: req.userId }
      } else {
        blocksQuery = { creator: req.userId, label: args.label }
      }

      return Block.find(blocksQuery)
        .then(blocks => {
          return blocks.map(block => {
            return { ...block._doc, _id: block.id }
          })
        }).catch(err => {
          console.log(err)
          throw err
        })
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
    createBlock: (args, req) => {
      const block = new Block({
        label: args.blockInput.label,
        content: args.blockInput.content,
        date: args.blockInput.date,
        creator: req.userId
      })
      let createdBlock
      return block
        .save()
        .then(res => {
          createdBlock = { ...res._doc, _id: res.id }
          return User.findById(req.userId)
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
    deleteFamilyBlocks: async (args, req) => {
      const blocksQuery = { creator: req.userId, date: args.date }

      try {
        const res = await Block.deleteMany(blocksQuery)
        return { deletedCount: res.deletedCount }
      } catch (err) {
        console.log(err)
        throw err
      }
    },
    createUser: (args) => {
      return User.findOne({ email: args.userInput.email }).then(user => {
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
          return { ...res._doc, _id: res.id, password: null }
        })
        .catch(err => {
          throw err
        })
    }
  },
  graphiql: true
}))

mongoose.connect(
  `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.d7f4t.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`
).then(
  app.listen(8000)
).catch(err => {
  console.log(err)
})
