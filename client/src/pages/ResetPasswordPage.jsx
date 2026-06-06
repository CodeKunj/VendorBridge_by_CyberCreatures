import React, { useState } from 'react';
import { authApi } from '../api/authApi';

const ResetPasswordPage = () => {
  const params = new URLSearchParams(window.location.search);
  const initialToken = params.get('token') || '';
  const initialEmail = params.get('email') || '';
  const [form, setForm] = useState({ token: initialToken, email: initialEmail, newPassword: '' });
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const response = await authApi.resetPassword(form);
    setMessage(response.message);
  };

  return (
    <form onSubmit={submit}>
      <h1>Reset password</h1>
      <input placeholder="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
      <input placeholder="Reset token" value={form.token} onChange={(event) => setForm({ ...form, token: event.target.value })} required />
      <input placeholder="New password" type="password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} required />
      <button type="submit">Reset password</button>
      {message ? <p>{message}</p> : null}
    </form>
  );
};

export default ResetPasswordPage;