import React, { useState } from 'react';

function ReviewerAction({ taskId, userId, onActionComplete }) {
  const [action, setAction] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!action) {
      setError('Please select an action');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(`/tasks/${taskId}/reviewer-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, action, comment }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to record reviewer action');
      }
      setSuccessMessage('Reviewer action recorded successfully.');
      setAction('');
      setComment('');
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Action:
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Select action</option>
          <option value="commented">Commented</option>
          <option value="rejected">Rejected</option>
          <option value="approved">Approved</option>
        </select>
      </label>
      <br />
      <label>
        Comment:
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional comment"
        />
      </label>
      <br />
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Action'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
    </form>
  );
}

export default ReviewerAction;
