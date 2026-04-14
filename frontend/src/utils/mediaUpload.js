// frontend/src/utils/mediaUpload.js

import { createClient } from '@supabase/supabase-js';

const url = 'https://ggbwrqxlbvmpusiwctld.supabase.co';
const key =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnYndycXhsYnZtcHVzaXdjdGxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDcyMTEsImV4cCI6MjA5MTIyMzIxMX0.1nNP13XFAI3uE5EiNI5CxQgIhuHl-N2k4z0R5KSoj6A';

const supabase = createClient(url, key);

export default function UploadMedia(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject('No file provided.');
      return;
    }

    const timeStamp = new Date().getTime();
    // ✅ file.name is the correct Web File API property (file.fileName is undefined)
    const fileName = `${timeStamp}_${file.name}`;

    supabase.storage
      .from('images')
      .upload(fileName, file, {
        upsert: false,
        cacheControl: '3600',
      })
      .then(() => {
        const publicUrl = supabase.storage
          .from('images')
          .getPublicUrl(fileName).data.publicUrl;
        resolve(publicUrl);
      })
      .catch((error) => {
        reject(error);
      });
  });
}