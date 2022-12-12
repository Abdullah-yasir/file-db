const { randomBytes } = require('crypto')
const fs = require('fs')
const path = require('path')

class DBCore {
  #data = {}

  constructor(dbname, options = {}) {
    const { dbDir = '/databases', ext = '.json' } = options

    this.dbname = dbname
    this.dbDir = path.join(__dirname, dbDir)
    this.dbFilePath = path.join(this.dbDir, `${this.dbname}${ext}`)
    this.data = {}

    if (!fs.existsSync(this.dbDir)) {
      fs.mkdirSync(this.dbDir)
    }
  }

  get data() {
    return this.#data
  }

  set data(value) {
    this.#data = value
  }

  #writeDBFile(contents) {
    fs.writeFileSync(this.dbFilePath, JSON.stringify(contents))
  }

  #readDBFile() {
    return Buffer.from(fs.readFileSync(this.dbFilePath)).toString()
  }

  init() {
    const exists = fs.existsSync(this.dbFilePath)
    if (!exists) {
      this.#writeDBFile({})
    }

    return this
  }

  commit() {
    this.#writeDBFile(this.data)

    return this
  }

  loadDB() {
    this.data = JSON.parse(this.#readDBFile())

    return this
  }
}

class Collection {
  constructor(name, data = {}) {
    this.name = name
    this.data = data
    this.history = { inserted: [] }
  }

  insert(data, options = {}) {
    const { returning = false } = options

    const id = '_' + randomBytes(4).toString('hex')
    data.id = id
    this.data[id] = data

    this.history.inserted.push(this.data[id])
    if (returning) {
      return this.data[id]
    }

    return this
  }

  findAll() {
    return this.data
  }

  findById(id) {
    return this.data[id]
  }

  updateById(id, data) {
    const row = this.data[id]
    row = { ...row, data }

    return row
  }

  deleteById(id) {
    delete this.data[id]
  }

  toJSON() {
    return this.data
  }
}

class FileDB extends DBCore {
  /**
   * Creates a new intanse of FileDb, database folder and file
   * @param {String} dbname Name of the database
   * @param {{dbDir: String, ext: String}} options Additional options to customize the behaviour of db
   */
  constructor(dbname, options) {
    super(dbname, options)
  }

  get collections() {
    return Object.keys(this.data)
  }

  /**
   * Gets the particular collection from the dbs
   * @param {String} name Name of the collection in the db
   * @returns {Collection} instance of a Collection
   */
  getCollection(name) {
    return this.data[name]
  }

  createCollection(name) {
    if (!this.data[name]) {
      this.data[name] = new Collection(name)
      this.commit()
    }

    return this
  }

  dropCollection(name) {
    delete this.data[name]
  }

  loadDB() {
    super.loadDB()

    Object.entries(this.data).forEach(([collectionName, data]) => {
      this.data[this.collections] = new Collection(collectionName, data)
    })
  }
}

module.exports = FileDB
