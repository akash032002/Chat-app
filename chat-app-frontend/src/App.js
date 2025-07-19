import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

// Load Tailwind CSS from CDN for styling
// Load Inter font from Google Fonts
// These are included directly in the HTML file where this React app would be rendered.
// For demonstration purposes within this environment, assume they are available.

// Backend URL - IMPORTANT: Replace with your actual deployed backend URL or localhost if running locally
// The user's provided backend URL is used here.
const API_BASE_URL = 'https://chat-backend-api-rhu4.onrender.com/api';
const BACKEND_URL = 'https://chat-backend-api-rhu4.onrender.com';
const SOCKET_URL = 'https://chat-backend-api-rhu4.onrender.com';


// Initialize Socket.IO client
const socket = io(BACKEND_URL);

// Add some basic error logging for the socket connection (optional, but helpful)
socket.on('connect_error', (err) => {
  console.error(`Socket.IO connection error: ${err.message}`);
});
socket.on('connect', () => {
  console.log('Socket.IO connected to backend!');
});

// Dark Mode Toggle Component
/**
 * DarkModeToggle component for switching between light and dark themes.
 * @param {object} props - The component props.
 * @param {boolean} props.isDarkMode - Current dark mode status.
 * @param {function} props.toggleDarkMode - Function to toggle dark mode.
 */
