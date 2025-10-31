import React, { useState } from 'react';
import authService from '../../services/authService';

const TokenGenerator = () => {
  const [email, setEmail] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateToken = async () => {
    if (!email) {
      alert('Please enter an email');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.forgotPassword(email);
      if (result.success) {
        alert('Password reset email sent! Check your email for the token, or check the backend logs.');
        console.log('Password reset result:', result);
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      alert('Error generating token');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const testToken = async () => {
    if (!generatedToken) {
      alert('Please enter a token to test');
      return;
    }

    try {
      const result = await authService.verifyResetToken(generatedToken);
      console.log('Token verification result:', result);
      if (result.success) {
        alert('Token is valid! Email: ' + result.data.email);
      } else {
        alert('Token is invalid: ' + result.message);
      }
    } catch (error) {
      alert('Error testing token');
      console.error(error);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Password Reset Token Generator (Debug Tool)</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email to generate token"
          style={{ marginLeft: '10px', padding: '5px' }}
        />
        <button 
          onClick={generateToken} 
          disabled={isLoading}
          style={{ marginLeft: '10px', padding: '5px 10px' }}
        >
          {isLoading ? 'Generating...' : 'Generate Reset Token'}
        </button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>Test Token:</label>
        <input
          type="text"
          value={generatedToken}
          onChange={(e) => setGeneratedToken(e.target.value)}
          placeholder="Enter token to test"
          style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
        />
        <button 
          onClick={testToken}
          style={{ marginLeft: '10px', padding: '5px 10px' }}
        >
          Test Token
        </button>
      </div>

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p>1. Enter an email and click "Generate Reset Token"</p>
        <p>2. Check the backend console logs for the actual token</p>
        <p>3. Copy the token and paste it in the "Test Token" field</p>
        <p>4. Click "Test Token" to verify it works</p>
        <p>5. Use the token in the URL: /reset-password/YOUR_TOKEN_HERE</p>
      </div>
    </div>
  );
};

export default TokenGenerator;