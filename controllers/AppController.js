import redisClient from '../utils/redis';
import dbClient from '../utils/db';

// Contains the definition of the endpoints:
class AppController {
  static getStatus(request, response) {
    response.status(200).send({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
  }

  static async getStats(request, response) {
    response.status(200).send({ users: await dbClient.nbUsers(), files: await dbClient.nbFiles() });
  }
}

module.exports = AppController;
