import sha1 from 'sha1';
import Queue from 'bull';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

// Contains the definition of the endpoints:
class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) return res.status(400).send({ error: 'Missing email' });
    if (!password) return res.status(400).send({ error: 'Missing password' });

    if (await dbClient.users.findOne({ email })) return res.status(400).send({ error: 'Already exist' });

    let user;
    try {
      user = await dbClient.users.insertOne({ email, password: sha1(password) });
    } catch (err) {
      return res.status(400).send({ error: `DB insert failed: ${err}` });
    }

    const userQueue = Queue('userQueue');
    userQueue.add({ userId: user.insertedId });

    return res.status(201).send({ id: user.insertedId, email });
  }

  static async getMe(req, res) {
    let result;
    if (!req.headers['x-token']) result = { status: 401, payload: { error: 'Unauthorized' } };
    else {
      const userId = await redisClient.get(`auth_${req.headers['x-token']}`);
      const user = await dbClient.users.findOne({ _id: new ObjectId(userId) });

      if (!user) result = { status: 401, payload: { error: 'Unauthorized' } };
      else {
        result = { status: 200, payload: { id: user._id, email: user.email } };
      }
    }
    return res.status(result.status).send(result.payload);
  }
}

module.exports = UsersController;
