import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import NotificationPanel from './NotificationPanel';

export interface TopBarProps {
  filterCategory: string;
  setFilterCategory: (value: string) => void;
  filterDueDate: string;
  setFilterDueDate: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  setShowForm: (value: boolean) => void;
}

const TopBar: React.FC<TopBarProps> = ({
  filterCategory,
  setFilterCategory,
  filterDueDate,
  setFilterDueDate,
  searchQuery,
  setSearchQuery,
  setShowForm,
}) => {
  const navigate = useNavigate();
  
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUserName(currentUser.displayName || currentUser.email?.split('@')[0] || 'User');
      setUserPhoto(currentUser.photoURL || null);
    } else {
      setUserName(localStorage.getItem('email')?.split('@')[0] || 'User');
    }
  }, []);

  // Fetch pending tasks count
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser?.uid) return;

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'tasks'),
        where('assignedTo', '==', currentUser.uid),
        where('status', '!=', 'completed')
      ),
      (snapshot) => {
        setPendingCount(snapshot.size);
      },
      (error) => {
        console.error('Error fetching pending tasks count:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    localStorage.removeItem('email');
    navigate('/');
  };

  return (
    <div className="p-3 bg-white shadow-md">
      {/* Both Mobile and Desktop: Three lines */}
      <div className="flex flex-col space-y-3">
        {/* First Line: Logo and User Profile */}
        <div className="flex items-center justify-between">
          {/* Logo */}
          <h1 className="text-xl font-bold flex items-center">
            <svg
              className="w-5 h-5 mr-1 hidden sm:inline-block"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              ></path>
            </svg>
            TaskBuddy
          </h1>

          {/* User Profile and Notifications */}
          <div className="flex items-center space-x-3">
            {/* Notification Button */}
            <div className="hidden sm:block">
              <div className="relative">
                <button
                  onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
                  className="relative inline-flex items-center justify-center p-2 text-gray-600 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-100"
                  title="Task Notifications"
                >
                  {/* Bell Icon - More prominent */}
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                  </svg>
                  
                  {/* Notification Badge */}
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse border-2 border-white">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </button>
                
                {/* Notification Panel */}
                <NotificationPanel
                  isOpen={isNotificationPanelOpen}
                  onClose={() => setIsNotificationPanelOpen(false)}
                />
              </div>
            </div>
            
            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="sm:hidden"
              >
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt="User"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-600 text-xs">
                      {userName?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </button>
                          {/* Profile Menu (Mobile Only) */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 sm:hidden">
                {/* Notification Button in Mobile Menu */}
                <button
                  onClick={() => {
                    setIsNotificationPanelOpen(true);
                    setShowProfileMenu(false);
                  }}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                  </svg>
                  Notifications
                  {pendingCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Logout
                </button>
              </div>
            )}
              {/* Desktop View: Show username only */}
              <div className="hidden sm:flex items-center space-x-2">
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt="User"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-600 text-xs">
                      {userName?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <p className="text-gray-600 text-sm">{userName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Second Line: List and Board Buttons (Desktop Only) and Logout Button (Desktop Only) */}
        <div className="flex items-center justify-between">
          {/* List and Board Buttons (Desktop Only) */}
          <div className="flex items-center space-x-3 hidden sm:flex">
            <button
              onClick={() => navigate('/home')}
              className="px-3 py-1 bg-gray-200 rounded-md text-sm"
            >
              List
            </button>
            <button
              onClick={() => navigate('/board')}
              className="px-3 py-1 bg-gray-200 rounded-md text-sm"
            >
              Board
            </button>
          </div>

          {/* Logout Button (Desktop Only) */}
          <button
            onClick={handleLogout}
            className="hidden sm:block bg-gray-200 px-3 py-1 rounded-md text-sm"
          >
            Logout
          </button>

          {/* Filter Section (Mobile Only) */}
          <div className="flex items-center space-x-1 text-gray-500 text-sm sm:hidden">
            <p>Filter by:</p>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="p-1 rounded border border-gray-300 text-gray-500 text-sm"
            >
              <option value="All" disabled hidden>Category</option>
              <option value="All">All</option>
              <option value="Work">Work</option>
              <option value="Personal">Personal</option>
            </select>
            <select
              value={filterDueDate}
              onChange={(e) => setFilterDueDate(e.target.value)}
              className="p-1 rounded border border-gray-300 text-gray-500 text-sm"
            >
              <option value="All" disabled hidden>Due Date</option>
              <option value="All">All</option>
              <option value="Today">Today</option>
              <option value="30 Dec, 2024">30 Dec, 2024</option>
              <option value="31 Dec, 2024">31 Dec, 2024</option>
              <option value="25 Dec, 2024">25 Dec, 2024</option>
            </select>
          </div>
        </div>

        {/* Third Line: Filters (Desktop Only) and Search/Add Task */}
        <div className="flex items-center justify-between space-x-3 sm:space-x-4">
          {/* Filter Section (Desktop Only) */}
          <div className="hidden sm:flex items-center space-x-1 text-gray-500 text-sm">
            <p>Filter by:</p>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="p-1 rounded border border-gray-300 text-gray-500 text-sm"
            >
              <option value="All" disabled hidden>Category</option>
              <option value="All">All</option>
              <option value="Work">Work</option>
              <option value="Personal">Personal</option>
            </select>
            <select
              value={filterDueDate}
              onChange={(e) => setFilterDueDate(e.target.value)}
              className="p-1 rounded border border-gray-300 text-gray-500 text-sm"
            >
              <option value="All" disabled hidden>Due Date</option>
              <option value="All">All</option>
              <option value="Today">Today</option>
              <option value="30 Dec, 2024">30 Dec, 2024</option>
              <option value="31 Dec, 2024">31 Dec, 2024</option>
              <option value="25 Dec, 2024">25 Dec, 2024</option>
            </select>
          </div>

          {/* Search and Add Task */}
          <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="p-1 rounded-full border border-gray-300 w-full text-sm sm:pl-8"
              />
              {/* Search icon and clear button (Desktop Only) */}
              <svg
                className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hidden sm:block"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hidden sm:block"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                </button>
              )}
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="bg-[#7B1984] text-white px-3 py-1 rounded-md text-sm uppercase"
            >
              Add Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;