// UI Constants and Configuration Values

// Default values
export const DEFAULT_VALUES = {
  BUYIN_AMOUNT: 20,
  TIMEZONE: 'America/New_York',
  CURRENCY: 'USD',
  CURRENCY_SYMBOL: '$'
};

// UI Text Constants
export const UI_TEXT = {
  // App title
  APP_TITLE: 'Changing 500',

  // Authentication messages
  AUTH: {
    LOGIN_REGISTER: 'Login / Register',
    LOGOUT: 'Logout',
    MISSING_FIELDS: 'Please fill in all required fields',
    EMAIL_OR_PHONE_REQUIRED: 'Please provide either an email address or phone number',
    PASSWORDS_MISMATCH: 'Passwords do not match',
    PASSWORD_TOO_SHORT: 'Password must be at least 6 characters long',
    MISSING_CREDENTIALS: 'Please enter username (email or phone) and password',
    REGISTRATION_SUCCESS_MANUAL: 'Registration successful! Please login manually.',
    REGISTRATION_FAILED: 'Registration failed',
    LOGIN_FAILED: 'Login failed'
  },

  // Game management
  GAMES: {
    ADD_NEW_GAME: 'Add New Game',
    EDIT_GAME: 'Edit Game',
    SAVE_GAME: 'Save Game',
    UPDATE_GAME: 'Update Game',
    DELETE_GAME_CONFIRM: 'Are you sure you want to delete this game? This action cannot be undone.',
    SELECT_GROUP_FIRST: 'Please select a group first',
    FUTURE_GAME_NOTICE: 'This game will be created as "Scheduled" for RSVP tracking. You can convert it to "Completed" later to add results.',
    SEND_INVITATIONS: 'Send Invitations',
    SEND_RESULTS: 'Send Results',
    NO_GAMES_YET: 'No games recorded yet for',
    ADD_FIRST_GAME: 'Add your first game to get started!',
    SELECT_GROUP_TO_VIEW: 'Select a group to view games',
    SCHEDULED_STATUS: 'Scheduled',
    COMPLETED_STATUS: 'Completed'
  },

  // Leaderboard
  LEADERBOARD: {
    TITLE: 'Group Leaderboard',
    LOADING: 'Loading standings...',
    NO_GAMES_FOUND: 'No games found for this group. Add some games to see standings!',
    RANK: 'Rank',
    PLAYER: 'Player',
    POINTS: 'Points',
    GAMES: 'Games',
    WIN_RATE: 'Win Rate',
    AVG_POSITION: 'Avg Pos',
    STREAK: 'Streak',
    BEST_HAND_WINS: 'Best Hand Wins',
    TOTAL_WINNINGS: 'Total Winnings',
    P_AND_L: 'P&L',
    PARTICIPATED: 'Participated'
  },

  // Groups
  GROUPS: {
    CREATE_FIRST_GROUP: 'Create Your First Group',
    NO_GROUPS_YET: "You're not a member of any groups yet.",
    CREATE_NEW_GROUP: 'Create New Group',
    GROUP_NAME_REQUIRED: 'Group name is required'
  },

  // Form labels and placeholders
  FORMS: {
    DATE_REQUIRED: 'Date *',
    TIME: 'Time',
    LOCATION: 'Location',
    LOCATION_PLACEHOLDER: 'e.g. Brad\'s House, 123 Main St, Online',
    LOCATION_HELP: 'Optional: Where the game will be played',
    BUYIN_AMOUNT: 'Buy-in Amount ($)',
    BUYIN_HELP: 'Default buy-in amount for this game',
    STATUS: 'Status',
    STATUS_HELP: 'Change to "Completed" to add results and include in leaderboard',
    PLAYER_REQUIRED: 'Player *',
    POSITION: 'Position',
    WINNINGS: 'Winnings ($)',
    REBUYS: 'Rebuys',
    BEST_HAND: 'Best Hand',
    PARTICIPATED: 'Participated',
    WON: 'Won',
    RSVP_STATUS: 'RSVP Status',
    ADD_PLAYER: '+ Add Player',
    REMOVE: 'Remove',
    CANCEL: 'Cancel'
  },

  // RSVP options
  RSVP: {
    YES: 'Yes',
    NO: 'No',
    PENDING: 'Pending'
  },

  // Tooltips and help text
  TOOLTIPS: {
    LOGIN_TO_ADD_GAMES: 'Please login to add games',
    LOGIN_TO_EDIT_GAMES: 'Please login to edit games',
    LOGIN_TO_DELETE_GAMES: 'Please login to delete games',
    LOGIN_TO_SEND_INVITATIONS: 'Please login to send invitations',
    LOGIN_TO_SEND_RESULTS: 'Please login to send results',
    EDIT_GAME: 'Edit game',
    DELETE_GAME: 'Delete game',
    SEND_GAME_INVITATIONS: 'Send game invitations',
    SEND_GAME_RESULTS: 'Send game results'
  },

  // Time and date formatting
  TIME: {
    FUTURE_GAME: 'Future Game:',
    PLAYERS_AND_RSVP: 'Players & RSVP',
    PLAYERS_AND_RESULTS: 'Players & Results'
  }
};

