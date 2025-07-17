import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client'; // Import socket.io-client

function App() {
  // --- IMPORTANT FOR RENDER DEPLOYMENT & PREVIEW ---
  // For the Canvas preview, process.env is not available.
  // For Render deployment, you MUST set these as environment variables in Render's dashboard.
  // If you are running locally, create a .env file in your project root with these variables.
  // REACT_APP_BACKEND_API_URL = https://chat-backend-api-rhu4.onrender.com/api
  // REACT_APP_BACKEND_SOCKET_URL = https://chat-backend-api-rhu4.onrender.com

  // Use process.env for deployment, fallback to hardcoded for Canvas preview if needed,
  // or ensure your Render environment variables are correctly set.
  const API_BASE_URL = process.env.REACT_APP_BACKEND_API_URL || 'https://chat-backend-api-rhu4.onrender.com/api';
  const SOCKET_URL = process.env.REACT_APP_BACKEND_SOCKET_URL || 'https://chat-backend-api-rhu4.onrender.com';


  // Use useRef to hold the socket instance, so it persists across re-renders
  const socketRef = useRef(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [loggedInUserName, setLoggedInUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState('auth');
  const [isChatEnabled, setIsChatEnabled] = useState(true);
  const [isVivaQuestionsAddEnabled, setIsVivaQuestionsAddEnabled] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const adminUserName = 'Admin User';

  const [otpSent, setOtpSent] = useState(false);
  const [tempNewUserEmail, setTempNewUserEmail] = useState('');
  const [tempNewUserId, setTempNewUserId] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');

  const [allUsers, setAllUsers] = useState([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);

  // --- DarkModeToggle Component (nested) ---
  const DarkModeToggle = ({ isDarkMode, toggleDarkMode }) => {
    return (
      <button
        onClick={toggleDarkMode}
        className={`p-2 rounded-full shadow-md transition-all duration-300 ${
          isDarkMode ? 'bg-gray-700 text-yellow-400' : 'bg-yellow-400 text-gray-800'
        }`}
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 4a1 1 0 011 1v1a1 1 0 11-2 0V7a1 1 0 011-1zm-4 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm8-4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM4 10a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm4-4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM6 10a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z"
              clipRule="evenodd"
            ></path>
          </svg>
        )}
      </button>
    );
  };

  // --- Register.js Component (nested) ---
  const Register = ({ name, setName, email, setEmail, password, setPassword, confirmPassword, setConfirmPassword, handleRegister, message, isDarkMode, setIsLoginView }) => {
    return (
      <form onSubmit={handleRegister} className="space-y-6">
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
            autoComplete="new-password"
            required
            className={`appearance-none relative block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm
              ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500' : 'border-gray-300 focus:ring-blue-400 focus:border-400'}`}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
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

        <div>
          <button
            type="submit"
            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white shadow-md transition duration-300 ease-in-out transform hover:scale-105
              ${isDarkMode ? 'bg-blue-700 hover:bg-blue-800 focus:ring-blue-600' : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-400'}`}
          >
            Register
          </button>
        </div>
      </form>
    );
  };

  // --- Login.js Component (nested) ---
  const Login = ({ email, setEmail, password, setPassword, handleLogin, message, isDarkMode, setIsLoginView }) => {
    return (
      <form onSubmit={handleLogin} className="space-y-6">
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
            autoComplete="current-password"
            required
            className={`appearance-none relative block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm
              ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500' : 'border-gray-300 focus:ring-blue-400 focus:border-blue-400'}`}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <button
            type="submit"
            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white shadow-md transition duration-300 ease-in-out transform hover:scale-105
              ${isDarkMode ? 'bg-blue-700 hover:bg-blue-800 focus:ring-blue-600' : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-400'}`}
          >
            Sign In
          </button>
        </div>
      </form>
    );
  };

  // --- ChatInput.js Component (nested) ---
  const ChatInput = ({ newMessage, setNewMessage, handleSendMessage, isChatEnabled, privateMessageRecipient, cancelPrivateChat, getRecipientName, isDarkMode }) => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    };

    return (
      <div className={`flex flex-row items-center h-16 rounded-xl w-full px-4
        ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
        {privateMessageRecipient && (
          <div className={`flex items-center mr-2 px-3 py-1 rounded-full text-sm font-medium
            ${isDarkMode ? 'bg-purple-800 text-white' : 'bg-purple-200 text-purple-800'}`}>
            Private to: {getRecipientName()}
            <button onClick={cancelPrivateChat} className="ml-2 text-xs font-bold">
              &times;
            </button>
          </div>
        )}
        <div className="flex-grow ml-4">
          <div className="relative w-full">
            <input
              type="text"
              placeholder={isChatEnabled ? "Type your message..." : "Chat is currently disabled by admin."}
              className={`flex w-full border rounded-xl focus:outline-none focus:border-indigo-300 h-10 px-4
                ${isDarkMode ? 'bg-gray-600 border-gray-500 text-gray-100 placeholder-gray-300' : 'border-gray-300'}`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isChatEnabled}
            />
          </div>
        </div>
        <div className="ml-4">
          <button
            className={`flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white px-4 py-1 flex-shrink-0 transition duration-300 ease-in-out transform hover:scale-105
              ${!isChatEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleSendMessage}
            disabled={!isChatEnabled}
          >
            <span>Send</span>
            <span className="ml-2">
              <svg
                className="w-4 h-4 transform rotate-45 -mt-px"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                ></path>
              </svg>
            </span>
          </button>
        </div>
      </div>
    );
  };

  // --- Chat.js Component (nested) ---
  const Chat = ({ loggedInUserId, userName, isAdmin, onGoToAdminDashboard, groupMembers, isChatEnabled, onLogout, onGoToVivaQuestions, isDarkMode, adminUserName, socket }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [privateMessageRecipient, setPrivateMessageRecipient] = useState(null);
    const [showMembers, setShowMembers] = useState(false);
    const [showChatDisabledMessage, setShowChatDisabledMessage] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
      const fetchMessages = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/messages`);
          const data = await response.json();
          setMessages(data);
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      };

      fetchMessages();

      if (socket) {
        socket.on('message', (message) => {
          setMessages((prevMessages) => [...prevMessages, message]);
        });

        socket.on('privateMessage', (message) => {
          setMessages((prevMessages) => [...prevMessages, message]);
        });

        socket.on('chatStatusChanged', (status) => {
          if (!status.isChatEnabled) {
            setShowChatDisabledMessage(true);
            setTimeout(() => setShowChatDisabledMessage(false), 5000);
          }
        });
      }

      return () => {
        if (socket) {
          socket.off('message');
          socket.off('privateMessage');
          socket.off('chatStatusChanged');
        }
      };
    }, [socket]);

    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    const handleSendMessage = useCallback(() => {
      if (newMessage.trim() === '' || !socket) return;

      const messageData = {
        senderId: loggedInUserId,
        senderName: userName,
        text: newMessage,
        timestamp: new Date().toISOString(),
        isPrivate: !!privateMessageRecipient,
        recipientId: privateMessageRecipient,
      };

      if (privateMessageRecipient) {
        socket.emit('privateMessage', messageData);
      } else {
        socket.emit('message', messageData);
      }

      setNewMessage('');
      setPrivateMessageRecipient(null);
    }, [newMessage, loggedInUserId, userName, privateMessageRecipient, socket]);

    const startPrivateChat = (memberId, memberName) => {
      setPrivateMessageRecipient(memberId);
      setNewMessage(`@${memberName} `);
      setShowMembers(false);
    };

    const cancelPrivateChat = () => {
      setPrivateMessageRecipient(null);
      setNewMessage('');
    };

    const getRecipientName = () => {
      const recipient = groupMembers.find(member => member.id === privateMessageRecipient);
      return recipient ? recipient.name : 'Unknown';
    };

    return (
      <div className={`flex h-screen antialiased text-gray-800 font-sans ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100'}`}>
        <div className="flex flex-row h-full w-full overflow-hidden">
          {/* Left Sidebar - Members List */}
          <div className={`flex flex-col py-8 pl-6 pr-2 w-64 ${isDarkMode ? 'bg-gray-800 border-r border-gray-700' : 'bg-white border-r border-gray-200'} flex-shrink-0`}>
            <div className="flex flex-row items-center justify-center h-12 w-full">
              <div className={`flex items-center justify-center rounded-2xl text-indigo-700 ${isDarkMode ? 'bg-indigo-900' : 'bg-indigo-100'} h-10 w-10`}>
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  ></path>
                </svg>
              </div>
              <div className={`ml-2 font-bold text-2xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Chat App</div>
            </div>
            <div className="flex flex-col items-center mt-4 border-t border-gray-200 pt-4">
              <div className={`text-lg font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Hello, {userName}!
              </div>
              {isAdmin && (
                <button
                  onClick={onGoToAdminDashboard}
                  className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium transition duration-300 ease-in-out transform hover:scale-105
                    ${isDarkMode ? 'bg-purple-700 hover:bg-purple-800 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                >
                  Admin Dashboard
                </button>
              )}
              <button
                onClick={onGoToVivaQuestions}
                className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium transition duration-300 ease-in-out transform hover:scale-105
                  ${isDarkMode ? 'bg-green-700 hover:bg-green-800 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
              >
                Viva Questions
              </button>
              <button
                onClick={onLogout}
                className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium transition duration-300 ease-in-out transform hover:scale-105
                  ${isDarkMode ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
              >
                Logout
              </button>
            </div>

            <div className="flex flex-col mt-8">
              <div className={`flex flex-row items-center justify-between text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                <span className="font-bold">Group Members</span>
                <span className={`flex items-center justify-center bg-gray-300 h-4 w-4 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-600'}`}>
                  {groupMembers.length}
                </span>
              </div>
              <div className="flex flex-col space-y-1 mt-4 -mx-2 h-full overflow-y-auto">
                {groupMembers.map((member) => (
                  <button
                    key={member.id}
                    className={`flex flex-row items-center hover:bg-gray-100 rounded-xl p-2 ${isDarkMode ? 'hover:bg-gray-700' : ''}`}
                    onClick={() => startPrivateChat(member.id, member.name)}
                    disabled={member.id === loggedInUserId}
                  >
                    <div className={`flex items-center justify-center h-8 w-8 rounded-full ${isDarkMode ? 'bg-indigo-800 text-white' : 'bg-indigo-200 text-indigo-800'}`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`ml-2 text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {member.name} {member.id === loggedInUserId && "(You)"}
                      {member.name === adminUserName && <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500 text-white">Admin</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex flex-col flex-auto h-full p-6">
            <div className={`flex flex-col flex-auto flex-shrink-0 rounded-2xl h-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-4`}>
              <div className="flex flex-col h-full overflow-x-hidden overflow-y-auto mb-4">
                <div className="flex flex-col h-full">
                  <div className="grid grid-cols-12 gap-y-2">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`col-span-12 p-3 rounded-lg ${
                          msg.senderId === loggedInUserId
                            ? 'col-start-6 col-end-13 bg-blue-600 text-white rounded-br-none self-end'
                            : 'col-end-8 col-start-1 bg-gray-200 text-gray-800 rounded-bl-none self-start'
                        } ${isDarkMode && msg.senderId !== loggedInUserId ? 'bg-gray-700 text-gray-200' : ''}`}
                      >
                        <div className="flex items-center">
                          <div className={`flex items-center justify-center h-10 w-10 rounded-full flex-shrink-0 ${
                            msg.senderId === loggedInUserId
                              ? 'bg-blue-800'
                              : (msg.senderName === adminUserName ? 'bg-yellow-600' : 'bg-indigo-500')
                          } text-white`}>
                            {msg.senderName.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <div className="flex items-baseline">
                              <div className={`font-bold text-sm ${msg.senderId === loggedInUserId ? 'text-white' : (msg.senderName === adminUserName ? 'text-yellow-400' : (isDarkMode ? 'text-gray-100' : 'text-gray-900'))}`}>
                                {msg.senderName}
                                {msg.senderName === adminUserName && <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500 text-white">Admin</span>}
                              </div>
                              {msg.isPrivate && (
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-200 text-purple-800'}`}>
                                  Private to {msg.recipientId === loggedInUserId ? 'You' : groupMembers.find(m => m.id === msg.recipientId)?.name || 'Unknown'}
                                </span>
                              )}
                              <div className={`ml-2 text-xs ${msg.senderId === loggedInUserId ? 'text-blue-200' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}`}>
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className={`mt-1 text-sm ${msg.senderId === loggedInUserId ? 'text-white' : (isDarkMode ? 'text-gray-200' : 'text-gray-800')}`}>
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>

              <ChatInput
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessage}
                isChatEnabled={isChatEnabled}
                privateMessageRecipient={privateMessageRecipient}
                cancelPrivateChat={cancelPrivateChat}
                getRecipientName={getRecipientName}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- AdminDashboard.js Component (nested) ---
  const AdminDashboard = ({ loggedInUserId, userName, allUsers, onRemoveMember, onApproveMember, onGoToChat, isChatEnabled, onToggleChat, isVivaQuestionsAddEnabled, onToggleVivaQuestionsAdd, onLogout, isDarkMode, adminUserName }) => {
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('pending');

    const handleApprove = async (userId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/approve-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, adminId: loggedInUserId }),
        });
        const data = await response.json();
        if (response.ok) {
          onApproveMember(userId);
          setMessage(data.message);
        } else {
          setMessage(data.message || 'Failed to approve user.');
        }
      } catch (error) {
        console.error('Error approving user:', error);
        setMessage('Server error during approval.');
      } finally {
        setTimeout(() => setMessage(''), 3000);
      }
    };

    const handleRemove = async (userId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/remove-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, adminId: loggedInUserId }),
        });
        const data = await response.json();
        if (response.ok) {
          onRemoveMember(userId);
          setMessage(data.message);
        } else {
          setMessage(data.message || 'Failed to remove user.');
        }
      } catch (error) {
        console.error('Error removing user:', error);
        setMessage('Server error during removal.');
      } finally {
        setTimeout(() => setMessage(''), 3000);
      }
    };

    const handleToggleSetting = async (settingName, currentValue, onToggleFunction) => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/update-setting`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settingName, settingValue: !currentValue, adminId: loggedInUserId }),
        });
        const data = await response.json();
        if (response.ok) {
          onToggleFunction();
          setMessage(data.message);
        } else {
          setMessage(data.message || `Failed to update ${settingName}.`);
        }
      } catch (error) {
        console.error(`Error toggling ${settingName}:`, error);
        setMessage(`Server error toggling ${settingName}.`);
      } finally {
        setTimeout(() => setMessage(''), 3000);
      }
    };

    const pendingUsers = allUsers.filter(user => !user.isAdmin && !user.isApproved && user.isEmailVerified);
    const approvedUsers = allUsers.filter(user => user.isApproved);

    return (
      <div className={`min-h-screen flex flex-col items-center p-6 font-sans ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-sky-100 text-gray-900'}`}>
        <div className={`w-full max-w-4xl p-8 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-4xl font-extrabold mb-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Admin Dashboard
          </h2>

          {message && (
            <div className={`mb-4 p-3 text-sm text-center text-white rounded-lg shadow-md ${message.includes('successful') ? 'bg-green-500' : 'bg-blue-500'}`}>
              {message}
            </div>
          )}

          <div className="flex justify-center mb-6 space-x-4">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 rounded-lg text-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105
                ${activeTab === 'pending' ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-blue-500 hover:text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100')}`}
            >
              Pending Approvals ({pendingUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 rounded-lg text-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105
                ${activeTab === 'settings' ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-blue-500 hover:text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100')}`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-6 py-3 rounded-lg text-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105
                ${activeTab === 'members' ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-blue-500 hover:text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100')}`}
            >
              Approved Members ({approvedUsers.length})
            </button>
          </div>

          {activeTab === 'pending' && (
            <div>
              <h3 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Users Awaiting Approval</h3>
              {pendingUsers.length === 0 ? (
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No users awaiting approval.</p>
              ) : (
                <ul className="space-y-3">
                  {pendingUsers.map((user) => (
                    <li key={user.id} className={`flex justify-between items-center p-4 rounded-lg shadow-sm ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <span className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{user.name} ({user.email})</span>
                      <div>
                        <button
                          onClick={() => handleApprove(user.id)}
                          className={`ml-2 px-4 py-2 rounded-lg text-sm font-medium transition duration-300 ease-in-out transform hover:scale-105
                            ${isDarkMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRemove(user.id)}
                          className={`ml-2 px-4 py-2 rounded-lg text-sm font-medium transition duration-300 ease-in-out transform hover:scale-105
                            ${isDarkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div>
              <h3 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Approved Members</h3>
              {approvedUsers.length === 0 ? (
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No approved members.</p>
              ) : (
                <ul className="space-y-3">
                  {approvedUsers.map((user) => (
                    <li key={user.id} className={`flex justify-between items-center p-4 rounded-lg shadow-sm ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <span className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{user.name} ({user.email}) {user.isAdmin && <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500 text-white">Admin</span>}</span>
                      {!user.isAdmin && (
                        <button
                          onClick={() => handleRemove(user.id)}
                          className={`ml-2 px-4 py-2 rounded-lg text-sm font-medium transition duration-300 ease-in-out transform hover:scale-105
                            ${isDarkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Application Settings</h3>
              <div className={`flex items-center justify-between p-4 rounded-lg shadow-sm ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <span className={`text-lg font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Enable Chat Functionality</span>
                <button
                  onClick={() => handleToggleSetting('isChatEnabled', isChatEnabled, onToggleChat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-300 ease-in-out transform hover:scale-105
                    ${isChatEnabled
                      ? (isDarkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white')
                      : (isDarkMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white')
                    }`}
                >
                  {isChatEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
              <div className={`flex items-center justify-between p-4 rounded-lg shadow-sm ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <span className={`text-lg font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Enable Viva Questions Adding</span>
                <button
                  onClick={() => handleToggleSetting('isVivaQuestionsAddEnabled', isVivaQuestionsAddEnabled, onToggleVivaQuestionsAdd)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-300 ease-in-out transform hover:scale-105
                    ${isVivaQuestionsAddEnabled
                      ? (isDarkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white')
                      : (isDarkMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white')
                    }`}
                >
                  {isVivaQuestionsAddEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <button
              onClick={onGoToChat}
              className={`mr-4 px-6 py-3 rounded-lg text-lg font-medium transition duration-300 ease-in-out transform hover:scale-105
                ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}
            >
              Go to Chat
            </button>
            <button
              onClick={onLogout}
              className={`px-6 py-3 rounded-lg text-lg font-medium transition duration-300 ease-in-out transform hover:scale-105
                ${isDarkMode ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- VivaQuestionsPage.js Component (nested) ---
  const VivaQuestionsPage = ({ loggedInUserId, userName, isAdmin, onGoToChat, isVivaQuestionsAddEnabled, isDarkMode, adminUserName }) => {
    const [questions, setQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState('');
    const [newAnswer, setNewAnswer] = useState('');
    const [message, setMessage] = useState('');
    const [editingQuestionId, setEditingQuestionId] = useState(null);
    const [editedQuestionText, setEditedQuestionText] = useState('');
    const [editedAnswerText, setEditedAnswerText] = useState('');

    useEffect(() => {
      const fetchQuestions = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/viva-questions`);
          const data = await response.json();
          setQuestions(data);
        } catch (error) {
          console.error('Error fetching viva questions:', error);
          setMessage('Failed to load viva questions.');
        }
      };
      fetchQuestions();
    }, []);

    const handleAddQuestion = async (e) => {
      e.preventDefault();
      setMessage('');
      if (!newQuestion.trim() || !newAnswer.trim()) {
        setMessage('Question and Answer cannot be empty.');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/viva-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: newQuestion,
            answer: newAnswer,
            addedBy: userName,
            addedById: loggedInUserId
          }),
        });
        const data = await response.json();
        if (response.ok) {
          setQuestions((prev) => [...prev, data]);
          setNewQuestion('');
          setNewAnswer('');
          setMessage('Question added successfully!');
        } else {
          setMessage(data.message || 'Failed to add question.');
        }
      } catch (error) {
        console.error('Error adding question:', error);
        setMessage('Server error adding question.');
      } finally {
        setTimeout(() => setMessage(''), 3000);
      }
    };

    const handleDeleteQuestion = async (id) => {
      setMessage('');
      try {
        const response = await fetch(`${API_BASE_URL}/viva-questions/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: loggedInUserId, isAdmin }),
        });
        const data = await response.json();
        if (response.ok) {
          setQuestions((prev) => prev.filter((q) => q.id !== id));
          setMessage('Question deleted successfully!');
        } else {
          setMessage(data.message || 'Failed to delete question.');
        }
      } catch (error) {
        console.error('Error deleting question:', error);
        setMessage('Server error deleting question.');
      } finally {
        setTimeout(() => setMessage(''), 3000);
      }
    };

    const handleEditQuestion = (question) => {
      setEditingQuestionId(question.id);
      setEditedQuestionText(question.question);
      setEditedAnswerText(question.answer);
    };

    const handleSaveEdit = async (id) => {
      setMessage('');
      if (!editedQuestionText.trim() || !editedAnswerText.trim()) {
        setMessage('Edited question and answer cannot be empty.');
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/viva-questions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: editedQuestionText,
            answer: editedAnswerText,
            userId: loggedInUserId,
            isAdmin
          }),
        });
        const data = await response.json();
        if (response.ok) {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === id ? { ...q, question: editedQuestionText, answer: editedAnswerText } : q
            )
          );
          setEditingQuestionId(null);
          setEditedQuestionText('');
          setEditedAnswerText('');
          setMessage('Question updated successfully!');
        } else {
          setMessage(data.message || 'Failed to update question.');
        }
      } catch (error) {
        console.error('Error updating question:', error);
        setMessage('Server error updating question.');
      } finally {
        setTimeout(() => setMessage(''), 3000);
      }
    };

    const handleCancelEdit = () => {
      setEditingQuestionId(null);
      setEditedQuestionText('');
      setEditedAnswerText('');
    };

    return (
      <div className={`min-h-screen flex flex-col items-center p-6 font-sans ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-sky-100 text-gray-900'}`}>
        <div className={`w-full max-w-3xl p-8 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-4xl font-extrabold mb-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Viva Questions
          </h2>

          {message && (
            <div className={`mb-4 p-3 text-sm text-center text-white rounded-lg shadow-md ${message.includes('successful') ? 'bg-green-500' : 'bg-blue-500'}`}>
              {message}
            </div>
          )}

          {isVivaQuestionsAddEnabled && (
            <form onSubmit={handleAddQuestion} className={`mb-8 p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add New Question</h3>
              <div className="mb-4">
                <label htmlFor="new-question" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Question
                </label>
                <textarea
                  id="new-question"
                  rows="3"
                  className={`w-full p-2 border rounded-md resize-y focus:outline-none focus:ring-blue-400 focus:border-blue-400
                    ${isDarkMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'border-gray-300'}`}
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Enter your question here..."
                  required
                ></textarea>
              </div>
              <div className="mb-4">
                <label htmlFor="new-answer" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Answer
                </label>
                <textarea
                  id="new-answer"
                  rows="3"
                  className={`w-full p-2 border rounded-md resize-y focus:outline-none focus:ring-blue-400 focus:border-blue-400
                    ${isDarkMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'border-gray-300'}`}
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Enter the answer here..."
                  required
                ></textarea>
              </div>
              <button
                type="submit"
                className={`w-full py-2 px-4 rounded-lg text-white font-medium transition duration-300 ease-in-out transform hover:scale-105
                  ${isDarkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'}`}
              >
                Add Question
              </button>
            </form>
          )}

          <h3 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>All Questions</h3>
          {questions.length === 0 ? (
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No questions added yet.</p>
          ) : (
            <ul className="space-y-4">
              {questions.map((q) => (
                <li key={q.id} className={`p-5 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  {editingQuestionId === q.id ? (
                    <div>
                      <div className="mb-3">
                        <label htmlFor={`edit-question-${q.id}`} className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Question
                        </label>
                        <textarea
                          id={`edit-question-${q.id}`}
                          rows="2"
                          className={`w-full p-2 border rounded-md focus:outline-none focus:ring-blue-400 focus:border-blue-400
                            ${isDarkMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'border-gray-300'}`}
                          value={editedQuestionText}
                          onChange={(e) => setEditedQuestionText(e.target.value)}
                        ></textarea>
                      </div>
                      <div className="mb-3">
                        <label htmlFor={`edit-answer-${q.id}`} className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Answer
                        </label>
                        <textarea
                          id={`edit-answer-${q.id}`}
                          rows="2"
                          className={`w-full p-2 border rounded-md focus:outline-none focus:ring-blue-400 focus:border-blue-400
                            ${isDarkMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'border-gray-300'}`}
                          value={editedAnswerText}
                          onChange={(e) => setEditedAnswerText(e.target.value)}
                        ></textarea>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleSaveEdit(q.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-300 ease-in-out transform hover:scale-105
                            ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-300 ease-in-out transform hover:scale-105
                            ${isDarkMode ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={`font-semibold text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Q: {q.question}
                      </p>
                      <p className={`mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        A: {q.answer}
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Asked by: {q.addedBy} {q.addedBy === adminUserName && <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500 text-white">Admin</span>} on {new Date(q.timestamp).toLocaleDateString()}
                      </p>
                      <div className="mt-3 flex justify-end space-x-2">
                        {(isAdmin || loggedInUserId === q.addedById) && (
                          <>
                            <button
                              onClick={() => handleEditQuestion(q)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-300 ease-in-out transform hover:scale-105
                                ${isDarkMode ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-300 ease-in-out transform hover:scale-105
                                ${isDarkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 text-center">
            <button
              onClick={onGoToChat}
              className={`px-6 py-3 rounded-lg text-lg font-medium transition duration-300 ease-in-out transform hover:scale-105
                ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}
            >
              Go to Chat
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    // Initialize socket connection only once when component mounts
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to socket server');
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from socket server');
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    }

    // Clean up on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [SOCKET_URL]); // Re-run if SOCKET_URL changes (though it's usually static)

  const checkAuth = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-token`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setIsAuthenticated(true);
          setLoggedInUserId(data.userId);
          setLoggedInUserName(data.name);
          setIsAdmin(data.isAdmin);
          setIsChatEnabled(data.isChatEnabled);
          setIsVivaQuestionsAddEnabled(data.isVivaQuestionsAddEnabled);
          await fetchAllUsers(token);
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('token');
          setMessage(data.message || 'Session expired. Please log in again.');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        localStorage.removeItem('token');
        setMessage('Network error or server unavailable. Please try again.');
      }
    }
    setLoading(false);
  }, [API_BASE_URL]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const fetchAllUsers = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setAllUsers(data);
      } else {
        console.error('Failed to fetch users:', data.message);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setOtpSent(true);
        setTempNewUserEmail(email);
        setTempNewUserId(data.userId);
        setMessage(data.message);
      } else {
        setMessage(data.message || 'Registration failed.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage('Server error during registration.');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempNewUserEmail, otp: enteredOtp, userId: tempNewUserId }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message);
        setOtpSent(false);
        setTempNewUserEmail('');
        setTempNewUserId('');
        setEnteredOtp('');
        setIsLoginView(true); // Go back to login view after successful verification
      } else {
        setMessage(data.message || 'OTP verification failed.');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setMessage('Server error during OTP verification.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setIsAuthenticated(true);
        setLoggedInUserId(data.userId);
        setLoggedInUserName(data.name);
        setIsAdmin(data.isAdmin);
        setIsChatEnabled(data.isChatEnabled);
        setIsVivaQuestionsAddEnabled(data.isVivaQuestionsAddEnabled);
        await fetchAllUsers(data.token);
        setMessage('Login successful!');
      } else {
        setMessage(data.message || 'Login failed.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('Server error during login.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setLoggedInUserId(null);
    setLoggedInUserName('');
    setIsAdmin(false);
    setAllUsers([]);
    setCurrentView('auth');
    setMessage('Logged out successfully.');
    // Disconnect socket on logout
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null; // Clear the ref so it can be re-initialized on next login
    }
  };

  const handleApproveMember = (userId) => {
    setAllUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, isApproved: true } : user
      )
    );
  };

  const handleRemoveMember = (userId) => {
    setAllUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
  };

  const handleToggleChat = () => {
    setIsChatEnabled(prev => !prev);
  };

  const handleToggleVivaQuestionsAdd = () => {
    setIsVivaQuestionsAddEnabled(prev => !prev);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-xl font-semibold text-indigo-600">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
        <div className="absolute top-4 right-4 z-10">
          <DarkModeToggle isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
        </div>
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/chat" />
              ) : (
                <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  <div className={`max-w-md w-full space-y-8 p-10 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div>
                      <h2 className={`mt-6 text-center text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {isLoginView ? 'Sign in to your account' : 'Register for an account'}
                      </h2>
                      {message && (
                        <p className={`mt-2 text-center text-sm ${message.includes('successful') || message.includes('sent') ? 'text-green-500' : 'text-red-500'}`}>
                          {message}
                        </p>
                      )}
                    </div>
                    {otpSent ? (
                      <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div>
                          <label htmlFor="otp" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Enter OTP sent to {tempNewUserEmail}
                          </label>
                          <input
                            id="otp"
                            name="otp"
                            type="text"
                            required
                            className={`appearance-none relative block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm
                              ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500' : 'border-gray-300 focus:ring-blue-400 focus:border-blue-400'}`}
                            placeholder="OTP"
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
                    ) : (
                      <>
                        {isLoginView ? (
                          <Login
                            email={email}
                            setEmail={setEmail}
                            password={password}
                            setPassword={setPassword}
                            handleLogin={handleLogin}
                            message={message}
                            isDarkMode={isDarkMode}
                            setIsLoginView={setIsLoginView}
                          />
                        ) : (
                          <Register
                            name={name}
                            setName={setName}
                            email={email}
                            setEmail={setEmail}
                            password={password}
                            setPassword={setPassword}
                            confirmPassword={confirmPassword}
                            setConfirmPassword={setConfirmPassword}
                            handleRegister={handleRegister}
                            message={message}
                            isDarkMode={isDarkMode}
                            setIsLoginView={setIsLoginView}
                          />
                        )}
                        <div className="text-center mt-4">
                          <button
                            onClick={() => setIsLoginView(!isLoginView)}
                            className={`font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
                          >
                            {isLoginView ? 'Need an account? Register' : 'Already have an account? Sign In'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            }
          />
          <Route
            path="/chat"
            element={
              isAuthenticated ? (
                <Chat
                  loggedInUserId={loggedInUserId}
                  userName={loggedInUserName}
                  isAdmin={isAdmin}
                  onGoToAdminDashboard={() => setCurrentView('admin')}
                  groupMembers={allUsers}
                  isChatEnabled={isChatEnabled}
                  onLogout={handleLogout}
                  onGoToVivaQuestions={() => setCurrentView('viva-questions')}
                  isDarkMode={isDarkMode}
                  adminUserName={adminUserName}
                  socket={socketRef.current} // Pass the socket instance
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/admin"
            element={
              isAuthenticated && isAdmin ? (
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
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/viva-questions"
            element={
              isAuthenticated ? (
                <VivaQuestionsPage
                  loggedInUserId={loggedInUserId}
                  userName={loggedInUserName}
                  isAdmin={isAdmin}
                  onGoToChat={() => setCurrentView('chat')}
                  isVivaQuestionsAddEnabled={isVivaQuestionsAddEnabled}
                  isDarkMode={isDarkMode}
                  adminUserName={adminUserName}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
