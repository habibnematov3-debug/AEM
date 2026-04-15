const translations = {
  en: {
    common: {
      appName: 'AEM',
      auth: 'Auth',
      students: 'Students',
      organizer: 'Organizer',
      events: 'Events',
      myEvents: 'My Events',
      adminPanel: 'Admin Panel',
      users: 'Users',
      search: 'Search',
      status: 'Status',
      activity: 'Activity',
      email: 'Email',
      password: 'Password',
      fullName: 'Full Name',
      show: 'Show',
      hide: 'Hide',
      cancel: 'Cancel',
      close: 'Close',
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      signOut: 'Sign Out',
      signingOut: 'Signing out...',
      loadingProfileTitle: 'Loading profile...',
      loadingProfileDescription: 'Checking your account session.',
      skipToContent: 'Skip to main content',
      loadingAccessTitle: 'Checking access...',
      loadingAccessDescription: 'Verifying permissions for this page.',
      noEmail: 'No email available',
      role: 'Role',
      createdEvents: 'Created Events',
      joinedEvents: 'Joined Events',
      memberSince: 'Member Since',
      date: 'Date',
      startTime: 'Start Time',
      endTime: 'End Time',
      location: 'Location',
      category: 'Category',
      theme: 'Theme',
      language: 'Interface Language',
      notifications: 'Email Notifications',
      profileImageUrl: 'Profile Image URL',
      removePhoto: 'Remove Photo',
      retry: 'Retry',
      defaultStudent: 'User',
      unknownOrganizer: 'Unknown organizer',
      general: 'General',
      tbd: 'TBD',
    },
    header: {
      brandEyebrow: 'Ajou Event Manager',
      searchLabel: 'Search events',
      searchPlaceholder: 'Search events...',
      pendingAdminBadge: '{count} pending events',
      profile: 'Profile',
      notifications: 'Notifications',
      notificationsSubtitle: 'Recent updates and reminder messages.',
      notificationsLoading: 'Loading notifications...',
      notificationsEmpty: 'No notifications yet.',
      markAllRead: 'Mark all read',
    },
    auth: {
      heroEyebrow: 'Academic Event Manager',
      heroTitle: 'One place for student events, organizers, and campus activity.',
      heroDescription:
        'AEM helps your university community discover events faster and manage them with less friction.',
      discoverTitle: 'Discover',
      discoverDescription: 'Browse upcoming university events in a clean, centralized space.',
      manageTitle: 'Manage',
      manageDescription: 'Create, edit, and organize events with a simple dashboard workflow.',
      participateTitle: 'Participate',
      participateDescription: 'Keep sign-in and event activity tied to each user account.',
      signinEyebrow: 'Welcome Back',
      signinTitle: 'Sign in to your AEM account',
      signinHelper: 'Access university events, your activity, and organizer tools from one place.',
      signinSubmit: 'Sign In',
      signinSubmitting: 'Signing In...',
      signinFooterPrompt: "Don't have an account?",
      signinFooterAction: 'Create one',
      signupEyebrow: 'Create Account',
      signupTitle: 'Join AEM and get started',
      signupHelper: 'Use your university email to discover events, participate, or manage your own.',
      signupSubmit: 'Create Account',
      signupSubmitting: 'Creating Account...',
      signupFooterPrompt: 'Already have an account?',
      signupFooterAction: 'Sign in',
      assistSecure: 'Secure access',
      assistFast: 'Quick sign-up',
      assistPersonal: 'Your own profile',
      passwordPlaceholder: 'Enter your password',
      passwordCreatePlaceholder: 'Create a secure password',
      confirmPasswordLabel: 'Confirm Password',
      confirmPasswordPlaceholder: 'Repeat your password',
      confirmPasswordHint: 'Repeat the same password to avoid typos.',
      passwordMatch: 'Passwords match.',
      passwordMismatch: 'Passwords do not match.',
      passwordTooShort: 'Password must be at least 8 characters long.',
      fullNameRequired: 'Please enter your full name.',
      passwordRuleLength: 'At least 8 characters',
      passwordRuleLetter: 'Contains letters',
      passwordRuleNumber: 'Contains a number',
      passwordStrengthWeak: 'Weak password',
      passwordStrengthGood: 'Good password',
      passwordStrengthStrong: 'Strong password',
      fullNamePlaceholder: 'Your full name',
      emailPlaceholder: 'your.name@ajou.uz',
      authModeLabel: 'Authentication mode',
      accountCreated: 'Account created successfully. Sign in to continue.',
      welcomeBack: 'Welcome back, {name}. Redirecting...',
      googleButton: 'Continue with Google',
      googleDivider: 'Or continue with Google',
      googleLoading: 'Preparing Google sign-in...',
      googleFallback: 'Use email sign-in if Google is unavailable in this environment.',
      googleUnavailable: 'Google sign-in is not available right now. Please try again later.',
    },
    students: {
      welcome: 'Welcome, {name}',
      title: 'Upcoming Events',
      subtitle: 'Discover and join exciting events happening at your university',
      summary: {
        approved: 'Approved Events',
        joined: 'Joined Events',
        upcoming: 'Upcoming Soon',
        categories: 'Categories',
      },
      emptyTitle: 'No events found',
      emptyDescription: 'Try another keyword in the search bar.',
      emptyNoEventsTitle: 'No published events yet',
      emptyNoEventsDescription:
        'Check back soon — new events will appear here when organizers publish them.',
      emptyFilterTitle: 'No matching events',
      emptyFilterDescription: 'Try a different search or clear the search bar to see all events.',
      clearSearch: 'Clear search',
      recommendationsTitle: 'Recommended for You',
      recommendationsLoadError: 'Could not load recommendations right now. Please try again shortly.',
      noRecommendations: 'No recommendations available yet. Explore events to get personalized suggestions!',
    },
    joinedEventsPage: {
      title: 'My Joined Events',
      subtitle: 'Track the events you are attending and manage your participation.',
      loadError: 'Could not load your joined events.',
      cancelSuccess: 'Participation cancelled successfully.',
      cancelError: 'Could not cancel participation.',
      loadingTitle: 'Loading joined events...',
      loadingDescription: 'Fetching your latest participation activity from the backend.',
      emptyTitle: 'No joined events yet',
      emptyDescription: 'Join an approved event to see it appear here.',
      cancelling: 'Cancelling...',
      cancelParticipation: 'Cancel Participation',
      joinedOn: 'Joined on {date}',
      waitlistedOn: 'Waitlisted on {date}',
      leaveWaitlist: 'Leave Waitlist',
      filters: {
        all: 'All',
        upcoming: 'Upcoming',
        inProgress: 'In Progress',
        finished: 'Finished',
      },
      summary: {
        total: 'Joined Events',
        upcoming: 'Upcoming',
        inProgress: 'In Progress',
        finished: 'Finished',
      },
    },
    organizerPage: {
      eyebrow: 'Organizer workspace',
      title: 'My Events',
      subtitle: "Manage and view the events you've created",
      createEvent: 'Create Event',
      reviewSummary: 'Track which events are still waiting for approval and which are already public.',
      summary: {
        pending: 'Pending Review',
        approved: 'Approved',
        rejected: 'Rejected',
        upcoming: 'Upcoming',
        inProgress: 'In Progress',
        finished: 'Finished',
      },
      createdSuccess: 'Event created successfully.',
      updatedSuccess: 'Event updated successfully.',
      deletedSuccess: 'Event deleted successfully.',
      createError: 'Could not create the event.',
      updateError: 'Could not update the event.',
      deleteError: 'Could not delete the event.',
      noEventsTitle: 'You have no events yet',
      noEventsDescription: 'Create your first event to start managing it here',
      noResultsTitle: 'No events found',
      noResultsDescription: 'Try another keyword in the search bar.',
      deleteEyebrow: 'Delete event',
      deleteTitle: 'Are you sure you want to delete this event?',
      deleteDescription:
        '{title} will be removed from My Events, the students page, and the details page.',
      deleting: 'Deleting...',
      delete: 'Delete',
      statusSummary: {
        pending: 'Pending Review',
        approved: 'Approved',
        rejected: 'Rejected',
      },
      statuses: {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
      },
      statusMessages: {
        pending: 'Waiting for admin review. This event is hidden from students until approval.',
        approved: 'Visible to students on the main events page.',
        rejected: 'Rejected by admin. Edit the event and submit an improved version if needed.',
      },
    },
    adminPage: {
      eyebrow: 'Platform control',
      title: 'Admin Dashboard',
      subtitle: 'Review pending event submissions and manage platform visibility, {name}.',
      manageUsers: 'Manage Users',
      sendReminders: 'Send Reminders',
      sendingReminders: 'Sending...',
      remindersSuccess: 'Reminders sent: {count}.',
      remindersError: 'Could not send reminders.',
      loadError: 'Could not load the admin dashboard.',
      approveSuccess: 'Event approved successfully.',
      rejectSuccess: 'Event rejected successfully.',
      moderationError: 'Could not update the moderation status.',
      moderationEyebrow: 'Moderation queue',
      moderationTitle: 'Review submitted events',
      pendingAlert: '{count} pending now',
      searchPlaceholder: 'Search events, organizer, or location...',
      recentEventsTitle: 'Latest created events',
      recentUsersTitle: 'Newest users',
      recentActivityTitle: 'Recent joins',
      noRecentEvents: 'No recent events yet.',
      noRecentUsers: 'No recent users yet.',
      noRecentActivity: 'No recent participations yet.',
      loadingTitle: 'Loading admin data...',
      loadingDescription: 'Fetching the latest dashboard stats and moderation queue.',
      emptyTitle: 'No events match this filter',
      emptyDescription: 'Try another moderation filter or check back later.',
      approve: 'Approve',
      reject: 'Reject',
      delete: 'Delete',
      deleteSelected: 'Delete selected ({count})',
      deleting: 'Deleting...',
      deleteSuccess: 'Event deleted successfully.',
      deleteSelectedSuccess: '{count} events deleted successfully.',
      deleteError: 'Could not delete the event.',
      deleteSelectedError: 'Could not delete selected events.',
      deleteConfirm: 'Are you sure you want to delete this event? This action cannot be undone.',
      deleteSelectedConfirm: 'Delete {count} selected events? This cannot be undone.',
      selectAll: 'Select all',
      selectEvent: 'Select event',
      moderating: 'Updating...',
      filters: {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        all: 'All',
      },
      statuses: {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
      },
      stats: {
        users: 'Users',
        events: 'Events',
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        inProgress: 'In Progress',
        finished: 'Finished',
        waitlisted: 'Waitlisted',
        attended: 'Attended',
        noShows: 'No-shows',
      },
    },
    adminUsersPage: {
      eyebrow: 'User management',
      title: 'Admin Users',
      subtitle: 'Review accounts, assign roles, and control platform access.',
      ownerMode: 'You are signed in as the owner account. Only you can grant or remove admin access.',
      ownerOnlyHint: 'Only the owner account can grant or remove admin access.',
      backToDashboard: 'Back to Dashboard',
      searchPlaceholder: 'Search by name or email...',
      loadError: 'Could not load the users list.',
      updateError: 'Could not update this user.',
      roleUpdated: 'User role updated successfully.',
      statusUpdated: 'User access updated successfully.',
      loadingTitle: 'Loading users...',
      loadingDescription: 'Fetching the latest admin user data.',
      emptyTitle: 'No users match this filter',
      emptyDescription: 'Try another role filter or create a new account first.',
      roleLabel: 'Role',
      activityLabel: 'Access',
      memberSince: 'Member Since',
      lastActive: 'Last Active',
      neverSeen: 'Never seen',
      createdEvents: 'Created Events',
      joinedEvents: 'Joined Events',
      updateRole: 'Set as {role}',
      activate: 'Activate',
      deactivate: 'Deactivate',
      updating: 'Updating...',
      roleFilters: {
        all: 'All users',
        admin: 'Admins',
        student: 'Users',
      },
      activityFilters: {
        all: 'All access',
        active: 'Active',
        inactive: 'Inactive',
      },
      roles: {
        admin: 'Admin',
        student: 'User',
      },
      owner: 'Owner',
      ownerAccount: 'Owner Account',
      promoteAdmin: 'Promote to Admin',
      removeAdmin: 'Remove Admin Access',
      activity: {
        active: 'Active',
        inactive: 'Inactive',
      },
      presence: {
        online: 'Online now',
        offline: 'Offline',
      },
    },
    profile: {
      accountOverview: 'Account overview',
      personalInfo: 'Personal Info',
      profileSettings: 'Profile settings',
      whatYouCanDo: 'What you can do here',
      profileUpdated: 'Profile updated successfully.',
      photoUploaded: 'Photo uploaded. Click Save Changes to update your profile.',
      uploadPhotoError: 'Could not upload the profile photo.',
      updateProfileError: 'Could not update the profile.',
      aboutNote:
        'Uploaded photos are stored outside your database. Only the final public URL is saved.',
      itemName: 'Update your full name',
      itemPhoto: 'Set a profile photo from a direct image URL or Supabase upload',
      itemTheme: 'Switch between light and dark mode',
      itemLanguage: 'Choose your preferred interface language',
      itemNotifications: 'Control whether notifications are enabled',
      photoHintConfigured:
        'You can paste a direct image URL or upload a photo from your device to Supabase Storage.',
      photoHintFallback:
        'Supabase upload is not configured yet. You can still use a direct image URL.',
      uploadFromDevice: 'Upload from Device',
      uploading: 'Uploading...',
      light: 'Light',
      dark: 'Dark',
      english: 'English',
      russian: 'Russian',
      uzbek: 'Uzbek',
    },
    onboarding: {
      eyebrow: 'Quick Tour',
      stepCounter: 'Step {current} of {total}',
      tryLabel: 'Try this',
      skip: 'Skip tour',
      back: 'Back',
      next: 'Next',
      finish: 'Finish',
      student: {
        steps: {
          overview: {
            title: 'This is your event feed',
            description:
              'Start here to discover approved university events, open details, and join the ones you want to attend.',
            instruction: 'Scroll this page and open any event card to see full details.',
          },
          search: {
            title: 'Find events faster',
            description:
              'Use search to filter by title, location, or category when you want something specific.',
            instruction: 'Type a keyword or event category into this search bar.',
          },
          catalog: {
            title: 'Browse live event cards',
            description:
              'Each card opens full event details where you can like the event, join it, or see capacity and waitlist status.',
            instruction: 'Click this event card to open the full event page.',
          },
          joined: {
            title: 'Track your joined events',
            description:
              'Open My Joined Events to review your registrations, leave a waitlist, and access your personal QR check-in pass.',
            instruction: 'Review your registered events here and manage your participation.',
          },
          organizer: {
            title: 'Create and run your own events',
            description:
              'My Events is your organizer workspace for creating events, editing them, and later managing participants, waitlists, and check-in.',
            instruction: 'Use this button to create a new event as an organizer.',
          },
        },
      },
      admin: {
        steps: {
          overview: {
            title: 'Platform Dashboard',
            description:
              'Quickly see users, events, pending approvals, and attendance metrics. Use this dashboard as your central operation hub every time you log in.',
            instruction: 'Look at the stat cards below to understand current platform activity.',
          },
          stats: {
            title: 'Monitor Key Metrics',
            description:
              'The 10 cards show total users, events, pending reviews, attendance, and no-show rates. Check the pending count first—that\'s your main action item.',
            instruction: 'Scan across these cards to spot what needs your attention.',
          },
          users: {
            title: 'Manage Admin Team',
            description:
              'Switch user roles, activate/deactivate accounts, and control who has admin access to this panel.',
            instruction: 'Click Manage Users to adjust permissions.',
          },
          moderation: {
            title: 'Review Event Submissions',
            description:
              'New events appear here as Pending. Review titles, descriptions, and details, then Approve to publish or Reject to hide.',
            instruction: 'Use the filter tabs and search to find submissions to review.',
          },
        },
      },
    },
    eventDetails: {
      backToEvents: 'Back to Events',
      loadingTitle: 'Loading event...',
      loadingDescription: 'Fetching the latest event details from the backend.',
      notFoundTitle: 'Event not found',
      notFoundDescription: 'The event you are trying to open does not exist.',
      errorTitle: 'Could not load event',
      participate: 'Participate',
      joining: 'Joining...',
      joined: 'Joined',
      likeAction: 'Like',
      likedAction: 'Liked',
      updatingLike: 'Saving...',
      likesCount: '{count} likes',
      creatorNote: 'You created this event.',
      pendingJoinNote: 'Participation opens after this event is approved.',
      signInToJoin: 'Sign in to join this event.',
      joinError: 'Could not join this event.',
      likeError: 'Could not update your like.',
      cancelParticipation: 'Cancel Participation',
      cancellingParticipation: 'Cancelling...',
      cancelled: 'Participation cancelled.',
      cancelError: 'Could not cancel this participation.',
      participantsTitle: 'Participants',
      participantsSubtitle: 'People registered for this event.',
      loadingParticipants: 'Loading participants...',
      checkIn: 'Check in',
      checkingIn: 'Checking in...',
      checkedIn: 'Checked in',
      waitlisted: 'Waitlisted',
      waitlistedNote: 'You are currently on the waitlist for this event.',
      waitlistPositionInfo: 'Your waitlist position: #{count}',
      openScanner: 'Open Scanner',
      checkInPassTitle: 'My Check-in Pass',
      checkInPassDescription: 'Show this QR code to the organizer at the event entrance.',
      checkInPassCheckedIn: 'Your attendance has already been recorded for this event.',
      checkInPassLoading: 'Loading your check-in pass...',
      checkInPassError: 'Could not load your check-in pass.',
      checkInPassCopy: 'Copy Link',
      checkInPassCopied: 'Link Copied',
      checkInPassCopyError: 'Copy Failed',
      checkInPassHint: 'If scanning fails, the organizer can use the copied link or token manually.',
      checkInPassQrLabel: 'Personal event check-in QR code',
      checkInPassQrError: 'The QR code preview could not be generated, but the check-in link is still available.',
      checkInSuccess: 'Participant checked in successfully.',
      checkInError: 'Could not check in participant.',
      participantsLoadError: 'Could not load the participant list.',
      noParticipants: 'No participants yet.',
      joinedInfo: '{count} students joined',
      capacityInfo: 'Capacity: {count}',
      waitlistInfo: '{count} waitlisted',
      checkedInInfo: '{count} attended',
      noShowInfo: '{count} no-show',
    },
    eventCard: {
      yourEvent: 'Your Event',
      joined: 'Joined',
      likesCount: '{count} likes',
      edit: 'Edit',
      view: 'View',
      delete: 'Delete',
    },
    eventForm: {
      newEvent: 'New event',
      existingEvent: 'Existing event',
      createTitle: 'Create Event',
      editTitle: 'Edit Event',
      createSubmit: 'Create Event',
      editSubmit: 'Save Changes',
      cancelEdit: 'Cancel edit',
      close: 'Close',
      title: 'Event Title',
      description: 'Description',
      date: 'Date',
      startTime: 'Start Time',
      endTime: 'End Time',
      location: 'Location',
      imageUrl: 'Image URL',
      uploadImage: 'Upload Image',
      removeImage: 'Remove Image',
      imageHelperConfigured:
        'Paste a direct image URL, upload from your device, or leave this empty to use the default event image.',
      imageHelperFallback:
        'Use a direct image URL, or leave this empty to use the default event image.',
      defaultPreview: 'Default event image preview',
      currentPreview: 'Current event image preview',
      category: 'Category',
      capacity: 'Capacity',
      capacityPlaceholder: 'Enter maximum attendees (optional)',
      optionalCategory: 'Optional category',
      enterTitle: 'Enter event title',
      describeEvent: 'Describe the event',
      enterLocation: 'Enter location',
      optionalImageUrl: 'Optional image URL',
      saving: 'Saving...',
      uploading: 'Uploading...',
      errors: {
        title: 'Event title is required.',
        description: 'Description is required.',
        date: 'Date is required.',
        startTime: 'Start time is required.',
        endTime: 'End time is required.',
        location: 'Location is required.',
        capacity: 'Capacity must be a whole number of at least 1.',
        endTimeOrder: 'End time must be later than start time.',
        uploadImage: 'Could not upload the event image.',
      },
    },
    checkInScan: {
      eyebrow: 'QR Check-in',
      title: 'Scan Attendee QR Codes',
      subtitle: 'Use the camera or paste a QR link/token to check people into {title}.',
      loadError: 'Could not load this event.',
      loadingTitle: 'Loading scanner...',
      loadingDescription: 'Fetching the event details and preparing the check-in tools.',
      notFoundTitle: 'Event not found',
      notFoundDescription: 'This event could not be opened for QR check-in.',
      errorTitle: 'Could not open the scanner',
      forbiddenTitle: 'Check-in access required',
      forbiddenDescription: 'Only this event organizer or an admin can scan attendee QR codes.',
      backToEvent: 'Back to Event',
      backToEvents: 'Back to Events',
      cameraTitle: 'Camera Scanner',
      cameraDescription: 'Point the camera at an attendee QR code to open the check-in result page.',
      startScanner: 'Start Scanner',
      stopScanner: 'Stop Scanner',
      cameraPlaceholderTitle: 'Camera ready',
      cameraPlaceholderDescription: 'Start the scanner when you are ready to check attendees in.',
      cameraHint: 'Some browsers do not support direct QR detection. The manual field remains available as a fallback.',
      scanningHint: 'Hold the attendee QR code steady inside the camera frame.',
      cameraUnsupported: 'This browser does not support direct QR scanning. Use the manual field below instead.',
      cameraError: 'Could not access the camera. Check permissions or use the manual field below.',
      invalidQr: 'This QR code could not be recognized as a valid check-in pass.',
      manualTitle: 'Manual Check-in',
      manualDescription: 'Paste the QR link or raw token if camera scanning is unavailable.',
      manualLabel: 'QR link or token',
      manualPlaceholder: 'Paste the attendee QR URL or token here...',
      manualSubmit: 'Verify Check-in',
      manualError: 'Paste a valid check-in link or token first.',
    },
    checkInResult: {
      eyebrow: 'QR Check-in',
      title: 'Check-in Result',
      subtitle: 'This screen confirms whether the scanned attendee was checked in successfully.',
      backToScanner: 'Back to Scanner',
      loadingTitle: 'Checking in attendee...',
      loadingDescription: 'Validating the QR token and recording attendance.',
      missingTitle: 'Missing check-in token',
      missingDescription: 'Open this page from the scanner or paste a valid QR link/token first.',
      errorBadge: 'Check-in Failed',
      errorTitle: 'Could not complete this check-in',
      errorDescription: 'The QR token could not be validated.',
      successBadge: 'Checked In',
      successTitle: 'Attendee Checked In',
      metaEvent: 'Event',
      metaStatus: 'Status',
      metaTime: 'Recorded At',
    },
  },
  ru: {
    common: {
      appName: 'AEM',
      auth: 'Авторизация',
      students: 'Студенты',
      organizer: 'Организатор',
      events: 'События',
      myEvents: 'Мои события',
      email: 'Email',
      password: 'Пароль',
      fullName: 'Полное имя',
      show: 'Показать',
      hide: 'Скрыть',
      cancel: 'Отмена',
      close: 'Закрыть',
      saveChanges: 'Сохранить изменения',
      saving: 'Сохранение...',
      signOut: 'Выйти',
      signingOut: 'Выход...',
      loadingProfileTitle: 'Загрузка профиля...',
      loadingProfileDescription: 'Проверяем вашу сессию аккаунта.',
      skipToContent: 'Перейти к основному содержимому',
      loadingAccessTitle: 'Проверка доступа...',
      loadingAccessDescription: 'Проверяем права для этой страницы.',
      noEmail: 'Email недоступен',
      role: 'Роль',
      createdEvents: 'Создано событий',
      joinedEvents: 'Участий',
      memberSince: 'С нами с',
      date: 'Дата',
      startTime: 'Время начала',
      endTime: 'Время окончания',
      location: 'Локация',
      category: 'Категория',
      theme: 'Тема',
      language: 'Язык интерфейса',
      notifications: 'Email-уведомления',
      profileImageUrl: 'Ссылка на фото профиля',
      removePhoto: 'Удалить фото',
      defaultStudent: 'Студент',
      unknownOrganizer: 'Неизвестный организатор',
      general: 'Общее',
      tbd: 'Будет уточнено',
    },
    header: {
      brandEyebrow: 'Менеджер событий Ajou',
      searchLabel: 'Поиск событий',
      searchPlaceholder: 'Поиск событий...',
      profile: 'Профиль',
    },
    auth: {
      heroEyebrow: 'Academic Event Manager',
      heroTitle: 'Единое место для студенческих событий, организаторов и кампусной активности.',
      heroDescription:
        'AEM помогает университетскому сообществу быстрее находить события и управлять ими с меньшими усилиями.',
      discoverTitle: 'Находить',
      discoverDescription: 'Смотрите ближайшие университетские события в одном понятном пространстве.',
      manageTitle: 'Управлять',
      manageDescription: 'Создавайте, редактируйте и организуйте события через простой дашборд.',
      participateTitle: 'Участвовать',
      participateDescription: 'Привяжите вход и активность на событиях к каждому аккаунту пользователя.',
      signinEyebrow: 'С возвращением',
      signinTitle: 'Вход в AEM',
      signinHelper: 'Доступ к событиям, активности и инструментам организатора.',
      signinSubmit: 'Войти',
      signinSubmitting: 'Вход...',
      signinFooterPrompt: 'Нет аккаунта?',
      signinFooterAction: 'Создать',
      signupEyebrow: 'Создание аккаунта',
      signupTitle: 'Создайте аккаунт AEM',
      signupHelper: 'Используйте университетский email, чтобы находить события и участвовать в них.',
      signupSubmit: 'Создать аккаунт',
      signupSubmitting: 'Создание аккаунта...',
      signupFooterPrompt: 'Уже есть аккаунт?',
      signupFooterAction: 'Войти',
      assistSecure: 'Безопасный вход',
      assistFast: 'Быстрая регистрация',
      assistPersonal: 'Личный профиль',
      passwordPlaceholder: 'Введите пароль',
      passwordCreatePlaceholder: 'Придумайте надежный пароль',
      confirmPasswordLabel: 'Подтвердите пароль',
      confirmPasswordPlaceholder: 'Повторите пароль',
      confirmPasswordHint: 'Повторите тот же пароль, чтобы избежать ошибки.',
      passwordMatch: 'Пароли совпадают.',
      passwordMismatch: 'Пароли не совпадают.',
      passwordTooShort: 'Пароль должен содержать минимум 8 символов.',
      fullNameRequired: 'Пожалуйста, введите полное имя.',
      passwordRuleLength: 'Не менее 8 символов',
      passwordRuleLetter: 'Есть буквы',
      passwordRuleNumber: 'Есть цифра',
      passwordStrengthWeak: 'Слабый пароль',
      passwordStrengthGood: 'Хороший пароль',
      passwordStrengthStrong: 'Надежный пароль',
      fullNamePlaceholder: 'Ваше полное имя',
      emailPlaceholder: 'your.name@ajou.uz',
      authModeLabel: 'Режим авторизации',
      accountCreated: 'Аккаунт успешно создан. Войдите, чтобы продолжить.',
      welcomeBack: 'С возвращением, {name}. Перенаправление...',
    },
    students: {
      welcome: 'Добро пожаловать, {name}',
      title: 'Предстоящие события',
      subtitle: 'Находите и присоединяйтесь к интересным событиям вашего университета',
      summary: {
        approved: 'Одобренных событий',
        joined: 'С участием',
        upcoming: 'Скоро',
        categories: 'Категорий',
      },
      emptyTitle: 'События не найдены',
      emptyDescription: 'Попробуйте другой запрос в строке поиска.',
      emptyNoEventsTitle: 'Пока нет опубликованных событий',
      emptyNoEventsDescription:
        'Загляните позже — здесь появятся новые события, когда организаторы их опубликуют.',
      emptyFilterTitle: 'Нет подходящих событий',
      emptyFilterDescription:
        'Попробуйте другой запрос или очистите строку поиска, чтобы увидеть все события.',
      clearSearch: 'Очистить поиск',
      recommendationsTitle: 'Рекомендовано для вас',
      noRecommendations: 'Рекомендаций пока нет. Исследуйте события, чтобы получить персональные предложения!',
    },
    organizerPage: {
      eyebrow: 'Рабочее пространство организатора',
      title: 'Мои события',
      subtitle: 'Управляйте и просматривайте созданные вами события',
      createEvent: 'Создать событие',
      createdSuccess: 'Событие успешно создано.',
      updatedSuccess: 'Событие успешно обновлено.',
      deletedSuccess: 'Событие успешно удалено.',
      createError: 'Не удалось создать событие.',
      updateError: 'Не удалось обновить событие.',
      deleteError: 'Не удалось удалить событие.',
      noEventsTitle: 'У вас пока нет событий',
      noEventsDescription: 'Создайте первое событие, чтобы управлять им здесь',
      noResultsTitle: 'События не найдены',
      noResultsDescription: 'Попробуйте другой запрос в строке поиска.',
      deleteEyebrow: 'Удаление события',
      deleteTitle: 'Вы уверены, что хотите удалить это событие?',
      deleteDescription: '{title} будет удалено из My Events, страницы студентов и страницы деталей.',
      deleting: 'Удаление...',
      delete: 'Удалить',
    },
    profile: {
      accountOverview: 'Обзор аккаунта',
      personalInfo: 'Личная информация',
      profileSettings: 'Настройки профиля',
      whatYouCanDo: 'Что можно сделать здесь',
      profileUpdated: 'Профиль успешно обновлен.',
      photoUploaded: 'Фото загружено. Нажмите Save Changes, чтобы обновить профиль.',
      uploadPhotoError: 'Не удалось загрузить фото профиля.',
      updateProfileError: 'Не удалось обновить профиль.',
      aboutNote:
        'Загруженные фото хранятся вне базы данных. В базе сохраняется только итоговая публичная ссылка.',
      itemName: 'Обновить полное имя',
      itemPhoto: 'Установить фото профиля по ссылке или через Supabase upload',
      itemTheme: 'Переключать светлую и тёмную тему',
      itemLanguage: 'Выбрать язык интерфейса',
      itemNotifications: 'Управлять email-уведомлениями',
      photoHintConfigured:
        'Можно вставить прямую ссылку на изображение или загрузить фото с устройства в Supabase Storage.',
      photoHintFallback:
        'Supabase upload пока не настроен. Пока можно использовать прямую ссылку на изображение.',
      uploadFromDevice: 'Загрузить с устройства',
      uploading: 'Загрузка...',
      light: 'Светлая',
      dark: 'Тёмная',
      english: 'Английский',
      russian: 'Русский',
      uzbek: 'Узбекский',
    },
    eventDetails: {
      backToEvents: 'Назад к событиям',
      loadingTitle: 'Загрузка события...',
      loadingDescription: 'Получаем актуальные данные события с backend.',
      notFoundTitle: 'Событие не найдено',
      notFoundDescription: 'Событие, которое вы пытаетесь открыть, не существует.',
      errorTitle: 'Не удалось загрузить событие',
      participate: 'Участвовать',
      joining: 'Присоединение...',
      joined: 'Вы участвуете',
      creatorNote: 'Вы создали это событие.',
      signInToJoin: 'Войдите, чтобы участвовать в событии.',
      joinError: 'Не удалось присоединиться к событию.',
    },
    eventCard: {
      yourEvent: 'Ваше событие',
      joined: 'Участвуете',
      edit: 'Редактировать',
      view: 'Открыть',
      delete: 'Удалить',
    },
    eventForm: {
      newEvent: 'Новое событие',
      existingEvent: 'Существующее событие',
      createTitle: 'Создать событие',
      editTitle: 'Редактировать событие',
      createSubmit: 'Создать событие',
      editSubmit: 'Сохранить изменения',
      cancelEdit: 'Отменить редактирование',
      close: 'Закрыть',
      title: 'Название события',
      description: 'Описание',
      date: 'Дата',
      startTime: 'Время начала',
      endTime: 'Время окончания',
      location: 'Локация',
      imageUrl: 'Ссылка на изображение',
      uploadImage: 'Загрузить изображение',
      removeImage: 'Убрать изображение',
      imageHelperConfigured:
        'Вставьте прямую ссылку, загрузите изображение с устройства или оставьте пустым, чтобы использовать стандартную картинку события.',
      imageHelperFallback:
        'Используйте прямую ссылку на изображение или оставьте поле пустым для стандартной картинки.',
      defaultPreview: 'Предпросмотр стандартного изображения события',
      currentPreview: 'Предпросмотр текущего изображения события',
      category: 'Категория',
      optionalCategory: 'Необязательная категория',
      enterTitle: 'Введите название события',
      describeEvent: 'Опишите событие',
      enterLocation: 'Введите локацию',
      optionalImageUrl: 'Необязательная ссылка на изображение',
      saving: 'Сохранение...',
      uploading: 'Загрузка...',
      errors: {
        title: 'Название события обязательно.',
        description: 'Описание обязательно.',
        date: 'Дата обязательна.',
        startTime: 'Время начала обязательно.',
        endTime: 'Время окончания обязательно.',
        location: 'Локация обязательна.',
        endTimeOrder: 'Время окончания должно быть позже времени начала.',
        uploadImage: 'Не удалось загрузить изображение события.',
      },
    },
  },
  uz: {
    common: {
      appName: 'AEM',
      auth: 'Kirish',
      students: 'Talabalar',
      organizer: 'Organizator',
      events: 'Tadbirlar',
      myEvents: 'Mening tadbirlarim',
      email: 'Email',
      password: 'Parol',
      fullName: 'To‘liq ism',
      show: 'Ko‘rsatish',
      hide: 'Yashirish',
      cancel: 'Bekor qilish',
      close: 'Yopish',
      saveChanges: 'O‘zgarishlarni saqlash',
      saving: 'Saqlanmoqda...',
      signOut: 'Chiqish',
      signingOut: 'Chiqilmoqda...',
      loadingProfileTitle: 'Profil yuklanmoqda...',
      loadingProfileDescription: 'Hisob sessiyangiz tekshirilmoqda.',
      skipToContent: 'Asosiy kontentga o‘tish',
      loadingAccessTitle: 'Kirish tekshirilmoqda...',
      loadingAccessDescription: 'Ushbu sahifa uchun ruxsatlar tekshirilmoqda.',
      noEmail: 'Email mavjud emas',
      role: 'Rol',
      createdEvents: 'Yaratilgan tadbirlar',
      joinedEvents: 'Qo‘shilgan tadbirlar',
      memberSince: 'A’zo bo‘lgan sana',
      date: 'Sana',
      startTime: 'Boshlanish vaqti',
      endTime: 'Tugash vaqti',
      location: 'Joylashuv',
      category: 'Kategoriya',
      theme: 'Mavzu',
      language: 'Interfeys tili',
      notifications: 'Email bildirishnomalari',
      profileImageUrl: 'Profil rasmi havolasi',
      removePhoto: 'Rasmni olib tashlash',
      defaultStudent: 'Talaba',
      unknownOrganizer: 'Noma’lum organizator',
      general: 'Umumiy',
      tbd: 'Keyin aniqlanadi',
    },
    header: {
      brandEyebrow: 'Ajou Event Manager',
      searchLabel: 'Tadbirlarni qidirish',
      searchPlaceholder: 'Tadbirlarni qidirish...',
      profile: 'Profil',
    },
    auth: {
      heroEyebrow: 'Academic Event Manager',
      heroTitle: 'Talabalar tadbirlari, organizatorlar va kampus faolligi uchun bitta joy.',
      heroDescription:
        'AEM universitet hamjamiyatiga tadbirlarni tezroq topish va ularni osonroq boshqarishga yordam beradi.',
      discoverTitle: 'Topish',
      discoverDescription: 'Yaqinlashib kelayotgan universitet tadbirlarini bitta qulay joyda ko‘ring.',
      manageTitle: 'Boshqarish',
      manageDescription: 'Oddiy dashboard orqali tadbirlarni yarating, tahrirlang va boshqaring.',
      participateTitle: 'Qatnashish',
      participateDescription: 'Kirish va tadbir faolligini har bir foydalanuvchi akkauntiga bog‘lang.',
      signinEyebrow: 'Qaytganingiz bilan',
      signinTitle: 'AEM ga kirish',
      signinHelper: 'Tadbirlar, faolligingiz va organizator vositalariga bitta joydan kiring.',
      signinSubmit: 'Kirish',
      signinSubmitting: 'Kirilmoqda...',
      signinFooterPrompt: 'Akkauntingiz yo‘qmi?',
      signinFooterAction: 'Yaratish',
      signupEyebrow: 'Akkaunt yaratish',
      signupTitle: 'AEM akkauntini yarating',
      signupHelper: 'Universitet emailingiz bilan tadbirlarni toping, qatnashing yoki o‘zingizning tadbiringizni boshqaring.',
      signupSubmit: 'Akkaunt yaratish',
      signupSubmitting: 'Akkaunt yaratilmoqda...',
      signupFooterPrompt: 'Akkauntingiz bormi?',
      signupFooterAction: 'Kirish',
      assistSecure: 'Xavfsiz kirish',
      assistFast: 'Tez ro‘yxatdan o‘tish',
      assistPersonal: 'Shaxsiy profil',
      passwordPlaceholder: 'Parolingizni kiriting',
      passwordCreatePlaceholder: 'Xavfsiz parol yarating',
      confirmPasswordLabel: 'Parolni tasdiqlang',
      confirmPasswordPlaceholder: 'Parolni qayta kiriting',
      confirmPasswordHint: 'Xatoni oldini olish uchun shu parolni qayta kiriting.',
      passwordMatch: 'Parollar mos keldi.',
      passwordMismatch: 'Parollar mos kelmadi.',
      passwordTooShort: 'Parol kamida 8 ta belgidan iborat bo‘lishi kerak.',
      fullNameRequired: 'Iltimos, to‘liq ismingizni kiriting.',
      passwordRuleLength: 'Kamida 8 ta belgi',
      passwordRuleLetter: 'Harflar bor',
      passwordRuleNumber: 'Raqam bor',
      passwordStrengthWeak: 'Kuchsiz parol',
      passwordStrengthGood: 'Yaxshi parol',
      passwordStrengthStrong: 'Kuchli parol',
      fullNamePlaceholder: 'To‘liq ismingiz',
      emailPlaceholder: 'your.name@ajou.uz',
      authModeLabel: 'Autentifikatsiya rejimi',
      accountCreated: 'Akkaunt muvaffaqiyatli yaratildi. Davom etish uchun tizimga kiring.',
      welcomeBack: 'Xush kelibsiz, {name}. Yo‘naltirilmoqda...',
    },
    students: {
      welcome: 'Xush kelibsiz, {name}',
      title: 'Kelayotgan tadbirlar',
      subtitle: 'Universitetingizdagi qiziqarli tadbirlarni toping va ularga qo‘shiling',
      summary: {
        approved: 'Tasdiqlangan tadbirlar',
        joined: 'Qo‘shilganlar',
        upcoming: 'Tez orada',
        categories: 'Kategoriyalar',
      },
      emptyTitle: 'Tadbirlar topilmadi',
      emptyDescription: 'Qidiruvda boshqa kalit so‘zni sinab ko‘ring.',
      emptyNoEventsTitle: 'Hali e’lon qilingan tadbirlar yo‘q',
      emptyNoEventsDescription:
        'Keyinroq qayta tekshiring — organizatorlar tadbir e’lon qilganda ular shu yerda paydo bo‘ladi.',
      emptyFilterTitle: 'Mos tadbirlar yo‘q',
      emptyFilterDescription:
        'Boshqa so‘z bilan qidiring yoki qidiruvni tozalab, barcha tadbirlarni ko‘ring.',
      clearSearch: 'Qidiruvni tozalash',
      recommendationsTitle: 'Siz uchun tavsiya etilgan',
      noRecommendations: 'Tavsiyalar hali yo‘q. Shaxsiy takliflarni olish uchun tadbirlarni o‘rganing!',
    },
    organizerPage: {
      eyebrow: 'Organizator ish maydoni',
      title: 'Mening tadbirlarim',
      subtitle: 'Yaratgan tadbirlaringizni ko‘ring va boshqaring',
      createEvent: 'Tadbir yaratish',
      createdSuccess: 'Tadbir muvaffaqiyatli yaratildi.',
      updatedSuccess: 'Tadbir muvaffaqiyatli yangilandi.',
      deletedSuccess: 'Tadbir muvaffaqiyatli o‘chirildi.',
      createError: 'Tadbirni yaratib bo‘lmadi.',
      updateError: 'Tadbirni yangilab bo‘lmadi.',
      deleteError: 'Tadbirni o‘chirib bo‘lmadi.',
      noEventsTitle: 'Sizda hali tadbirlar yo‘q',
      noEventsDescription: 'Birinchi tadbiringizni yarating va uni shu yerda boshqaring',
      noResultsTitle: 'Tadbirlar topilmadi',
      noResultsDescription: 'Qidiruvda boshqa kalit so‘zni sinab ko‘ring.',
      deleteEyebrow: 'Tadbirni o‘chirish',
      deleteTitle: 'Haqiqatan ham bu tadbirni o‘chirmoqchimisiz?',
      deleteDescription:
        '{title} My Events, talabalar sahifasi va tafsilotlar sahifasidan olib tashlanadi.',
      deleting: 'O‘chirilmoqda...',
      delete: 'O‘chirish',
    },
    profile: {
      accountOverview: 'Akkaunt ko‘rinishi',
      personalInfo: 'Shaxsiy ma’lumotlar',
      profileSettings: 'Profil sozlamalari',
      whatYouCanDo: 'Bu yerda nimalar qilish mumkin',
      profileUpdated: 'Profil muvaffaqiyatli yangilandi.',
      photoUploaded: 'Rasm yuklandi. Profilni yangilash uchun Save Changes ni bosing.',
      uploadPhotoError: 'Profil rasmini yuklab bo‘lmadi.',
      updateProfileError: 'Profilni yangilab bo‘lmadi.',
      aboutNote:
        'Yuklangan rasmlar ma’lumotlar bazasidan tashqarida saqlanadi. Bazada faqat yakuniy public URL saqlanadi.',
      itemName: 'To‘liq ismingizni yangilash',
      itemPhoto: 'Profil rasmini URL yoki Supabase upload orqali o‘rnatish',
      itemTheme: 'Yorug‘ va qorong‘i mavzuni almashtirish',
      itemLanguage: 'Interfeys tilini tanlash',
      itemNotifications: 'Email bildirishnomalarini boshqarish',
      photoHintConfigured:
        'To‘g‘ridan-to‘g‘ri rasm havolasini kiriting yoki qurilmangizdan Supabase Storage ga yuklang.',
      photoHintFallback:
        'Supabase upload hali sozlanmagan. Hozircha to‘g‘ridan-to‘g‘ri rasm havolasidan foydalanishingiz mumkin.',
      uploadFromDevice: 'Qurilmadan yuklash',
      uploading: 'Yuklanmoqda...',
      light: 'Yorug‘',
      dark: 'Qorong‘i',
      english: 'Inglizcha',
      russian: 'Ruscha',
      uzbek: 'O‘zbekcha',
    },
    eventDetails: {
      backToEvents: 'Tadbirlarga qaytish',
      loadingTitle: 'Tadbir yuklanmoqda...',
      loadingDescription: 'Backend dan eng so‘nggi tadbir ma’lumotlari olinmoqda.',
      notFoundTitle: 'Tadbir topilmadi',
      notFoundDescription: 'Ochmoqchi bo‘lgan tadbiringiz mavjud emas.',
      errorTitle: 'Tadbirni yuklab bo‘lmadi',
      participate: 'Qatnashish',
      joining: 'Qo‘shilmoqda...',
      joined: 'Qo‘shilgan',
      creatorNote: 'Bu tadbirni siz yaratgansiz.',
      signInToJoin: 'Tadbirga qo‘shilish uchun tizimga kiring.',
      joinError: 'Tadbirga qo‘shilib bo‘lmadi.',
    },
    eventCard: {
      yourEvent: 'Sizning tadbiringiz',
      joined: 'Qo‘shilgan',
      edit: 'Tahrirlash',
      view: 'Ko‘rish',
      delete: 'O‘chirish',
    },
    eventForm: {
      newEvent: 'Yangi tadbir',
      existingEvent: 'Mavjud tadbir',
      createTitle: 'Tadbir yaratish',
      editTitle: 'Tadbirni tahrirlash',
      createSubmit: 'Tadbir yaratish',
      editSubmit: 'O‘zgarishlarni saqlash',
      cancelEdit: 'Tahrirni bekor qilish',
      close: 'Yopish',
      title: 'Tadbir nomi',
      description: 'Tavsif',
      date: 'Sana',
      startTime: 'Boshlanish vaqti',
      endTime: 'Tugash vaqti',
      location: 'Joylashuv',
      imageUrl: 'Rasm havolasi',
      uploadImage: 'Rasm yuklash',
      removeImage: 'Rasmni olib tashlash',
      imageHelperConfigured:
        'To‘g‘ridan-to‘g‘ri rasm havolasini kiriting, qurilmangizdan yuklang yoki standart rasm uchun bo‘sh qoldiring.',
      imageHelperFallback:
        'To‘g‘ridan-to‘g‘ri rasm havolasidan foydalaning yoki standart rasm uchun bo‘sh qoldiring.',
      defaultPreview: 'Standart tadbir rasmi preview',
      currentPreview: 'Joriy tadbir rasmi preview',
      category: 'Kategoriya',
      optionalCategory: 'Ixtiyoriy kategoriya',
      enterTitle: 'Tadbir nomini kiriting',
      describeEvent: 'Tadbirni tasvirlab bering',
      enterLocation: 'Joylashuvni kiriting',
      optionalImageUrl: 'Ixtiyoriy rasm havolasi',
      saving: 'Saqlanmoqda...',
      uploading: 'Yuklanmoqda...',
      errors: {
        title: 'Tadbir nomi majburiy.',
        description: 'Tavsif majburiy.',
        date: 'Sana majburiy.',
        startTime: 'Boshlanish vaqti majburiy.',
        endTime: 'Tugash vaqti majburiy.',
        location: 'Joylashuv majburiy.',
        endTimeOrder: 'Tugash vaqti boshlanish vaqtidan keyin bo‘lishi kerak.',
        uploadImage: 'Tadbir rasmini yuklab bo‘lmadi.',
      },
    },
  },
}

