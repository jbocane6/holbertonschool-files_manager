import Queue from 'bull';
import fs from 'fs';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import authUtils from '../utils/auth';
import dbClient from '../utils/db';

class FilesController {
  static async postUpload(req, res) {
    const checkAuth = await authUtils.checkAuth(req);
    if (checkAuth.status !== 200) return res.status(401).send({ error: 'Unauthorized' });

    const userId = checkAuth.payload.id;
    const { name, type, data } = req.body;
    const parentId = req.body.parentId || 0;
    const isPublic = req.body.isPublic || false;

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

    if (!fs.existsSync(folderPath)) {
      try {
        fs.mkdirSync(folderPath, { recursive: true });
      } catch (e) {
        console.error(e);
        return res.status(500).send({ error: 'Unable to locate folder' });
      }
    }

    if (!name) return res.status(400).send({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).send({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).send({ error: 'Missing data' });
    if (parentId) {
      const parent = await dbClient.files.findOne({ _id: new ObjectId(parentId) });
      if (!parent) return res.status(400).send({ error: 'Parent not found' });
      if (parent.type !== 'folder') return res.status(400).send({ error: 'Parent is not a folder' });
    }

    if (type === 'folder') {
      const fileDBObj = {
        userId,
        name,
        type,
        parentId: parentId ? ObjectId(parentId) : 0,
      };

      dbClient.files.insertOne(fileDBObj);
      return res.status(201).send({
        id: fileDBObj._id,
        userId,
        name,
        type,
        isPublic,
        parentId: parentId ? ObjectId(parentId) : 0,
      });
    }

    const filename = uuidv4();
    const localPath = `${folderPath}/${filename}`;
    const decodedData = Buffer.from(data, 'base64');
    fs.writeFileSync(localPath, decodedData, { flag: 'w+' });

    const fileDBObj = {
      userId,
      name,
      type,
      isPublic,
      parentId: parentId ? ObjectId(parentId) : 0,
      localPath,
    };

    dbClient.files.insertOne(fileDBObj);

    if (type === 'image') {
      const fileQueue = Queue('fileQueue');
      await fileQueue.add({ userId, fileId: fileDBObj._id });
    }

    return res.status(201).send({
      id: fileDBObj._id,
      userId,
      name,
      type,
      isPublic,
      parentId: parentId ? ObjectId(parentId) : 0,
    });
  }

  static async getShow(req, res) {
    const checkAuth = await authUtils.checkAuth(req);
    if (checkAuth.status !== 200) return res.status(401).send({ error: 'Unauthorized' });

    const userId = checkAuth.payload.id;

    let { id } = req.params;
    try {
      id = ObjectId(id);
    } catch (e) {
      return res.status(404).send({ error: 'Not found' });
    }
    const requestedFile = await dbClient.files.findOne({
      _id: ObjectId(id),
      userId: ObjectId(userId),
    });

    if (!requestedFile) return res.status(404).send({ error: 'Not found' });

    const {
      _id,
      name,
      type,
      isPublic,
      parentId,
    } = requestedFile;

    return res.status(200).send({
      id: _id,
      userId,
      name,
      type,
      isPublic,
      parentId,
    });
  }

  static async getIndex(req, res) {
    const checkAuth = await authUtils.checkAuth(req);
    if (checkAuth.status !== 200) return res.status(401).send({ error: 'Unauthorized' });

    const userId = checkAuth.payload.id;

    let { parentId, page } = req.query;

    page = page ? Number(page, 10) : 0;

    if (!parentId || parentId === '0') {
      parentId = 0;
    } else {
      try {
        parentId = ObjectId(parentId);
      } catch (e) {
        parentId = 0;
      }
    }

    const query = [
      { $match: { parentId, userId: ObjectId(userId) } },
      { $skip: page * 20 },
      { $limit: 20 },
    ];

    const requestedFiles = await dbClient.files.aggregate(query).toArray();

    const sanitizedFiles = [];
    for (const elem of requestedFiles) {
      const file = {
        id: elem._id,
        name: elem.name,
        type: elem.type,
        isPublic: elem.isPublic,
        parentId: elem.parentId,
      };
      sanitizedFiles.push(file);
    }
    return res.status(200).send(sanitizedFiles);
  }
}

module.exports = FilesController;
