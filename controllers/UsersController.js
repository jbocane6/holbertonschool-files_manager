import sha1 from 'sha1';
import Queue from 'bull';
import dbClient from '../utils/db';

// Contains the definition of the endpoints:
class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) return res.status(400).send({ error: 'Missing email' });
    if (!password) return res.status(400).send({ error: 'Missing password' });

    if (await dbClient.users.findOne({ email })) return res.status(400).send({ error: 'Already exist' });

    let record;
    try {
      record = await dbClient.users.insertOne({ email, password: sha1(password) });
    } catch (err) {
      return res.status(400).send({ error: `DB insert failed: ${err}` });
    }

    const recordQueue = Queue('recordQueue');
    recordQueue.add({ userId: record.insertedId });

    return res.status(201).send({ id: record.insertedId, email });
  }
}

module.exports = UsersController;
