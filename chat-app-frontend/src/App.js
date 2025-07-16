import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

// Backend URL
const API_BASE_URL = 'http://localhost:3001/api'; // Ensure this matches your backend port
const SOCKET_URL = 'http://localhost:3001';

const socket = io(SOCKET_URL);

// Dark Mode Toggle Components
function DarkModeToggle({ isDarkMode, toggleDarkMode }) {
  return (
    <button
      onClick={toggleDarkMode}
      className={`p-2 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105
        ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-yellow-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDarkMode ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h1M3 12H2m8.003-7.53l.707-.707A1 1 0 0112 4v0a1 1 0 011.707.707l.707.707M4.003 12.003l-.707.707A1 1 0 013 13v0a1 1 0 01-.707-.707l-.707-.707m18-18l-.707.707A1 1 0 0120 4v0a1 1 0 01-.707-.707l-.707-.707m-18 18l.707-.707A1 1 0 014 20v0a1 1 0 01.707.707l.707.707M12 6a6 6 0 110 12 6 6 0 010-12z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

// Viva Questions Page Component
function VivaQuestionsPage({ loggedInUserId, userName, isAdmin, isVivaQuestionsAddEnabled, isDarkMode, onGoToChat, adminUserName }) { // Removed isSocketConnected prop
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const questionsEndRef = useRef(null);

  const fetchQuestions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/viva-questions`);
      const data = await response.json();
      setQuestions(data.map(q => ({
        ...q,
        // Convert timestamp from SQL string to Date object if needed for formatting
        timestamp: new Date(q.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })));
    } catch (error) {
      console.error('Error fetching viva questions:', error);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();

    // Debugging logs for Socket.IO events in VivaQuestionsPage
    socket.on('newVivaQuestion', (question) => {
      console.log('Socket.IO: Received newVivaQuestion', question);
      setQuestions((prevQuestions) => [...prevQuestions, {
        ...question,
        timestamp: new Date(question.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    });

    socket.on('vivaQuestionDeleted', (questionId) => {
      console.log('Socket.IO: Received vivaQuestionDeleted. ID from socket:', questionId, 'Type:', typeof questionId);
      setQuestions((prevQuestions) =>
        prevQuestions.map((q) => {
          console.log(`Comparing q.id (${q.id}, Type: ${typeof q.id}) with questionId (${questionId}, Type: ${typeof questionId})`);
          // Ensure comparison is robust, e.g., convert to number if questionId might be string
          if (Number(q.id) === Number(questionId)) {
            console.log('Match found! Updating question:', q.id);
            return { ...q, isDeleted: true, questionText: '[This question was deleted by an admin]' };
          }
          return q;
        })
      );
    });

    return () => {
      socket.off('newVivaQuestion');
      socket.off('vivaQuestionDeleted');
    };
  }, [fetchQuestions]);

  // Add this useEffect to log prop changes
  useEffect(() => {
    console.log('VivaQuestionsPage: isVivaQuestionsAddEnabled prop changed to:', isVivaQuestionsAddEnabled);
  }, [isVivaQuestionsAddEnabled]);


  useEffect(() => {
    questionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [questions]);

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!isVivaQuestionsAddEnabled) {
      console.log('Adding viva questions is currently disabled by admin.');
      return;
    }
    if (newQuestion.trim() === '') {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/viva-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: loggedInUserId,
          senderName: userName,
          questionText: newQuestion
        })
      });
      if (response.ok) {
        setNewQuestion('');
      } else {
        console.error('Failed to add question:', await response.json());
      }
    } catch (error) {
      console.error('Error adding question:', error);
    }
  };

  const handleDeleteQuestion = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/viva-questions/${id}/delete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        console.error('Failed to delete question:', await response.json());
      }
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans
      ${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-blue-950' : 'bg-gradient-to-br from-sky-100 to-blue-200'}`}>
      <div className={`p-6 rounded-xl shadow-lg w-full max-w-2xl flex flex-col h-[90vh] transform transition-all duration-300 hover:scale-105
        ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-3xl font-extrabold text-center flex-grow ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Viva Questions
          </h2>
          <button
            onClick={onGoToChat}
            className={`font-bold py-2 px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm
              ${isDarkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          >
            Go to Chat
          </button>
        </div>
        <p className={`text-md mb-4 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Logged in as: <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{userName || 'User'}</span>
          {isAdmin && <span className="ml-2 px-2 py-1 bg-red-400 text-white text-xs rounded-full">ADMIN</span>}
        </p>

        {/* Removed: Visual Indicator for Socket.IO Connection Status */}

        {/* Visual Indicator for Viva Questions Add Status */}
        <div className={`mb-4 p-2 text-sm text-center rounded-lg shadow-md
          ${isVivaQuestionsAddEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          Viva Questions Add Status: {isVivaQuestionsAddEnabled ? 'ENABLED' : 'DISABLED'}
        </div>

        {!isVivaQuestionsAddEnabled && (
          <div className="mb-4 p-3 text-sm text-center text-white bg-red-400 rounded-lg shadow-md">
            Adding new viva questions is currently disabled by the admin.
          </div>
        )}

        <div className={`flex-1 overflow-y-auto p-4 border rounded-lg mb-4
          ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          {questions.map((q) => (
            <div
              key={q.id}
              className={`flex mb-3 ${q.senderName === userName ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-xl shadow-sm relative
                  ${q.senderName === userName
                    ? (isDarkMode ? 'bg-sky-700 text-white' : 'bg-sky-300 text-gray-900') + ' rounded-br-none'
                    : (isDarkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-100 text-gray-800') + ' rounded-bl-none'
                  } ${q.isDeleted ? 'opacity-60 italic' : ''}`}
              >
                <div className={`font-bold text-sm mb-1 ${q.senderName === adminUserName ? (isDarkMode ? 'text-purple-300' : 'text-purple-700') : ''}`}>
                  {q.senderName === userName ? 'You' : q.senderName}
                </div>
                <p className="text-sm break-words">{q.questionText}</p>
                <div className={`text-xs mt-1 opacity-75 text-right ${isDarkMode ? 'text-gray-300' : ''}`}>
                  {q.timestamp}
                </div>
                {isAdmin && !q.isDeleted && (
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="absolute top-1 right-1 bg-red-300 hover:bg-red-500 text-white rounded-full p-1 text-xs leading-none"
                    title="Delete Question"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={questionsEndRef} />
        </div>

        <form onSubmit={handleAddQuestion} className="flex gap-2 items-center">
          <input
            type="text"
            className={`flex-1 px-4 py-2 border rounded-xl shadow-sm focus:outline-none sm:text-sm
              ${isVivaQuestionsAddEnabled
                ? (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-sky-500 focus:border-sky-500' : 'border-gray-300 focus:ring-sky-500 focus:border-sky-500')
                : 'border-gray-400 bg-gray-100 cursor-not-allowed'
              }`}
            placeholder={isVivaQuestionsAddEnabled ? "Add a new viva question..." : "Adding questions is disabled by admin."}
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            // Ensure disabled state is directly tied to the prop
            disabled={!isVivaQuestionsAddEnabled}
          />
          <button
            type="submit"
            className={`font-bold py-2 px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105
              ${isVivaQuestionsAddEnabled
                ? (isDarkMode ? 'bg-sky-700 hover:bg-sky-800 text-white' : 'bg-sky-500 hover:bg-sky-600 text-white')
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            // Ensure disabled state is directly tied to the prop
            disabled={!isVivaQuestionsAddEnabled}
          >
            Add Question
          </button>
        </form>
      </div>
    </div>
  );
}


// Admin Dashboard Component
function AdminDashboard({ loggedInUserId, userName, allUsers, onRemoveMember, onApproveMember, onGoToChat, isChatEnabled, onToggleChat, onLogout, isVivaQuestionsAddEnabled, onToggleVivaQuestionsAdd, isDarkMode, adminUserName }) {
  const [message, setMessage] = useState('');

  const approvedMembers = allUsers.filter(member => member.isApproved && !member.isAdmin);
  // MODIFIED: Only show pending members who are email verified AND not yet approved by admin
  const pendingMembers = allUsers.filter(member => member.isEmailVerified && !member.isApproved && !member.isAdmin);
  const adminUser = allUsers.find(member => member.isAdmin);

  const handleRemove = async (memberId, memberName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${memberId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setMessage(`Successfully removed ${memberName}.`);
        onRemoveMember(memberId); // Update local state via prop
      } else {
        setMessage(`Failed to remove ${memberName}.`);
      }
    } catch (error) {
      console.error('Error removing member:', error);
      setMessage('Server error removing member.');
    } finally {
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleApprove = async (memberId, memberName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${memberId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        setMessage(`Successfully approved ${memberName}.`);
        onApproveMember(memberId); // Update local state via prop
      } else {
        setMessage(`Failed to approve ${memberName}.`);
      }
    } catch (error) {
      console.error('Error approving member:', error);
      setMessage('Server error approving member.');
    } finally {
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleToggleChatSetting = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/isChatEnabled`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingValue: !isChatEnabled })
      });
      if (response.ok) {
        onToggleChat(); // Update local state via prop
        setMessage(`Chat is now ${!isChatEnabled ? 'ENABLED' : 'DISABLED'}.`);
      } else {
        setMessage('Failed to toggle chat status.');
      }
    } catch (error) {
      console.error('Error toggling chat setting:', error);
      setMessage('Server error toggling chat setting.');
    } finally {
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleToggleVivaQuestionsAddSetting = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/isVivaQuestionsAddEnabled`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingValue: !isVivaQuestionsAddEnabled })
      });
      if (response.ok) {
        onToggleVivaQuestionsAdd(); // Update local state via prop
        setMessage(`Viva Q&A Add is now ${!isVivaQuestionsAddEnabled ? 'ENABLED' : 'DISABLED'}.`);
      } else {
        setMessage('Failed to toggle Viva Q&A Add status.');
      }
    } catch (error) {
      console.error('Error toggling Viva Q&A Add setting:', error);
      setMessage('Server error toggling Viva Q&A Add setting.');
    } finally {
      setTimeout(() => setMessage(''), 2000);
    }
  };


  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans
      ${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-blue-950' : 'bg-gradient-to-br from-blue-100 to-indigo-200'}`}>
      <div className={`p-8 rounded-2xl shadow-lg w-full max-w-4xl flex flex-col h-[90vh] transform transition-all duration-300 hover:scale-105
        ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
          <h2 className={`text-4xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Admin Dashboard</h2>
          <div className="flex space-x-4">
            <button
              onClick={onGoToChat}
              className={`font-bold py-2 px-6 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-lg flex items-center gap-2
                ${isDarkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Go to Chat
            </button>
            <button
              onClick={onLogout}
              className={`font-bold py-2 px-6 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-lg flex items-center gap-2
                ${isDarkMode ? 'bg-gray-700 hover:bg-gray-800 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4 text-base text-center text-white bg-blue-400 rounded-lg shadow-md animate-fade-in-down">
            {message}
          </div>
        )}

        {/* Admin User Section */}
        {adminUser && (
          <div className={`mb-8 p-4 border rounded-lg shadow-sm flex items-center justify-between
            ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-yellow-100 border-yellow-200'}`}>
            <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Logged in as: <span className={`font-extrabold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>{adminUser.name} (Admin)</span></h3>
            {/* Chat Enable/Disable Toggle */}
            <div className="flex items-center gap-4">
              <span className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Chat Status:</span>
              <button
                onClick={handleToggleChatSetting}
                className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 ${
                  isChatEnabled ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {isChatEnabled ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Chat ON
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Chat OFF
                  </>
                )}
              </button>
            </div>
            {/* Viva Questions Add Toggle */}
            <div className="flex items-center gap-4 ml-4">
              <span className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Viva Q&A Add:</span>
              <button
                onClick={handleToggleVivaQuestionsAddSetting}
                className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 ${
                  isVivaQuestionsAddEnabled ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {isVivaQuestionsAddEnabled ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Add ON
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Add OFF
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
          {/* Pending Approvals Section */}
          <div className={`p-6 rounded-xl shadow-lg border flex flex-col
            ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'}`}>
            <h3 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Pending Approvals ({pendingMembers.length})
            </h3>
            <div className="flex-1 overflow-y-auto pr-2">
              <ul className="space-y-3">
                {pendingMembers.length > 0 ? (
                  pendingMembers.map((member) => (
                    <li key={member.id} className={`flex justify-between items-center p-4 rounded-lg shadow-sm border transition duration-200
                      ${isDarkMode ? 'bg-gray-600 border-gray-500 hover:bg-gray-500' : 'bg-yellow-50 border-yellow-100 hover:bg-yellow-100'}`}>
                      <span className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{member.name} <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>({member.email})</span></span>
                      <button
                        onClick={() => handleApprove(member.id, member.name)}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition duration-300 ease-in-out transform hover:scale-105 flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                      </button>
                    </li>
                  ))
                ) : (
                  <p className={`text-center py-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>No pending approval requests.</p>
                )}
              </ul>
            </div>
          </div>

          {/* Approved Members Section */}
          <div className={`p-6 rounded-xl shadow-lg border flex flex-col
            ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'}`}>
            <h3 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.146-1.28-.423-1.848M13 16H7m6 0v-2.83A2.83 2.83 0 0115.83 10H17a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v3a2 2 0 002 2h2.17C9.854 11.28 10 11.907 10 12.56V16m-4 0v-2.83A2.83 2.83 0 018.17 10H7a2 2 0 00-2 2v3a2 2 0 002 2h2m-4 0h14" />
              </svg>
              Approved Group Members ({approvedMembers.length})
            </h3>
            <div className="flex-1 overflow-y-auto pr-2">
              <ul className="space-y-3">
                {approvedMembers.length > 0 ? (
                  approvedMembers.map((member) => (
                    <li key={member.id} className={`flex justify-between items-center p-4 rounded-lg shadow-sm border transition duration-200
                      ${isDarkMode ? 'bg-gray-600 border-gray-500 hover:bg-gray-500' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                      <span className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{member.name} <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>({member.email})</span></span>
                      <button
                        onClick={() => handleRemove(member.id, member.name)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition duration-300 ease-in-out transform hover:scale-105 flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </button>
                    </li>
                  ))
                ) : (
                  <p className={`text-center py-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>No other approved members in the group.</p>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// New component for the group chat view
function GroupChat({ loggedInUserId, userName, isAdmin, onGoToAdminDashboard, groupMembers, isChatEnabled, onLogout, onGoToVivaQuestions, isDarkMode, adminUserName }) { // Removed isSocketConnected prop
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages`);
      const data = await response.json();
      setMessages(data.map(msg => ({
        ...msg,
        // Convert timestamp from SQL string to Date object for consistent formatting
        timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        // Prepend backend URL to fileUrl if it exists
        fileUrl: msg.fileUrl ? `${SOCKET_URL}${msg.fileUrl}` : null
      })));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`);
      const data = await response.json();
      // This part is handled by the App component now, but good to have for reference
      // if this component ever needed to fetch settings directly.
      // console.log('Fetched settings:', data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    fetchSettings(); // Fetch settings on mount

    // Debugging logs for Socket.IO events in GroupChat
    socket.on('newMessage', (message) => {
      console.log('Socket.IO: Received newMessage', message);
      setMessages((prevMessages) => [...prevMessages, {
        ...message,
        timestamp: new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fileUrl: message.fileUrl ? `${SOCKET_URL}${message.fileUrl}` : null
      }]);
    });

    socket.on('messageDeleted', (messageId) => {
      console.log('Socket.IO: Received messageDeleted. ID from socket:', messageId, 'Type:', typeof messageId);
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          console.log(`Comparing msg.id (${msg.id}, Type: ${typeof msg.id}) with messageId (${messageId}, Type: ${typeof messageId})`);
          // Ensure comparison is robust, e.g., convert to number if messageId might be string
          if (Number(msg.id) === Number(messageId)) {
            console.log('Match found! Updating message:', msg.id);
            return { ...msg, isDeleted: true, text: '[This message was deleted by an admin]' };
          }
          return msg;
        })
      );
    });

    // Listen for setting updates (e.g., chat enabled/disabled)
    socket.on('settingUpdated', ({ settingName, settingValue }) => {
        console.log(`Socket.IO: Received settingUpdated: ${settingName} = ${settingValue}`);
        // This component doesn't directly update isChatEnabled, App component does.
        // But if you had a local state for it, you'd update it here.
    });


    return () => {
      socket.off('newMessage');
      socket.off('messageDeleted');
      socket.off('settingUpdated');
    };
  }, [fetchMessages, fetchSettings]);

  // Add this useEffect to log prop changes
  useEffect(() => {
    console.log('GroupChat: isChatEnabled prop changed to:', isChatEnabled);
  }, [isChatEnabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!isChatEnabled) {
      console.log('Chat is currently disabled by admin.');
      return;
    }

    if (newMessage.trim() === '' && !selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append('senderId', loggedInUserId);
    formData.append('senderName', userName);
    formData.append('text', newMessage);
    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        body: formData, // No 'Content-Type' header needed for FormData
      });
      if (response.ok) {
        setNewMessage('');
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        console.error('Failed to send message:', await response.json());
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current.click();
  };

  const handleDeleteMessage = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/${id}/delete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        console.error('Failed to delete message:', await response.json());
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans
      ${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-blue-950' : 'bg-gradient-to-br from-sky-100 to-blue-200'}`}>
      <div className={`p-6 rounded-xl shadow-lg w-full max-w-2xl flex flex-col h-[90vh] transform transition-all duration-300 hover:scale-105
        ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-3xl font-extrabold text-center flex-grow ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Charity Group Chat
          </h2>
          <div className="flex space-x-2">
            {isAdmin && (
              <button
                onClick={onGoToAdminDashboard}
                className={`font-bold py-2 px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm
                  ${isDarkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
              >
                Admin Dashboard
              </button>
            )}
            <button
              onClick={onGoToVivaQuestions}
              className={`font-bold py-2 px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm
                ${isDarkMode ? 'bg-sky-700 hover:bg-sky-800 text-white' : 'bg-sky-500 hover:bg-sky-600 text-white'}`}
            >
              Viva Questions
            </button>
            <button
              onClick={() => setShowMembersModal(true)}
              className={`font-bold py-2 px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm
                ${isDarkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
            >
              View Members
            </button>
            <button
              onClick={onLogout}
              className={`font-bold py-2 px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm
                ${isDarkMode ? 'bg-gray-700 hover:bg-gray-800 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white'}`}
            >
              Logout
            </button>
          </div>
        </div>
        <p className={`text-md mb-4 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Logged in as: <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{userName || 'User'}</span>
          {isAdmin && <span className="ml-2 px-2 py-1 bg-red-400 text-white text-xs rounded-full">ADMIN</span>}
        </p>

        {/* Removed: Visual Indicator for Socket.IO Connection Status */}

        {/* Visual Indicator for Chat Status */}
        <div className={`mb-4 p-2 text-sm text-center rounded-lg shadow-md
          ${isChatEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          Chat Status: {isChatEnabled ? 'ENABLED' : 'DISABLED'}
        </div>

        {!isChatEnabled && (
          <div className="mb-4 p-3 text-sm text-center text-white bg-red-400 rounded-lg shadow-md">
            Chat is currently disabled by the admin. You cannot send messages.
          </div>
        )}

        <div className={`flex-1 overflow-y-auto p-4 border rounded-lg mb-4
          ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex mb-3 ${msg.senderName === userName ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-xl shadow-sm relative
                  ${msg.senderName === userName
                    ? (isDarkMode ? 'bg-blue-700 text-white' : 'bg-blue-300 text-gray-900') + ' rounded-br-none'
                    : (isDarkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-100 text-gray-800') + ' rounded-bl-none'
                  } ${msg.isDeleted ? 'opacity-60 italic' : ''}`}
              >
                <div className={`font-bold text-sm mb-1 ${msg.senderName === adminUserName ? (isDarkMode ? 'text-purple-300' : 'text-purple-700') : ''}`}>
                  {msg.senderName === userName ? 'You' : msg.senderName}
                </div>
                {msg.text && <p className="text-sm break-words">{msg.text}</p>}
                {msg.fileUrl && !msg.isDeleted && (
                  <div className="mt-2">
                    {msg.fileType && msg.fileType.startsWith('image/') ? (
                      <img
                        src={msg.fileUrl}
                        alt={msg.fileName}
                        className="max-w-full h-auto rounded-md border border-gray-300"
                        style={{ maxHeight: '200px' }}
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/150x100/CCCCCC/000000?text=Image+Error'; }}
                      />
                    ) : (
                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                         className={`flex items-center gap-2 text-sm p-2 rounded-md border
                           ${isDarkMode ? 'bg-gray-800 text-blue-400 border-gray-500' : 'bg-gray-100 text-blue-600 border-gray-200'} hover:underline`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.414L14.586 5A2 2 0 0115 6.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h7V6.414L11.586 4H6zM10 8a1 1 0 011 1v3a1 1 0 11-2 0V9a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        <span>{msg.fileName || 'Download File'}</span>
                      </a>
                    )}
                  </div>
                )}
                <div className={`text-xs mt-1 opacity-75 text-right ${isDarkMode ? 'text-gray-300' : ''}`}>
                  {msg.timestamp}
                </div>
                {isAdmin && !msg.isDeleted && (
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="absolute top-1 right-1 bg-red-300 hover:bg-red-500 text-white rounded-full p-1 text-xs leading-none"
                    title="Delete Message"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            // Ensure disabled state is directly tied to the prop
            disabled={!isChatEnabled}
          />
          <button
            type="button"
            onClick={handleAttachClick}
            className={`font-bold py-2 px-3 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105
              ${isChatEnabled
                ? (isDarkMode ? 'bg-gray-600 hover:bg-gray-500 text-gray-100' : 'bg-gray-200 hover:bg-gray-300 text-gray-700')
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            title="Attach File"
            // Ensure disabled state is directly tied to the prop
            disabled={!isChatEnabled}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
            </svg>
          </button>

          <input
            type="text"
            className={`flex-1 px-4 py-2 border rounded-xl shadow-sm focus:outline-none sm:text-sm
              ${isChatEnabled
                ? (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500')
                : 'border-gray-400 bg-gray-100 cursor-not-allowed'
              }`}
            placeholder={isChatEnabled ? (selectedFile ? `Sending: ${selectedFile.name}` : "Type your message...") : "Chat is disabled by admin."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            // Ensure disabled state is directly tied to the prop
            disabled={!isChatEnabled || !!selectedFile}
          />
          <button
            type="submit"
            className={`font-bold py-2 px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105
              ${isChatEnabled
                ? (isDarkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white')
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            // Ensure disabled state is directly tied to the prop
            disabled={!isChatEnabled}
          >
            Send
          </button>
        </form>
        {selectedFile && isChatEnabled && (
          <div className={`mt-2 text-sm flex items-center justify-between p-2 rounded-md
            ${isDarkMode ? 'text-gray-300 bg-blue-900' : 'bg-gray-600 bg-blue-50'}`}>
            <span>File selected: <span className="font-semibold">{selectedFile.name}</span></span>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-red-500 hover:text-red-700 font-bold ml-2"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Group Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`p-6 rounded-xl shadow-2xl w-full max-w-sm
            ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Group Members</h3>
              <button
                onClick={() => setShowMembersModal(false)}
                className={`text-2xl font-bold ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
              >
                &times;
              </button>
            </div>
            <ul className="space-y-2">
              {groupMembers.map((member) => (
                <li key={member.id} className={`p-2 rounded-md ${isDarkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800'}`}>
                  {member.name} {member.isAdmin && '(Admin)'} {!member.isApproved && '(Pending)'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}


// Main App component for handling login and registration
function App() {
  const [isLoginView, setIsLoginView] = useState(true);
  const [loggedInUserId, setLoggedInUserId] = useState(null); // Store user ID
  const [loggedInUserName, setLoggedInUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState('auth'); // 'auth', 'chat', 'admin', 'pendingApproval', 'vivaQuestions', 'otpVerification'
  const [isChatEnabled, setIsChatEnabled] = useState(true);
  const [isVivaQuestionsAddEnabled, setIsVivaQuestionsAddEnabled] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected); // Track socket connection
  const adminUserName = 'Admin Akash'; // Define admin user name for consistent highlighting - UPDATED TO 'Admin Akash'

  // OTP related states
  const [otpSent, setOtpSent] = useState(false);
  const [tempNewUserEmail, setTempNewUserEmail] = useState(''); // Store email for OTP screen
  const [tempNewUserId, setTempNewUserId] = useState(''); // Store ID for OTP verification
  const [enteredOtp, setEnteredOtp] = useState(''); // User entered OTP

  // Centralized user state - now fetched from backend
  const [allUsers, setAllUsers] = useState([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  // Fetch initial settings and users on app load
  const fetchInitialData = useCallback(async () => {
    try {
      const settingsResponse = await fetch(`${API_BASE_URL}/settings`);
      const settingsData = await settingsResponse.json();
      setIsChatEnabled(settingsData.isChatEnabled);
      setIsVivaQuestionsAddEnabled(settingsData.isVivaQuestionsAddEnabled);

      const usersResponse = await fetch(`${API_BASE_URL}/users`);
      const usersData = await usersResponse.json();
      setAllUsers(usersData);
    } catch (error) {
      console.error('Error fetching initial app data:', error);
      setMessage('Failed to load initial app data. Please check server connection.');
    }
  }, []);

  useEffect(() => {
    fetchInitialData();

    // Debugging logs for Socket.IO events in App component
    socket.on('userApproved', (userId) => {
      console.log('Socket.IO: Received userApproved', userId);
      setAllUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, isApproved: true } : u));
    });

    socket.on('userRemoved', (userId) => {
      console.log('Socket.IO: Received userRemoved', userId);
      setAllUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
    });

    socket.on('settingUpdated', ({ settingName, settingValue }) => {
      console.log(`App Component: Socket.IO: Received settingUpdated: ${settingName} = ${settingValue}`);
      if (settingName === 'isChatEnabled') {
        setIsChatEnabled(settingValue);
        console.log(`App Component: isChatEnabled updated to: ${settingValue}`); // Added log
        setMessage(`Chat is now ${settingValue ? 'ENABLED' : 'DISABLED'} by admin.`);
      } else if (settingName === 'isVivaQuestionsAddEnabled') {
        setIsVivaQuestionsAddEnabled(settingValue);
        console.log(`App Component: isVivaQuestionsAddEnabled updated to: ${settingValue}`); // Added log
        setMessage(`Viva Q&A Add is now ${settingValue ? 'ENABLED' : 'DISABLED'} by admin.`);
      }
      setTimeout(() => setMessage(''), 2000);
    });

    // Socket.IO connection status listeners
    socket.on('connect', () => {
      console.log('Socket.IO: Connected to server!');
      setIsSocketConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO: Disconnected from server.');
      setIsSocketConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket.IO: Connection Error:', err.message);
      setIsSocketConnected(false);
    });


    return () => {
      socket.off('userApproved');
      socket.off('userRemoved');
      socket.off('settingUpdated');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, [fetchInitialData]);


  /**
   * Handles the login form submission.
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!email || !password) {
      setMessage('Please fill in all fields.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (response.ok) {
        setLoggedInUserId(data.user.id);
        setLoggedInUserName(data.user.name);
        setIsAdmin(data.user.isAdmin);

        if (data.user.isAdmin) {
          setMessage('Admin Login successful!');
          setCurrentView('admin');
        } else if (data.user.isEmailVerified && data.user.isApproved) {
          setMessage('Login successful!');
          setCurrentView('chat');
        } else if (data.user.isEmailVerified && !data.user.isApproved) {
          setMessage('Your account is email verified but awaiting admin approval.');
          setCurrentView('pendingApproval');
        } else { // Not email verified
          setMessage('Your account is not email verified. Please verify your email with the OTP.');
          setTempNewUserEmail(email); // Set email for OTP screen
          setCurrentView('auth'); // Stay on auth page, show message
          setIsLoginView(false); // Switch to register view to prompt re-registration
          setMessage('Your account is not email verified. Please register again to receive a new OTP.');
        }
        setEmail('');
        setPassword('');
      } else {
        setMessage(data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during login:', error);
      setMessage('Server error during login. Please try again later.');
    }
  };

  /**
   * Handles the registration form submission.
   */
  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!name || !email || !password || !confirmPassword) {
      setMessage('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await response.json();

      if (response.ok) {
        setTempNewUserEmail(email);
        setTempNewUserId(data.userId); // Store the generated tempUserId from backend
        setOtpSent(true);
        setMessage(data.message); // Display message from backend
        setCurrentView('otpVerification');
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      } else {
        setMessage(data.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during registration:', error);
      setMessage('Server error during registration. Please try again later.');
    }
  };

  /**
   * Handles OTP verification.
   */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!enteredOtp) {
        setMessage('Please enter the OTP.');
        return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: tempNewUserId, // Send the tempUserId
          enteredOtp: enteredOtp,
        })
      });
      const data = await response.json();

      if (response.ok) {
        // Update local users state with the newly email verified user
        // This user is now in the DB, so we can fetch all users again or add it
        fetchInitialData(); // Re-fetch all users to ensure the new user is in state

        setLoggedInUserId(data.user.id);
        setLoggedInUserName(data.user.name);
        setIsAdmin(data.user.isAdmin);

        // After OTP verification, if not admin, go to pending approval
        if (data.user.isAdmin || data.user.isApproved) { // Admin is auto-approved, or if already approved
            setMessage('Account verified and created successfully! You are now logged in.');
            setCurrentView('chat');
        } else { // User is email verified but still needs admin approval
            setMessage('Account email verified! Awaiting admin approval.');
            setCurrentView('pendingApproval');
        }

        setOtpSent(false);
        setEnteredOtp('');
        setTempNewUserEmail('');
        setTempNewUserId('');
      } else {
        setMessage(data.message || 'OTP verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setMessage('Server error during OTP verification. Please try again later.');
    }
  };

  /**
   * Handles removing a member from the group.
   */
  const handleRemoveMember = (memberIdToRemove) => {
    setAllUsers(prevUsers => prevUsers.filter(u => u.id !== memberIdToRemove));
  };

  /**
   * Handles approving a member.
   */
  const handleApproveMember = (memberIdToApprove) => {
    setAllUsers(prevUsers => prevUsers.map(u => u.id === memberIdToApprove ? { ...u, isApproved: true } : u));
  };

  /**
   * Toggles the chat enabled/disabled status.
   */
  const handleToggleChat = () => {
    setIsChatEnabled((prevStatus) => !prevStatus);
  };

  /**
   * Toggles the viva questions add enabled/disabled status.
   */
  const handleToggleVivaQuestionsAdd = () => {
    setIsVivaQuestionsAddEnabled((prevStatus) => !prevStatus);
  };

  /**
   * Toggles dark mode.
   */
  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  /**
   * Handles logging out the current user.
   */
  const handleLogout = () => {
    setLoggedInUserId(null);
    setLoggedInUserName('');
    setIsAdmin(false);
    setCurrentView('auth');
    setIsLoginView(true);
    setMessage('You have been logged out.');
    setOtpSent(false);
    setEnteredOtp('');
    setTempNewUserEmail('');
    setTempNewUserId('');
  };

  // Conditional rendering based on currentView state
  if (currentView === 'chat') {
    const approvedGroupMembers = allUsers.filter(u => u.isApproved);
    return (
      <GroupChat
        loggedInUserId={loggedInUserId}
        userName={loggedInUserName}
        isAdmin={isAdmin}
        onGoToAdminDashboard={() => setCurrentView('admin')}
        groupMembers={approvedGroupMembers}
        isChatEnabled={isChatEnabled} // Pass the state to GroupChat
        onLogout={handleLogout}
        onGoToVivaQuestions={() => setCurrentView('vivaQuestions')}
        isDarkMode={isDarkMode}
        adminUserName={adminUserName}
        // isSocketConnected={isSocketConnected} // Removed prop
      />
    );
  } else if (currentView === 'admin') {
    return (
      <AdminDashboard
        loggedInUserId={loggedInUserId}
        userName={loggedInUserName}
        allUsers={allUsers}
        onRemoveMember={handleRemoveMember}
        onApproveMember={handleApproveMember}
        onGoToChat={() => setCurrentView('chat')}
        isChatEnabled={isChatEnabled}
        onToggleChat={handleToggleChat}
        isVivaQuestionsAddEnabled={isVivaQuestionsAddEnabled}
        onToggleVivaQuestionsAdd={handleToggleVivaQuestionsAdd}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        adminUserName={adminUserName}
      />
    );
  } else if (currentView === 'vivaQuestions') {
    return (
      <VivaQuestionsPage
        loggedInUserId={loggedInUserId}
        userName={loggedInUserName}
        isAdmin={isAdmin}
        onGoToChat={() => setCurrentView('chat')}
        isVivaQuestionsAddEnabled={isVivaQuestionsAddEnabled} // Pass the state to VivaQuestionsPage
        isDarkMode={isDarkMode}
        adminUserName={adminUserName}
        // isSocketConnected={isSocketConnected} // Removed prop
      />
    );
  } else if (currentView === 'otpVerification') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 font-sans
        ${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-blue-950' : 'bg-gradient-to-br from-sky-50 to-blue-100'}`}>
        {/* Dark Mode Toggle - always visible */}
        <div className="absolute top-4 right-4 z-10">
          <DarkModeToggle isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
        </div>
        <div className={`p-8 rounded-xl shadow-lg w-full max-w-md text-center transform transition-all duration-300 hover:scale-105
          ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
          <h2 className={`text-3xl font-extrabold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Verify Your Account</h2>
          {message && (
            <div className={`mb-4 p-3 text-sm text-center text-white rounded-lg shadow-md ${message.includes('successful') ? 'bg-green-500' : message.includes('Invalid') || message.includes('expired') ? 'bg-red-500' : 'bg-blue-500'}`}>
              {message}
            </div>
          )}
          <p className={`text-lg mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            An OTP has been sent to <span className="font-semibold">{tempNewUserEmail}</span>. Please enter it below.
          </p>
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label htmlFor="otp" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Enter OTP
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                maxLength="6"
                required
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm
                  ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500' : 'border-gray-300 focus:ring-blue-400 focus:border-blue-400'}`}
                placeholder="6-digit OTP"
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
              />
            </div>
            <div>
              <button
                type="submit"
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white shadow-md transition duration-300 ease-in-out transform hover:scale-105
                  ${isDarkMode ? 'bg-blue-700 hover:bg-blue-800 focus:ring-blue-600' : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-400'}`}
              >
                Verify OTP
              </button>
            </div>
          </form>
          <button
            onClick={handleLogout}
            className={`mt-4 text-sm font-medium focus:outline-none focus:underline ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-600'}`}
          >
            Go back to Login
          </button>
        </div>
      </div>
    );
  }
  else if (currentView === 'pendingApproval') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 font-sans
        ${isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-yellow-100 to-orange-200'}`}>
        <div className={`p-8 rounded-xl shadow-lg w-full max-w-md text-center
          ${isDarkMode ? 'bg-gray-700 text-gray-100' : 'bg-white'}`}>
          <h2 className={`text-3xl font-extrabold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Awaiting Approval</h2>
          <p className={`text-lg mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Hello, <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`}>{loggedInUserName}</span>!
            Your account is currently awaiting approval from an administrator.
          </p>
          <p className={`text-md ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            You will be able to join the chat once your request has been approved.
          </p>
          <button
            onClick={handleLogout}
            className={`mt-8 font-bold py-2 px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105
              ${isDarkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          >
            Go Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Default view: Auth forms
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans
      ${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-blue-950' : 'bg-gradient-to-br from-sky-50 to-blue-100'}`}>
      {/* Dark Mode Toggle - always visible */}
      <div className="absolute top-4 right-4 z-10">
        <DarkModeToggle isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
      </div>

      <div className={`p-8 rounded-xl shadow-lg w-full max-w-md transform transition-all duration-300 hover:scale-105
        ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
        <h2 className={`text-3xl font-extrabold mb-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {isLoginView ? 'Welcome Back!' : 'Join Our Community'}
        </h2>

        {message && (
          <div className={`mb-4 p-3 text-sm text-center text-white rounded-lg shadow-md ${message.includes('successful') ? 'bg-green-500' : 'bg-blue-500'}`}>
            {message}
          </div>
        )}

        <form onSubmit={isLoginView ? handleLogin : handleRegister} className="space-y-6">
          {!isLoginView && (
            <div>
              <label htmlFor="name" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm
                  ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500' : 'border-gray-300 focus:ring-blue-400 focus:border-blue-400'}`}
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label htmlFor="email-address" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Email address
            </label>
            <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm
                ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500' : 'border-gray-300 focus:ring-blue-400 focus:border-blue-400'}`}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Password
            </label>
            <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLoginView ? 'current-password' : 'new-password'}
                required
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm
                ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500' : 'border-gray-300 focus:ring-blue-400 focus:border-blue-400'}`}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {!isLoginView && (
            <div>
              <label htmlFor="confirm-password" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm
                  ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500' : 'border-gray-300 focus:ring-blue-400 focus:border-blue-400'}`}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          <div>
            <button
              type="submit"
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white shadow-md transition duration-300 ease-in-out transform hover:scale-105
                ${isDarkMode ? 'bg-blue-700 hover:bg-blue-800 focus:ring-blue-600' : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-400'}`}
            >
              {isLoginView ? 'Sign In' : 'Register'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {isLoginView ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              onClick={() => {
                setIsLoginView(!isLoginView);
                setMessage('');
                setName('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
              className={`font-medium focus:outline-none focus:underline ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-600'}`}
            >
              {isLoginView ? 'Register here' : 'Login here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
