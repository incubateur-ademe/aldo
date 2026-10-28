import app from './app.ts'

const port = process.env.PORT || 8080

export default app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
})
