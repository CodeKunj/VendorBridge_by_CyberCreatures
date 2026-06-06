import React, { useState } from 'react';
import { authApi } from '../api/authApi';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const response = await authApi.forgotPassword({ email });
    setMessage(response.message);
  };

  return (
    <form onSubmit={submit}>
      <h1>Forgot password</h1>
      <input placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <button type="submit">Send reset link</button>
      {message ? <p>{message}</p> : null}
    </form>
  );
};

export default ForgotPasswordPage;