function DarkModeToggle({ isDarkMode, toggleDarkMode }) {
  return (
    <button
      onClick={toggleDarkMode}
      className={`p-2 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105
        ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-yellow-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDarkMode ? (
        // Sun icon for dark mode
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h1M3 12H2m8.003-7.53l.707-.707A1 1 0 0112 4v0a1 1 0 011.707.707l.707.707M4.003 12.003l-.707.707A1 1 0 013 13v0a1 1 0 01-.707-.707l-.707-.707m18-18l-.707.707A1 1 0 0120 4v0a1 1 0 01-.707-.707l-.707-.707m-18 18l.707-.707A1 1 0 014 20v0a1 1 0 01.707.707l.707.707M12 6a6 6 0 110 12 6 6 0 010-12z" />
        </svg>
      ) : (
        // Moon icon for light mode
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

// Viva Questions Page Component
/**
 * VivaQuestionsPage component for displaying and managing viva questions.
 * Allows users to add questions and admins to delete them.
 * @param {object} props - The component props.
 * @param {string} props.loggedInUserId - ID of the currently logged-in user.
 * @param {string} props.userName - Name of the currently logged-in user.
 * @param {boolean} props.isAdmin - True if the logged-in user is an admin.
 * @param {boolean} props.isVivaQuestionsAddEnabled - True if adding viva questions is enabled by admin.
 * @param {boolean} props.isDarkMode - Current dark mode status.
 * @param {function} props.onGoToChat - Callback to navigate to the chat page.
 * @param {string} props.adminUserName - The name designated as the admin.
 */
function VivaQuestionsPage({ loggedInUserId, userName, isAdmin, isVivaQuestionsAddEnabled, isDarkMode, onGoToChat, adminUserName }) {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const questionsEndRef = useRef(null);

  // Callback to fetch viva questions from the backend
  const fetchQuestions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/viva-questions`);
      const data = await response.json();
      setQuestions(data.map(q => ({
        ...q,
        // Ensure questionText is always a string, handle numeric 0
        questionText: q.questionText === 0 ? '' : String(q.questionText || ''),
        // Convert timestamp from SQL string to Date object for formatting
        timestamp: new Date(q.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })));
    } catch (error) {
      console.error('Error fetching viva questions:', error);
    }
  }, []);

  // Effect hook for fetching questions and setting up Socket.IO listeners
  useEffect(() => {
    fetchQuestions();

    // Socket.IO listener for new viva questions
    socket.on('newVivaQuestion', (question) => {
      console.log('Socket.IO: Received newVivaQuestion', question);
      setQuestions((prevQuestions) => [...prevQuestions, {
        ...question,
        questionText: question.questionText === 0 ? '' : String(question.questionText || ''),
        timestamp: new Date(question.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    });

    // Socket.IO listener for deleted viva questions
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

    // Cleanup function for Socket.IO listeners
    return () => {
      socket.off('newVivaQuestion');
      socket.off('vivaQuestionDeleted');
    };
  }, [fetchQuestions]);

  // Add this useEffect to log prop changes for debugging purposes
  useEffect(() => {
    console.log('VivaQuestionsPage: isVivaQuestionsAddEnabled prop changed to:', isVivaQuestionsAddEnabled);
  }, [isVivaQuestionsAddEnabled]);

  // Effect hook to scroll to the bottom of the questions list when new questions arrive
  useEffect(() => {
    questionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [questions]);

  // Handler for adding a new viva question
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
        setNewQuestion(''); // Clear input on success
      } else {
        console.error('Failed to add question:', await response.json());
      }
    } catch (error) {
      console.error('Error adding question:', error);
    }
  };

  // Handler for deleting a viva question (soft delete by admin)
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
      <div className={`p-6 rounded-xl shadow-lg w-full max-w-full md:max-w-2xl flex flex-col h-[90vh] transform transition-all duration-300 hover:scale-105
        ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <h2 className={`text-2xl sm:text-3xl font-extrabold text-center sm:text-left flex-grow ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Viva Questions
          </h2>
          <button
            onClick={onGoToChat}
            className={`font-bold py-2 px-3 sm:px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm
              ${isDarkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          >
            Go to Chat
          </button>
        </div>
        <p className={`text-sm sm:text-md mb-4 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Logged in as: <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{userName || 'User'}</span>
          {isAdmin && <span className="ml-2 px-2 py-1 bg-red-400 text-white text-xs rounded-full">ADMIN</span>}
        </p>

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
                className={`max-w-[90%] sm:max-w-[80%] p-3 rounded-xl shadow-sm relative
                  ${q.senderName === userName
                    ? (isDarkMode ? 'bg-sky-700 text-white' : 'bg-sky-300 text-gray-900') + ' rounded-br-none'
                    : (isDarkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-100 text-gray-800') + ' rounded-bl-none'
                  } ${q.isDeleted ? 'opacity-60 italic' : ''}`}
              >
                <div className={`font-bold text-sm mb-1 ${q.senderName === adminUserName ? (isDarkMode ? 'text-purple-300' : 'text-purple-700') : ''}`}>
                  {q.senderName === userName ? 'You' : q.senderName}
                </div>
                {q.questionText && <p className="text-sm break-words">{q.questionText}</p>}
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

        <form onSubmit={handleAddQuestion} className="flex flex-col sm:flex-row gap-2 items-center">
          <input
            type="text"
            className={`flex-1 w-full px-4 py-2 border rounded-xl shadow-sm focus:outline-none text-sm
              ${isVivaQuestionsAddEnabled
                ? (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-sky-500 focus:border-sky-500' : 'border-gray-300 focus:ring-sky-500 focus:border-sky-500')
                : 'border-gray-400 bg-gray-100 cursor-not-allowed'
              }`}
            placeholder={isVivaQuestionsAddEnabled ? "Add a new viva question..." : "Adding questions is disabled by admin."}
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            disabled={!isVivaQuestionsAddEnabled} // Disable input if adding is not enabled
          />
          <button
            type="submit"
            className={`w-full sm:w-auto font-bold py-2 px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm
              ${isVivaQuestionsAddEnabled
                ? (isDarkMode ? 'bg-sky-700 hover:bg-sky-800 text-white' : 'bg-sky-500 hover:bg-sky-600 text-white')
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            disabled={!isVivaQuestionsAddEnabled} // Disable button if adding is not enabled
          >
            Add Question
          </button>
        </form>
      </div>
    </div>
  );
}


// Admin Dashboard Component
/**
 * AdminDashboard component for managing users and app settings.
 * Allows admins to approve/remove users and toggle chat/viva questions add status.
 * @param {object} props - The component props.
 * @param {string} props.loggedInUserId - ID of the currently logged-in user.
 * @param {string} props.userName - Name of the currently logged-in user.
 * @param {Array<object>} props.allUsers - List of all users in the system.
 * @param {function} props.onRemoveMember - Callback to remove a user.
 * @param {function} props.onApproveMember - Callback to approve a user.
 * @param {function} props.onGoToChat - Callback to navigate to the chat page.
 * @param {boolean} props.isChatEnabled - Current chat enabled status.
 * @param {function} props.onToggleChat - Callback to toggle chat status.
 * @param {function} props.onLogout - Callback to log out the user.
 * @param {boolean} props.isVivaQuestionsAddEnabled - Current viva questions add status.
 * @param {function} props.onToggleVivaQuestionsAdd - Callback to toggle viva questions add status.
 * @param {boolean} props.isDarkMode - Current dark mode status.
 * @param {string} props.adminUserName - The name designated as the admin.
 */
function AdminDashboard({ loggedInUserId, userName, allUsers, onRemoveMember, onApproveMember, onGoToChat, isChatEnabled, onToggleChat, onLogout, isVivaQuestionsAddEnabled, onToggleVivaQuestionsAdd, isDarkMode, adminUserName }) {
  const [message, setMessage] = useState('');

  // Filter approved members (excluding admin)
  const approvedMembers = allUsers.filter(member => member.isApproved && !member.isAdmin);
  // Filter pending members who are email verified AND not yet approved by admin
  const pendingMembers = allUsers.filter(member => member.isEmailVerified && !member.isApproved && !member.isAdmin);
  // Find the admin user
  const adminUser = allUsers.find(member => member.isAdmin);

  // Handler for removing a member
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
      setTimeout(() => setMessage(''), 2000); // Clear message after 2 seconds
    }
  };

  // Handler for approving a member
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
      setTimeout(() => setMessage(''), 2000); // Clear message after 2 seconds
    }
  };

  // Handler for toggling chat enabled/disabled status
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
      setTimeout(() => setMessage(''), 2000); // Clear message after 2 seconds
    }
  };

  // Handler for toggling viva questions add enabled/disabled status
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
      setTimeout(() => setMessage(''), 2000); // Clear message after 2 seconds
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans
      ${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-blue-950' : 'bg-gradient-to-br from-blue-100 to-indigo-200'}`}>
      <div className={`p-8 rounded-2xl shadow-lg w-full max-w-full md:max-w-4xl flex flex-col h-[90vh] transform transition-all duration-300 hover:scale-105
        ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-gray-200 gap-4">
          <h2 className={`text-3xl sm:text-4xl font-extrabold text-center sm:text-left ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Admin Dashboard</h2>
          <div className="flex flex-wrap justify-center sm:justify-end space-x-2 sm:space-x-4">
            <button
              onClick={onGoToChat}
              className={`font-bold py-2 px-4 sm:px-6 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm sm:text-lg flex items-center gap-2
                ${isDarkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Go to Chat
            </button>
            <button
              onClick={onLogout}
              className={`font-bold py-2 px-4 sm:px-6 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm sm:text-lg flex items-center gap-2
                ${isDarkMode ? 'bg-gray-700 hover:bg-gray-800 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* Message display for actions */}
        {message && (
          <div className="mb-6 p-4 text-base text-center text-white bg-blue-400 rounded-lg shadow-md animate-fade-in-down">
            {message}
          </div>
        )}

        {/* Admin User Section */}
        {adminUser && (
          <div className={`mb-8 p-4 border rounded-lg shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4
            ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-yellow-100 border-yellow-200'}`}>
            <h3 className={`text-lg sm:text-xl font-semibold text-center sm:text-left ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Logged in as: <span className={`font-extrabold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>{adminUser.name} (Admin)</span></h3>
            {/* Chat Enable/Disable Toggle */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <span className={`text-md sm:text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Chat Status:</span>
              <button
                onClick={handleToggleChatSetting}
                className={`flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-2 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm sm:text-base ${
                  isChatEnabled ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {isChatEnabled ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Chat ON
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Chat OFF
                  </>
                )}
              </button>
            </div>
            {/* Viva Questions Add Toggle */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 sm:ml-4">
              <span className={`text-md sm:text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Viva Q&A Add:</span>
              <button
                onClick={handleToggleVivaQuestionsAddSetting}
                className={`flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-2 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm sm:text-base ${
                  isVivaQuestionsAddEnabled ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {isVivaQuestionsAddEnabled ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Add ON
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
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
            <h3 className={`text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Pending Approvals ({pendingMembers.length})
            </h3>
            <div className="flex-1 overflow-y-auto pr-4"> {/* Changed pr-2 to pr-4 */}
              <ul className="space-y-3">
                {pendingMembers.length > 0 ? (
                  pendingMembers.map((member) => (
                    <li key={member.id} className={`flex flex-col sm:flex-row justify-between items-center p-4 rounded-lg shadow-sm border transition duration-200 text-center sm:text-left
                      ${isDarkMode ? 'bg-gray-600 border-gray-500 hover:bg-gray-500' : 'bg-yellow-50 border-yellow-100 hover:bg-yellow-100'}`}>
                      <span className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{member.name} <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>({member.email})</span></span>
                      <button
                        onClick={() => handleApprove(member.id, member.name)}
                        className="mt-2 sm:mt-0 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition duration-300 ease-in-out transform hover:scale-105 flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
            <h3 className={`text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.146-1.28-.423-1.848M13 16H7m6 0v-2.83A2.83 2.83 0 0115.83 10H17a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v3a2 2 0 002 2h2.17C9.854 11.28 10 11.907 10 12.56V16m-4 0v-2.83A2.83 2.83 0 018.17 10H7a2 2 0 00-2 2v3a2 2 0 002 2h2m-4 0h14" />
              </svg>
              Approved Group Members ({approvedMembers.length})
            </h3>
            <div className="flex-1 overflow-y-auto pr-4"> {/* Changed pr-2 to pr-4 */}
              <ul className="space-y-3">
                {approvedMembers.length > 0 ? (
                  approvedMembers.map((member) => (
                    <li key={member.id} className={`flex flex-col sm:flex-row justify-between items-center p-4 rounded-lg shadow-sm border transition duration-200 text-center sm:text-left
                      ${isDarkMode ? 'bg-gray-600 border-gray-500 hover:bg-gray-500' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                      <span className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{member.name} <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>({member.email})</span></span>
                      <button
                        onClick={() => handleRemove(member.id, member.name)}
                        className="mt-2 sm:mt-0 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition duration-300 ease-in-out transform hover:scale-105 flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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

// Group Chat Component
/**
 * GroupChat component for real-time messaging within the group.
 * Supports sending text messages and files, and viewing group members.
 * @param {object} props - The component props.
 * @param {string} props.loggedInUserId - ID of the currently logged-in user.
 * @param {string} props.userName - Name of the currently logged-in user.
 * @param {boolean} props.isAdmin - True if the logged-in user is an admin.
 * @param {function} props.onGoToAdminDashboard - Callback to navigate to the admin dashboard.
 * @param {Array<object>} props.groupMembers - List of approved group members.
 * @param {boolean} props.isChatEnabled - Current chat enabled status.
 * @param {function} props.onLogout - Callback to log out the user.
 * @param {function} props.onGoToVivaQuestions - Callback to navigate to the viva questions page.
 * @param {boolean} props.isDarkMode - Current dark mode status.
 * @param {string} props.adminUserName - The name designated as the admin.
 */
function GroupChat({ loggedInUserId, userName, isAdmin, onGoToAdminDashboard, groupMembers, isChatEnabled, onLogout, onGoToVivaQuestions, isDarkMode, adminUserName }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Callback to fetch chat messages from the backend
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages`);
      const data = await response.json();
      setMessages(data.map(msg => ({
        ...msg,
        // Ensure text is always a string, handle numeric 0
        text: msg.text === 0 ? '' : String(msg.text || ''),
        timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        // Prepend backend URL to fileUrl if it exists
        fileUrl: msg.fileUrl ? `${BACKEND_URL}${msg.fileUrl}` : null
      })));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  // Callback to fetch app settings (though main settings are handled in App component)
  const fetchSettings = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/settings`);
      // This component doesn't directly update isChatEnabled, App component does.
      // But good to have for reference if this component ever needed to fetch settings directly.
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  // Effect hook for fetching messages and setting up Socket.IO listeners
  useEffect(() => {
    fetchMessages();
    fetchSettings(); // Fetch settings on mount

    // Socket.IO listener for new messages
    socket.on('newMessage', (message) => {
      console.log('Socket.IO: Received newMessage', message);
      setMessages((prevMessages) => [...prevMessages, {
        ...message,
        text: message.text === 0 ? '' : String(message.text || ''),
        timestamp: new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fileUrl: message.fileUrl ? `${BACKEND_URL}${message.fileUrl}` : null
      }]);
    });

    // Socket.IO listener for deleted messages
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

    // Cleanup function for Socket.IO listeners
    return () => {
      socket.off('newMessage');
      socket.off('messageDeleted');
      socket.off('settingUpdated');
    };
  }, [fetchMessages, fetchSettings]);

  // Add this useEffect to log prop changes for debugging purposes
  useEffect(() => {
    console.log('GroupChat: isChatEnabled prop changed to:', isChatEnabled);
  }, [isChatEnabled]);

  // Effect hook to scroll to the bottom of the messages list when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handler for sending a new message (text or file)
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!isChatEnabled) {
      console.log('Chat is currently disabled by admin.');
      return;
    }

    if (newMessage.trim() === '' && !selectedFile) {
      return; // Prevent sending empty messages
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
        setNewMessage(''); // Clear message input
        setSelectedFile(null); // Clear selected file
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Clear file input element
        }
      } else {
        console.error('Failed to send message:', await response.json());
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handler for file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Handler for attach button click (triggers hidden file input)
  const handleAttachClick = () => {
    fileInputRef.current.click();
  };

  // Handler for deleting a message (soft delete by admin)
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
      <div className={`p-6 rounded-xl shadow-lg w-full max-w-full md:max-w-2xl flex flex-col h-[90vh] transform transition-all duration-300 hover:scale-105
        ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <h2 className={`text-2xl sm:text-3xl font-extrabold text-center sm:text-left flex-grow ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Charity Group Chat
          </h2>
          <div className="flex flex-wrap justify-center sm:justify-end space-x-2">
            {isAdmin && (
              <button
                onClick={onGoToAdminDashboard}
                className={`font-bold py-2 px-3 sm:px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm
                  ${isDarkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
              >
                Admin Dashboard
              </button>
            )}
            <button
              onClick={onGoToVivaQuestions}
              className={`font-bold py-2 px-3 sm:px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm
                ${isDarkMode ? 'bg-sky-700 hover:bg-sky-800 text-white' : 'bg-sky-500 hover:bg-sky-600 text-white'}`}
            >
              Viva Questions
            </button>
            <button
              onClick={() => setShowMembersModal(true)}
              className={`font-bold py-2 px-3 sm:px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm
                ${isDarkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
            >
              View Members
            </button>
            <button
              onClick={onLogout}
              className={`font-bold py-2 px-3 sm:px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-sm
                ${isDarkMode ? 'bg-gray-700 hover:bg-gray-800 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white'}`}
            >
              Logout
            </button>
          </div>
        </div>
        <p className={`text-sm sm:text-md mb-4 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Logged in as: <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{userName || 'User'}</span>
          {isAdmin && <span className="ml-2 px-2 py-1 bg-red-400 text-white text-xs rounded-full">ADMIN</span>}
        </p>

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
                className={`max-w-[90%] sm:max-w-[70%] p-3 rounded-xl shadow-sm relative
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

        <form onSubmit={handleSendMessage} className="flex flex-col sm:flex-row gap-2 items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={!isChatEnabled} // Disable file input if chat is not enabled
          />
          <button
            type="button"
            onClick={handleAttachClick}
            className={`w-full sm:w-auto font-bold py-2 px-3 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105
              ${isChatEnabled
                ? (isDarkMode ? 'bg-gray-600 hover:bg-gray-500 text-gray-100' : 'bg-gray-200 hover:bg-gray-300 text-gray-700')
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            title="Attach File"
            disabled={!isChatEnabled} // Disable attach button if chat is not enabled
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
            </svg>
          </button>

          <input
            type="text"
            className={`flex-1 w-full px-4 py-2 border rounded-xl shadow-sm focus:outline-none text-sm
              ${isChatEnabled
                ? (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500')
                : 'border-gray-400 bg-gray-100 cursor-not-allowed'
              }`}
            placeholder={isChatEnabled ? (selectedFile ? `Sending: ${selectedFile.name}` : "Type your message...") : "Chat is disabled by admin."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={!isChatEnabled || !!selectedFile} // Disable input if chat is not enabled or a file is selected
          />
          <button
            type="submit"
            className={`w-full sm:w-auto font-bold py-2 px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105
              ${isChatEnabled
                ? (isDarkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white')
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            disabled={!isChatEnabled} // Disable send button if chat is not enabled
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


// Main App component for handling login and registration, and routing
/**
 * Main App component that manages authentication, user state, and routing between different views.
 */
function App() {
  const [isLoginView, setIsLoginView] = useState(true); // Toggles between login and register forms
  const [loggedInUserId, setLoggedInUserId] = useState(null); // Stores user ID
  const [loggedInUserName, setLoggedInUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  // 'auth', 'chat', 'admin', 'pendingApproval', 'vivaQuestions', 'otpVerification'
  const [currentView, setCurrentView] = useState('auth');
  const [isChatEnabled, setIsChatEnabled] = useState(true); // Global setting for chat
  const [isVivaQuestionsAddEnabled, setIsVivaQuestionsAddEnabled] = useState(true); // Global setting for viva questions add
  const [isDarkMode, setIsDarkMode] = useState(false); // Dark mode state
  const adminUserName = 'Admin Akash'; // Define admin user name for consistent highlighting

  // OTP related states
  const [otpSent, setOtpSent] = useState(false);
  const [tempNewUserEmail, setTempNewUserEmail] = useState(''); // Store email for OTP screen
  const [tempNewUserId, setTempNewUserId] = useState(''); // Store ID for OTP verification
  const [enteredOtp, setEnteredOtp] = useState(''); // User entered OTP

  // Centralized user state - now fetched from backend
  const [allUsers, setAllUsers] = useState([]);

  // Form input states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(''); // General message display

  // Placeholder for Firebase variables (not directly used in this React code, but for Canvas environment)
  // These would typically be passed by the Canvas environment or loaded from a config.
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
  const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

  // Function to clean up trailing '0' from username if it's not the admin
  const cleanUserName = (name, id, isAdmin) => {
    // Only attempt to clean if it's not the admin user, or if the admin's name also needs cleaning
    // For now, let's apply it generally if it ends with '0'
    if (name && typeof name === 'string' && name.endsWith('0') && name.length > 1) {
      // Basic check: if the last character is '0' and it's not just "0" itself
      return name.slice(0, -1);
    }
    return name;
  };


  // Callback to fetch initial app data (settings and users)
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

  // Effect hook for initial data fetch and Socket.IO listeners for global updates
  useEffect(() => {
    fetchInitialData();

    // Socket.IO listener for user approved events
    socket.on('userApproved', (userId) => {
      console.log('Socket.IO: Received userApproved', userId);
      setAllUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, isApproved: true } : u));
    });

    // Socket.IO listener for user removed events
    socket.on('userRemoved', (userId) => {
      console.log('Socket.IO: Received userRemoved', userId);
      setAllUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
    });

    // Socket.IO listener for setting updates
    socket.on('settingUpdated', ({ settingName, settingValue }) => {
      console.log(`App Component: Socket.IO: Received settingUpdated: ${settingName} = ${settingValue}`);
      if (settingName === 'isChatEnabled') {
        setIsChatEnabled(settingValue);
        setMessage(`Chat is now ${settingValue ? 'ENABLED' : 'DISABLED'} by admin.`);
      } else if (settingName === 'isVivaQuestionsAddEnabled') {
        setIsVivaQuestionsAddEnabled(settingValue);
        setMessage(`Viva Q&A Add is now ${settingValue ? 'ENABLED' : 'DISABLED'} by admin.`);
      }
      setTimeout(() => setMessage(''), 2000); // Clear message after 2 seconds
    });

    // Cleanup function for Socket.IO listeners
    return () => {
      socket.off('userApproved');
      socket.off('userRemoved');
      socket.off('settingUpdated');
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
        // Apply cleanup to the username received from backend
        setLoggedInUserName(cleanUserName(data.user.name, data.user.id, data.user.isAdmin));
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
          // If login fails because of unverified email, prompt re-registration for new OTP
          setMessage('Your account is not email verified. Please register again to receive a new OTP.');
          setTempNewUserEmail(email); // Set email for OTP screen if they re-register
          setIsLoginView(false); // Switch to register view
          setCurrentView('auth'); // Stay on auth page
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
        setCurrentView('otpVerification'); // Move to OTP verification view
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
        fetchInitialData(); // Re-fetch all users to ensure the new user is in state

        setLoggedInUserId(data.user.id);
        // Apply cleanup to the username received from backend
        setLoggedInUserName(cleanUserName(data.user.name, data.user.id, data.user.isAdmin));
        setIsAdmin(data.user.isAdmin);

        // After OTP verification, if not admin, go to pending approval
        if (data.user.isAdmin || data.user.isApproved) { // Admin is auto-approved, or if already approved
            setMessage('Account verified and created successfully! You are now logged in.');
            setCurrentView('chat');
        } else { // User is email verified but still needs admin approval
            setMessage('Account email verified! Awaiting admin approval.');
            setCurrentView('pendingApproval');
        }

        // Clear OTP related states
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
   * Handles removing a member from the group (updates local state).
   * @param {string} memberIdToRemove - The ID of the member to remove.
   */
  const handleRemoveMember = (memberIdToRemove) => {
    setAllUsers(prevUsers => prevUsers.filter(u => u.id !== memberIdToRemove));
  };

  /**
   * Handles approving a member (updates local state).
   * @param {string} memberIdToApprove - The ID of the member to approve.
   */
  const handleApproveMember = (memberIdToApprove) => {
    setAllUsers(prevUsers => prevUsers.map(u => u.id === memberIdToApprove ? { ...u, isApproved: true } : u));
  };

  /**
   * Toggles the chat enabled/disabled status (updates local state).
   */
  const handleToggleChat = () => {
    setIsChatEnabled((prevStatus) => !prevStatus);
  };

  /**
   * Toggles the viva questions add enabled/disabled status (updates local state).
   */
  const handleToggleVivaQuestionsAdd = () => {
    setIsVivaQuestionsAddEnabled((prevStatus) => !prevStatus);
  };

  /**
   * Toggles dark mode (updates local state).
   */
  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  /**
   * Handles logging out the current user and resets app state.
   */
  const handleLogout = () => {
    setLoggedInUserId(null);
    setLoggedInUserName('');
    setIsAdmin(false);
    setCurrentView('auth'); // Go back to authentication view
    setIsLoginView(true); // Default to login form
    setMessage('You have been logged out.');
    setOtpSent(false);
    setEnteredOtp('');
    setTempNewUserEmail('');
    setTempNewUserId('');
  };

  // Conditional rendering based on currentView state
  if (currentView === 'chat') {
    // Filter only approved members for the chat view
    const approvedGroupMembers = allUsers.filter(u => u.isApproved);
    return (
      <GroupChat
        loggedInUserId={loggedInUserId}
        userName={loggedInUserName}
        isAdmin={isAdmin}
        onGoToAdminDashboard={() => setCurrentView('admin')}
        groupMembers={approvedGroupMembers}
        isChatEnabled={isChatEnabled}
        onLogout={handleLogout}
        onGoToVivaQuestions={() => setCurrentView('vivaQuestions')}
        isDarkMode={isDarkMode}
        adminUserName={adminUserName}
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
        isVivaQuestionsAddEnabled={isVivaQuestionsAddEnabled}
        isDarkMode={isDarkMode}
        adminUserName={adminUserName}
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
        <div className={`p-8 rounded-xl shadow-lg w-full max-w-full sm:max-w-md text-center transform transition-all duration-300 hover:scale-105
          ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
          <h2 className={`text-2xl sm:text-3xl font-extrabold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Verify Your Account</h2>
          {message && (
            <div className={`mb-4 p-3 text-sm text-center text-white rounded-lg shadow-md ${message.includes('successful') ? 'bg-green-500' : message.includes('Invalid') || message.includes('expired') ? 'bg-red-500' : 'bg-blue-500'}`}>
              {message}
            </div>
          )}
          <p className={`text-sm sm:text-lg mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none text-sm
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
        <div className={`p-8 rounded-xl shadow-lg w-full max-w-full sm:max-w-md text-center
          ${isDarkMode ? 'bg-gray-700 text-gray-100' : 'bg-white'}`}>
          <h2 className={`text-2xl sm:text-3xl font-extrabold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Awaiting Approval</h2>
          <p className={`text-sm sm:text-lg mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Hello, <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`}>{loggedInUserName}</span>!
            Your account is currently awaiting approval from an administrator.
          </p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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

  // Default view: Auth forms (Login/Register)
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans
      ${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-blue-950' : 'bg-gradient-to-br from-sky-50 to-blue-100'}`}>
      {/* Dark Mode Toggle - always visible */}
      <div className="absolute top-4 right-4 z-10">
        <DarkModeToggle isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
      </div>

      <div className={`p-8 rounded-xl shadow-lg w-full max-w-full sm:max-w-md transform transition-all duration-300 hover:scale-105
        ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
        <h2 className={`text-2xl sm:text-3xl font-extrabold mb-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
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
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none text-sm
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
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none text-sm
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
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none text-sm
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
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none text-sm
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
