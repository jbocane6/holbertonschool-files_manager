import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import RedisClient from '../utils/redis';
import dbClient from '../utils/db';

class AuthController {
  static async getConnect(req, res) {
    if (!req.headers.authorization) return res.status(401).send({ error: 'Unauthorized' });

    const authPayload = req.headers.authorization.split(' ')[1];
    const decodedAuthPayload = Buffer.from(authPayload, 'base64').toString('ascii');
    const [email, clearPwd] = decodedAuthPayload.split(':');

    const user = await dbClient.users.findOne({ email });
    if (!user || sha1(clearPwd) !== user.password) return res.status(401).send({ error: 'Unauthorized' });

    const authToken = uuidv4();
    const redisKey = `auth_${authToken}`;

    RedisClient.set(redisKey, user._id.toString(), 86400);

    return res.status(200).send({ token: authToken });
  }

  static async getDisconnect(req, res) {
    if (!req.headers['x-token']) return res.status(401).send({ error: 'Unauthorized' });

    const redisKey = `auth_${req.headers['x-token']}`;
    const userId = await RedisClient.get(redisKey);

    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    await RedisClient.del(redisKey);
    return res.status(204).end();
  }
}

module.exports = AuthController;