translations.ru.students.recommendationsLoadError =
  '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0438\u0438. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0447\u0443\u0442\u044c \u043f\u043e\u0437\u0436\u0435.'
translations.uz.students.recommendationsLoadError =
  'Tavsiyalarni hozir yuklab bolmadi. Birozdan keyin yana urinib koring.'
translations.ru.auth.googleDivider =
  '\u0418\u043b\u0438 \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 Google'
translations.ru.auth.googleButton =
  '\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 Google'
translations.ru.auth.googleLoading =
  '\u041f\u043e\u0434\u0433\u043e\u0442\u0430\u0432\u043b\u0438\u0432\u0430\u0435\u043c \u0432\u0445\u043e\u0434 \u0447\u0435\u0440\u0435\u0437 Google...'
translations.ru.auth.googleFallback =
  '\u0415\u0441\u043b\u0438 Google-\u0432\u0445\u043e\u0434 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0432 \u044d\u0442\u043e\u0439 \u0441\u0440\u0435\u0434\u0435, \u0432\u043e\u0439\u0434\u0438\u0442\u0435 \u043f\u043e email \u0438 \u043f\u0430\u0440\u043e\u043b\u044e.'
translations.ru.auth.googleUnavailable =
  '\u0412\u0445\u043e\u0434 \u0447\u0435\u0440\u0435\u0437 Google \u0441\u0435\u0439\u0447\u0430\u0441 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435.'
