import type { NextApiRequest, NextApiResponse } from 'next';
import { uploadFile } from '@fastgpt/service/common/file/gridfs/controller';
import { getUploadModel } from '@fastgpt/service/common/file/multer';
import { authDataset } from '@fastgpt/service/support/permission/dataset/auth';
import { FileCreateDatasetCollectionParams } from '@fastgpt/global/core/dataset/api';
import { removeFilesByPaths } from '@fastgpt/service/common/file/utils';
import { createCollectionAndInsertData } from '@fastgpt/service/core/dataset/collection/controller';
import { DatasetCollectionTypeEnum } from '@fastgpt/global/core/dataset/constants';
import { getNanoid, hashStr } from '@fastgpt/global/common/string/tools';
import { BucketNameEnum } from '@fastgpt/global/common/file/constants';
import { readRawTextByLocalFile } from '@fastgpt/service/common/file/read/utils';
import { NextAPI } from '@/service/middleware/entry';
import { WritePermissionVal } from '@fastgpt/global/support/permission/constant';
import { CreateCollectionResponse } from '@/global/core/dataset/api';

async function handler(req: NextApiRequest, res: NextApiResponse<any>): CreateCollectionResponse {
  let filePaths: string[] = [];

  try {
    // Create multer uploader
    const upload = getUploadModel({
      maxSize: global.feConfigs?.uploadFileMaxSize
    });
    const { file, data, bucketName } = await upload.doUpload<FileCreateDatasetCollectionParams>(
      req,
      res,
      BucketNameEnum.dataset
    );
    filePaths = [file.path];

    if (!file || !bucketName) {
      throw new Error('file is empty');
    }

    const { teamId, tmbId, dataset } = await authDataset({
      req,
      authToken: true,
      authApiKey: true,
      per: WritePermissionVal,
      datasetId: data.datasetId
    });

    const { fileMetadata, collectionMetadata, ...collectionData } = data;
    const collectionName = file.originalname;

    const relatedImgId = getNanoid();

    // 1. read file
    const { rawText } = await readRawTextByLocalFile({
      teamId,
      path: file.path,
      encoding: file.encoding,
      metadata: {
        ...fileMetadata,
        relatedId: relatedImgId
      }
    });

    // 2. upload file
    const fileId = await uploadFile({
      teamId,
      uid: tmbId,
      bucketName,
      path: file.path,
      filename: file.originalname,
      contentType: file.mimetype,
      encoding: file.encoding,
      metadata: fileMetadata
    });

    // 3. delete tmp file
    removeFilesByPaths(filePaths);

    const { collectionId, insertResults } = await createCollectionAndInsertData({
      dataset,
      rawText,
      relatedId: fileId,
      createCollectionParams: {
        ...collectionData,
        name: collectionName,
        teamId,
        tmbId,
        type: DatasetCollectionTypeEnum.file,
        fileId,
        metadata: {
          ...collectionMetadata,
          relatedImgId
        }
      }
    });

    return { collectionId, results: insertResults };
  } catch (error) {
    removeFilesByPaths(filePaths);

    return Promise.reject(error);
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};

export default NextAPI(handler);