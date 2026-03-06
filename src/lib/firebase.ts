import admin from 'firebase-admin';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  clientId: process.env.FIREBASE_CLIENT_ID,
  authUri: process.env.FIREBASE_AUTH_URI,
  tokenUri: process.env.FIREBASE_TOKEN_URI,
};

let firebaseAuth: any = null;
let firebaseDB: any = null;

// Only initialize Firebase if we have valid credentials
if (
  serviceAccount.privateKey &&
  !serviceAccount.privateKey.includes('-----BEGIN') &&
  !serviceAccount.privateKey.includes('your-key')
) {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as any),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
      });
      firebaseAuth = admin.auth();
      firebaseDB = admin.database();
      console.log('✅ Firebase initialized');
    } catch (error) {
      console.warn('⚠️  Firebase initialization skipped:', error);
    }
  }
} else {
  console.warn('⚠️  Firebase credentials not configured - Firebase features will be disabled');
}

export { firebaseAuth, firebaseDB };

export const verifyFirebaseToken = async (token: string) => {
  if (!firebaseAuth) return null;
  try {
    return await firebaseAuth.verifyIdToken(token);
  } catch (error) {
    return null;
  }
};