// CSS Classes
export const CSS_CLASSES = {
  // Button styles
  BUTTON: {
    PRIMARY: 'bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium',
    SECONDARY: 'bg-gray-500 hover:bg-gray-600 text-white rounded-lg',
    DANGER: 'bg-red-500 hover:bg-red-600 text-white rounded-lg',
    SUCCESS: 'bg-green-600 hover:bg-green-700 text-white rounded-lg',
    DISABLED: 'bg-gray-400 text-gray-200 cursor-not-allowed'
  },

  // Status badges
  STATUS: {
    SCHEDULED: 'bg-blue-100 text-blue-800 text-xs rounded-full',
    COMPLETED: 'bg-green-100 text-green-800 text-xs rounded-full'
  },

  // RSVP status styles
  RSVP: {
    YES: 'bg-green-100 text-green-800',
    NO: 'bg-red-100 text-red-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    DEFAULT: 'bg-gray-100 text-gray-800'
  },

  // Result row colors
  RESULT_ROWS: {
    FIRST_PLACE: 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-b border-gray-200 last:border-b-0',
    SECOND_PLACE: 'bg-gradient-to-r from-slate-200 to-slate-100 border-b border-gray-200 last:border-b-0',
    DEFAULT: 'border-b border-gray-200 last:border-b-0'
  },

  // Leaderboard colors
  LEADERBOARD: {
    FIRST_PLACE: 'bg-gradient-to-r from-yellow-100 to-yellow-50 hover:from-yellow-200 hover:to-yellow-100',
    SECOND_PLACE: 'bg-gradient-to-r from-slate-200 to-slate-100 hover:from-slate-300 hover:to-slate-200',
    DEFAULT: 'hover:bg-gray-50',
    STICKY_FIRST: 'bg-gradient-to-r from-yellow-100 to-yellow-50',
    STICKY_SECOND: 'bg-gradient-to-r from-slate-200 to-slate-100',
    STICKY_DEFAULT: 'bg-white'
  },

  // Card colors (mobile)
  CARDS: {
    FIRST_PLACE: 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-200',
    SECOND_PLACE: 'bg-gradient-to-r from-slate-200 to-slate-100 border-slate-300',
    DEFAULT: 'bg-white border-gray-200'
  },

  // Text colors
  TEXT: {
    POSITIVE: 'text-green-600',
    NEGATIVE: 'text-red-600',
    POINTS: 'text-blue-600',
    STREAK_WIN: 'text-green-600',
    STREAK_LOSS: 'text-red-600',
    BEST_HAND: 'text-purple-600'
  }
};

// Validation rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  BUYIN_MIN: 1,
  BUYIN_MAX: 1000,
  POSITION_MIN: 1
};

// API endpoints (if needed)
export const API_ENDPOINTS = {
  // Add API endpoint constants if needed
};

// Feature flags
export const FEATURES = {
  ENABLE_SMS_NOTIFICATIONS: true,
  ENABLE_EMAIL_NOTIFICATIONS: true,
  ENABLE_BEST_HAND_TRACKING: true
};