translations.uz.auth.googleDivider = 'Yoki Google orqali davom eting'
translations.uz.auth.googleButton = 'Google orqali davom eting'
translations.uz.auth.googleLoading = 'Google orqali kirish tayyorlanmoqda...'
translations.uz.auth.googleFallback =
  'Agar Google orqali kirish bu muhitda mavjud bolmasa, email va parol orqali kiring.'
translations.uz.auth.googleUnavailable =
  'Google orqali kirish hozircha mavjud emas. Keyinroq yana urinib koring.'
translations.ru.common.retry = '\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c'
translations.uz.common.retry = 'Qayta urinish'
translations.en.eventCard.join = 'Join'
translations.ru.eventCard.join = '\u041f\u0440\u0438\u0441\u043e\u0435\u0434\u0438\u043d\u0438\u0442\u044c\u0441\u044f'
translations.uz.eventCard.join = 'Qoshilish'
translations.en.adminPage.snapshotEyebrow = 'Platform snapshot'
translations.en.adminPage.snapshotTitle = 'Live admin overview'
translations.en.adminPage.snapshotUsersNote = 'registered'
translations.en.adminPage.snapshotEventsNote = 'all time'
translations.en.adminPage.snapshotApprovedNote = '{rate}% of events'
translations.en.adminPage.snapshotAttendedNote = 'check-ins'
translations.en.adminPage.snapshotWaitlistedNote = 'in queue'
translations.en.adminPage.snapshotNoShowsNote = '{rate}% miss rate'
translations.en.adminPage.breakdownTitle = 'Event status breakdown'
translations.en.adminPage.breakdownApproved = 'Approved'
translations.en.adminPage.breakdownFinished = 'Finished'
translations.en.adminPage.breakdownPending = 'Pending'
translations.en.adminPage.breakdownRejected = 'Rejected'
translations.en.adminPage.approvalRateLabel = 'Approval rate'
translations.en.adminPage.completionRateLabel = 'Completion rate'
translations.en.adminPage.activeEventsLabel = 'Active events'
translations.en.adminPage.funnelTitle = 'Participation funnel'
translations.en.adminPage.funnelJoined = 'Joined'
translations.en.adminPage.funnelAttended = 'Attended'
translations.en.adminPage.funnelNoShow = 'No-show'
translations.en.adminPage.funnelWaitlist = 'Waitlist'
translations.en.adminPage.timelineTitle = 'Recent activity timeline — last 7 days'
translations.en.adminPage.timelineJoins = 'New joins'
translations.en.adminPage.timelineCheckIns = 'Check-ins'
translations.en.adminPage.attendanceRateTitle = 'Attendance rate'
translations.en.adminPage.attendanceRateSubtitle = 'of closed-event participants attended'
translations.en.adminPage.lifecycleTitle = 'Event lifecycle'
translations.en.adminPage.lifecycleActive = 'Active'
translations.en.adminPage.lifecycleFinished = 'Finished'
translations.en.adminPage.lifecycleInProgress = 'In progress'
translations.en.common.admin = 'Admin'
translations.en.header.menu = 'Open menu'
translations.en.header.mainNavigation = 'Main navigation'
translations.en.header.mobileNavigation = 'Mobile navigation'
translations.en.profile.noChanges = 'No changes to save'
translations.en.profile.photoUrlPlaceholder = 'https://example.com/avatar.jpg'
translations.en.auth.googlePreparing = 'Preparing Google sign-in...'
translations.en.auth.fallbackName = 'there'
translations.en.auth.genericSignInError = 'Sign in failed. Please try again.'
translations.en.eventForm.previewAlt = 'Event preview'

