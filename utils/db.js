import { MongoClient, Server } from 'mongodb';

class DBClient {
  // Constructor that creates a client to MongoDB
  constructor() {
    // host: from the environment variable DB_HOST or default: localhost
    const host = process.env.DB_HOST || 'localhost';
    // port: from the environment variable DB_PORT or default: 27017
    const port = process.env.DB_PORT || '27017';
    /* database: from the environment variable DB_DATABASE
      or default: files_manager */
    const database = process.env.DB_DATABASE || 'files_manager';

    // Set up the connection to the local db
    MongoClient.connect(new Server(host, port)).then((client) => {
      this.db = client.db(database);
      this.users = client.collection('users');
      this.files = client.collection('files');
    });
  }

  isAlive() {
    // Returns if connection to MongoDB is success
    return !!this.db;
  }

  async nbUsers() {
    // Returns the number of documents in the collection users
    return this.users.countDocuments({});
  }

  async nbFiles() {
    // Returns the number of documents in the collection files
    return this.files.countDocuments({});
  }
}

// Instance of DBClient
const dbClient = new DBClient();
// Exports instance
module.exports = dbClient;
