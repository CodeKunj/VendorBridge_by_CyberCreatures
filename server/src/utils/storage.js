const crypto = require('crypto');
const supabase = require('../config/db');
const env = require('../config/env');
const AppError = require('../errors/AppError');

const uploadFileToStorage = async (file, folder = 'rfqs') => {
  if (!file) {
    return null;
  }

  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${safeName}`;
  const filePath = `${folder}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from(env.supabaseStorageBucket)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    throw new AppError(uploadError.message, 400);
  }

  const { data } = supabase.storage.from(env.supabaseStorageBucket).getPublicUrl(filePath);

  return {
    filePath,
    url: data?.publicUrl || null,
    mimeType: file.mimetype,
    size: file.size,
    originalName: file.originalname,
  };
};

const removeFileFromStorage = async (filePath) => {
  if (!filePath) {
    return;
  }

  const { error } = await supabase.storage.from(env.supabaseStorageBucket).remove([filePath]);

  if (error) {
    throw new AppError(error.message, 400);
  }
};

module.exports = {
  uploadFileToStorage,
  removeFileFromStorage,
};