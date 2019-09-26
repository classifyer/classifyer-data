/**
 * 
 */
import admin from 'firebase-admin';
import cert from '../firebase-cert.json';

admin.initializeApp({
  credential: admin.credential.cert(<any>cert),
  storageBucket: `gs://${cert.project_id}.appspot.com`
});
