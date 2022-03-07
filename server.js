const app = require('./app')

const port = process.env.PORT || 8080

module.exports = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
})