translations.ru.common.adminPanel = 'Админ-панель'
translations.ru.common.users = 'Пользователи'
translations.ru.common.search = 'Поиск'
translations.ru.common.status = 'Статус'
translations.ru.common.activity = 'Активность'
translations.ru.common.retry = 'Повторить'
translations.ru.common.admin = 'Админ'
translations.ru.header.notifications = 'Уведомления'
translations.ru.header.notificationsSubtitle = 'Последние обновления и напоминания.'
translations.ru.header.notificationsLoading = 'Загрузка уведомлений...'
translations.ru.header.notificationsEmpty = 'Уведомлений пока нет.'
translations.ru.header.markAllRead = 'Отметить все как прочитанные'
translations.ru.header.pendingAdminBadge = '{count} событий ожидают'
translations.ru.header.menu = 'Открыть меню'
translations.ru.header.mainNavigation = 'Главная навигация'
translations.ru.header.mobileNavigation = 'Мобильная навигация'
translations.ru.profile.noChanges = 'Нет изменений для сохранения'
translations.ru.profile.photoUrlPlaceholder = 'https://example.com/avatar.jpg'
translations.ru.auth.googlePreparing = 'Подготавливаем вход через Google...'
translations.ru.auth.fallbackName = 'друг'
translations.ru.auth.genericSignInError = 'Не удалось войти. Попробуйте снова.'
translations.ru.eventForm.previewAlt = 'Предпросмотр события'
translations.ru.adminPage.snapshotEyebrow = 'Срез платформы'
translations.ru.adminPage.snapshotTitle = 'Живая сводка админ-панели'
translations.ru.adminPage.snapshotUsersNote = 'зарегистрировано'
translations.ru.adminPage.snapshotEventsNote = 'за все время'
translations.ru.adminPage.snapshotApprovedNote = '{rate}% событий'
translations.ru.adminPage.snapshotAttendedNote = 'чекинов'
translations.ru.adminPage.snapshotWaitlistedNote = 'в очереди'
translations.ru.adminPage.snapshotNoShowsNote = '{rate}% неявок'
translations.ru.adminPage.breakdownTitle = 'Распределение статусов событий'
translations.ru.adminPage.breakdownApproved = 'Одобрено'
translations.ru.adminPage.breakdownFinished = 'Завершено'
translations.ru.adminPage.breakdownPending = 'На проверке'
translations.ru.adminPage.breakdownRejected = 'Отклонено'
translations.ru.adminPage.approvalRateLabel = 'Доля одобрения'
translations.ru.adminPage.completionRateLabel = 'Доля завершения'
translations.ru.adminPage.activeEventsLabel = 'Активные события'
translations.ru.adminPage.funnelTitle = 'Воронка участия'
translations.ru.adminPage.funnelJoined = 'Записались'
translations.ru.adminPage.funnelAttended = 'Посетили'
translations.ru.adminPage.funnelNoShow = 'Не пришли'
translations.ru.adminPage.funnelWaitlist = 'Лист ожидания'
translations.ru.adminPage.timelineTitle = 'Лента активности за последние 7 дней'
translations.ru.adminPage.timelineJoins = 'Новые записи'
translations.ru.adminPage.timelineCheckIns = 'Чекины'
translations.ru.adminPage.attendanceRateTitle = 'Уровень посещаемости'
translations.ru.adminPage.attendanceRateSubtitle = 'доля посетивших среди завершенных событий'
translations.ru.adminPage.lifecycleTitle = 'Жизненный цикл событий'
translations.ru.adminPage.lifecycleActive = 'Активные'
translations.ru.adminPage.lifecycleFinished = 'Завершенные'
translations.ru.adminPage.lifecycleInProgress = 'В процессе'

