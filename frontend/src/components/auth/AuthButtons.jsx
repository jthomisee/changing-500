import React from 'react';

const AuthButtons = ({
  currentUser,
  isAdmin,
  onUserLogout,
  onShowUserAuth,
}) => {
  if (currentUser) {
    const userDisplayName = currentUser.firstName
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : 'User';
    const bgColor = isAdmin ? 'bg-green-100' : 'bg-blue-100';
    const textColor = isAdmin ? 'text-green-700' : 'text-blue-700';
    const buttonColor = isAdmin
      ? 'text-green-600 hover:text-green-800'
      : 'text-blue-600 hover:text-blue-800';
    const adminBadge = isAdmin ? ' (Admin)' : '';

    return (
      <div
        className={`flex items-center gap-2 ${bgColor} px-3 py-1 rounded-full`}
      >
        <span className={`${textColor} text-sm font-medium`}>
          {userDisplayName}
          {adminBadge}
        </span>
        <button
          onClick={onUserLogout}
          className={`${buttonColor} text-sm underline`}
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={onShowUserAuth}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
      >
        Login / Register
      </button>
    </div>
  );
};

export default AuthButtons;
