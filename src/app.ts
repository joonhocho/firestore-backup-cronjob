// tslint:disable no-console
import axios from 'axios';
import * as dateformat from 'dateformat';
import * as express from 'express';
import { google } from 'googleapis';

const { GOOGLE_CLOUD_PROJECT } = process.env;
if (!GOOGLE_CLOUD_PROJECT) {
  throw new Error('process.env.GOOGLE_CLOUD_PROJECT must be set');
}

const app = express();

// Trigger a backup
// https://YOUR_PROJECT_ID.appspot.com/cloud-firestore-export?outputUriPrefix=gs://YOUR_PROJECT_ID.appspot.com
app.get(
  '/cloud-firestore-export',
  async (req: express.Request, res: express.Response) => {
    const auth = await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/datastore'],
    });

    const accessTokenResponse = await auth.getAccessToken();
    const accessToken = accessTokenResponse.token;

    if (!req.get('X-Appengine-Cron')) {
      return res
        .status(403)
        .send('Forbidden')
        .end();
    }

    const { outputUriPrefix, collections } = req.query;
    if (!(outputUriPrefix && outputUriPrefix.indexOf('gs://') === 0)) {
      return res
        .status(500)
        .send(`Malformed outputUriPrefix: ${outputUriPrefix}`);
    }

    // Construct a backup path folder based on the timestamp
    const timestamp = dateformat(Date.now(), 'yyyy-mm-dd_HH:MM:ss');
    let path = outputUriPrefix;
    if (path.endsWith('/')) {
      path += timestamp;
    } else {
      path += `/${timestamp}`;
    }

    const body: {
      outputUriPrefix: string;
      collectionIds?: string[];
    } = {
      outputUriPrefix: path,
    };

    // If specified, mark specific collections for backup
    if (collections) {
      body.collectionIds = collections.split(',');
    }

    try {
      const response = await axios.post(
        `https://firestore.googleapis.com/v1beta1/projects/${GOOGLE_CLOUD_PROJECT}/databases/(default):exportDocuments`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log(`Started backup to ${path}`);

      return res
        .status(200)
        .send(response.data)
        .end();
    } catch (e) {
      if (e.response) {
        console.error(e.response.data);
      }

      return res
        .status(500)
        .send(`Could not start backup: ${e}`)
        .end();
    }
  }
);

// Index page, just to make it easy to see if the app is working.
app.get('/', (_req: express.Request, res: express.Response) => {
  res
    .status(200)
    .send('[scheduled-backups]: Hello, world!')
    .end();
});

// Start the server
const PORT = process.env.PORT || 6060;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