translations.uz.common.adminPanel = 'Admin paneli'
translations.uz.common.users = 'Foydalanuvchilar'
translations.uz.common.search = 'Qidiruv'
translations.uz.common.status = 'Holat'
translations.uz.common.activity = 'Faollik'
translations.uz.common.retry = 'Qayta urinish'
translations.uz.common.admin = 'Admin'
translations.uz.header.notifications = 'Bildirishnomalar'
translations.uz.header.notificationsSubtitle = 'So‘nggi yangilanishlar va eslatmalar.'
translations.uz.header.notificationsLoading = 'Bildirishnomalar yuklanmoqda...'
translations.uz.header.notificationsEmpty = 'Hozircha bildirishnoma yo‘q.'
translations.uz.header.markAllRead = 'Barchasini o‘qilgan deb belgilash'
translations.uz.header.pendingAdminBadge = '{count} ta tadbir kutilmoqda'
translations.uz.header.menu = 'Menyuni ochish'
translations.uz.header.mainNavigation = 'Asosiy navigatsiya'
translations.uz.header.mobileNavigation = 'Mobil navigatsiya'
translations.uz.profile.noChanges = 'Saqlash uchun o‘zgarish yo‘q'
translations.uz.profile.photoUrlPlaceholder = 'https://example.com/avatar.jpg'
translations.uz.auth.googlePreparing = 'Google orqali kirish tayyorlanmoqda...'
translations.uz.auth.fallbackName = 'do‘st'
translations.uz.auth.genericSignInError = 'Kirish amalga oshmadi. Qayta urinib ko‘ring.'
translations.uz.eventForm.previewAlt = 'Tadbir oldindan ko‘rish rasmi'
translations.uz.adminPage.snapshotEyebrow = 'Platforma holati'
translations.uz.adminPage.snapshotTitle = 'Jonli admin ko‘rinishi'
translations.uz.adminPage.snapshotUsersNote = 'ro‘yxatdan o‘tgan'
translations.uz.adminPage.snapshotEventsNote = 'jami'
translations.uz.adminPage.snapshotApprovedNote = 'tadbirlarning {rate}%'
translations.uz.adminPage.snapshotAttendedNote = 'check-in'
translations.uz.adminPage.snapshotWaitlistedNote = 'navbatda'
translations.uz.adminPage.snapshotNoShowsNote = '{rate}% kelmaganlar'
translations.uz.adminPage.breakdownTitle = 'Tadbir holatlari taqsimoti'
translations.uz.adminPage.breakdownApproved = 'Tasdiqlangan'
translations.uz.adminPage.breakdownFinished = 'Yakunlangan'
translations.uz.adminPage.breakdownPending = 'Kutilmoqda'
translations.uz.adminPage.breakdownRejected = 'Rad etilgan'
translations.uz.adminPage.approvalRateLabel = 'Tasdiqlash darajasi'
translations.uz.adminPage.completionRateLabel = 'Yakunlash darajasi'
translations.uz.adminPage.activeEventsLabel = 'Faol tadbirlar'
translations.uz.adminPage.funnelTitle = 'Qatnashuv voronkasi'
translations.uz.adminPage.funnelJoined = 'Qo‘shilgan'
translations.uz.adminPage.funnelAttended = 'Kelgan'
translations.uz.adminPage.funnelNoShow = 'Kelmagan'
translations.uz.adminPage.funnelWaitlist = 'Kutish ro‘yxati'
translations.uz.adminPage.timelineTitle = 'So‘nggi 7 kun faollik jadvali'
translations.uz.adminPage.timelineJoins = 'Yangi qo‘shilganlar'
translations.uz.adminPage.timelineCheckIns = 'Check-inlar'
translations.uz.adminPage.attendanceRateTitle = 'Davomat darajasi'
translations.uz.adminPage.attendanceRateSubtitle = 'yakunlangan tadbir ishtirokchilaridan kelganlar ulushi'
translations.uz.adminPage.lifecycleTitle = 'Tadbir hayotiy sikli'
translations.uz.adminPage.lifecycleActive = 'Faol'
translations.uz.adminPage.lifecycleFinished = 'Yakunlangan'
translations.uz.adminPage.lifecycleInProgress = 'Jarayonda'

const LANGUAGE_STORAGE_KEY = 'aem-language'
const supportedLanguages = ['en', 'ru', 'uz']

function getValueByPath(source, path) {
  return path.split('.').reduce((current, part) => current?.[part], source)
}

function interpolate(template, variables = {}) {
  if (typeof template !== 'string') {
    return template
  }

  return template.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? `{${key}}`)
}

export function normalizeLanguageCode(value) {
  return supportedLanguages.includes(value) ? value : 'en'
}

export function getStoredLanguageCode() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'en'
  }

  return normalizeLanguageCode(window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? 'en')
}

export function storeLanguageCode(value) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizeLanguageCode(value))
}

export function translateForLanguage(languageCode, path, variables = {}) {
  const normalizedLanguage = normalizeLanguageCode(languageCode)
  const fallback = getValueByPath(translations.en, path)
  const value = getValueByPath(translations[normalizedLanguage], path) ?? fallback ?? path
  return interpolate(value, variables)
}

export function getLanguageLocale(languageCode) {
  switch (normalizeLanguageCode(languageCode)) {
    case 'ru':
      return 'ru-RU'
    case 'uz':
      return 'uz-UZ'
    default:
      return 'en-US'
  }
}
