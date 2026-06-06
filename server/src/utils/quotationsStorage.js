const crypto = require('crypto');
const supabase = require('../config/db');
const env = require('../config/env');
const AppError = require('../errors/AppError');

const uploadQuotationAttachment = async (file) => {
  if (!file) {
    return null;
  }

  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${safeName}`;
  const filePath = `quotations/${uniqueName}`;

  const { error } = await supabase.storage.from(env.supabaseStorageBucket).upload(filePath, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });

  if (error) {
    throw new AppError(error.message, 400);
  }

  const { data } = supabase.storage.from(env.supabaseStorageBucket).getPublicUrl(filePath);

  return {
    filePath,
    fileUrl: data?.publicUrl || null,
    fileName: file.originalname,
    mimeType: file.mimetype,
    fileSize: file.size,
  };
};

const removeQuotationAttachment = async (filePath) => {
  if (!filePath) {
    return;
  }

  const { error } = await supabase.storage.from(env.supabaseStorageBucket).remove([filePath]);
  if (error) {
    throw new AppError(error.message, 400);
  }
};

module.exports = {
  uploadQuotationAttachment,
  removeQuotationAttachment,
};