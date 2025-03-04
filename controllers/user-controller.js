const bcrypt = require('bcryptjs')
const { User, Comment, Restaurant } = require('../models')
const { imgurUploader } = require('../helpers/file-helper')

const userController = {
  getSignUpPage (_req, res) {
    res.render('signup')
  },
  signUp (req, res, next) {
    const { name, email, password, passwordCheck } = req.body

    if (password !== passwordCheck) throw new Error('Password do not match')
    User.findOne({ where: { email } })
      .then(user => {
        if (user) throw new Error('Email is already used')
        return bcrypt.hash(req.body.password, 10)
      })
      .then(hash => User.create({ name, email, password: hash }))
      .then(() => {
        req.flash('success_messages', '成功註冊帳號')
        res.render('signin')
      })
      .catch(err => next(err))
  },
  getSignInPage (_req, res) {
    res.render('signin')
  },
  signin (req, res) {
    req.flash('success_messages', '登入成功')
    res.redirect('/restaurants')
  },
  logout (req, res, next) {
    req.flash('success_messages', '登出成功')
    req.logout(err => {
      if (err) {
        err.alertMsg = '登出失敗'
        return next(err)
      }
      res.redirect('/signin')
    })
  },
  async getUser (req, res, next) {
    try {
      const user = (await User.findByPk(
        req.params.id,
        { include: { model: Comment, include: Restaurant } }
      )).toJSON()

      if (!user) throw new Error('The user does not exist')

      let commentCounts = 0
      let commentedRests = null

      if (user.Comments) {
        commentCounts = user.Comments.length
        const restaurants = new Set()
        commentedRests = user.Comments.filter(comment => {
          if (restaurants.has(comment.restaurantId)) return false
          restaurants.add(comment.restaurantId)
          return true
        }).map(comment => comment.Restaurant)
      }
      res.render('users/profile', { user, commentCounts, commentedRests })
    } catch (err) {
      next(err)
    }
  },
  async editUser (req, res, next) {
    try {
      const user = await User.findByPk(req.params.id, { raw: true })

      if (!user) throw new Error('The user does not exist')
      res.render('users/edit', { user })
    } catch (err) {
      next(err)
    }
  },
  async putUser (req, res, next) {
    try {
      const { name } = req.body
      if (!name || !name.replace(/\s/g, '').length) throw new Error('Name is required')

      const [user, fileUrl] = await Promise.all([
        User.findByPk(req.params.id),
        imgurUploader(req.file?.buffer)
      ])

      if (!user) throw new Error('The user does not exist')
      await user.update({ name, image: fileUrl || user.image })
      req.flash('success_messages', '使用者資料編輯成功')
      res.redirect(`/users/${user.id}`)
    } catch (err) {
      next(err)
    }
  }
}

module.exports = userController
