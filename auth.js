const AUTH_GUEST_KEY = 'ranked_guest_mode';

const authButton = document.getElementById('authButton');
const userBadge = document.getElementById('userBadge');
const authOverlay = document.getElementById('authOverlay');
const authModal = document.getElementById('authModal');
const closeAuthModalButton = document.getElementById('closeAuthModal');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authMessage = document.getElementById('authMessage');
const guestContinueButton = document.getElementById('guestContinueButton');
const resetPasswordButton = document.getElementById('resetPasswordBtn');
const authTabs = Array.from(document.querySelectorAll('.auth-tab'));

let currentSession = null;

function isGuestMode() {
  return localStorage.getItem(AUTH_GUEST_KEY) === 'true';
}

function setGuestMode(enabled) {
  if (enabled) {
    localStorage.setItem(AUTH_GUEST_KEY, 'true');
    return;
  }

  localStorage.removeItem(AUTH_GUEST_KEY);
}

function getReadableAuthError(error) {
  const message = error?.message || 'Something went wrong. Please try again.';
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }

  if (normalized.includes('user already registered')) {
    return 'An account already exists for that email address.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email address before logging in.';
  }

  if (normalized.includes('user not found')) {
    return 'No account was found for that email address.';
  }

  if (normalized.includes('password')) {
    return 'Password must be at least 6 characters long.';
  }

  if (normalized.includes('email')) {
    return 'Please enter a valid email address.';
  }

  if (normalized.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  return message;
}

function setAuthMessage(message, type = 'info') {
  authMessage.textContent = message;
  authMessage.className = 'auth-message';

  if (type === 'success') {
    authMessage.classList.add('auth-message-success');
  }

  if (type === 'error') {
    authMessage.classList.add('auth-message-error');
  }
}

function setFormLoadingState(form, isLoading) {
  const submitButton = form.querySelector('button[type="submit"]');
  const fields = form.querySelectorAll('input');

  submitButton.disabled = isLoading;
  submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.textContent;

  if (isLoading) {
    submitButton.textContent = 'Please wait...';
    fields.forEach((field) => {
      field.disabled = true;
    });
    return;
  }

  submitButton.textContent = submitButton.dataset.originalText;
  fields.forEach((field) => {
    field.disabled = false;
  });
}

function switchAuthTab(tabName) {
  const isLogin = tabName === 'login';

  authTabs.forEach((tab) => {
    const active = tab.dataset.authTab === tabName;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  loginForm.classList.toggle('hidden', !isLogin);
  signupForm.classList.toggle('hidden', isLogin);

  const modalHeading = document.getElementById('authModalTitle');
  modalHeading.textContent = isLogin ? 'Welcome back' : 'Create your account';
}

function openAuthModal(view = 'login') {
  switchAuthTab(view);
  authOverlay.classList.add('is-visible');
  authOverlay.setAttribute('aria-hidden', 'false');
  const firstInput = view === 'login' ? document.getElementById('loginEmail') : document.getElementById('signupEmail');
  setTimeout(() => firstInput.focus(), 50);
}

function closeAuthModal() {
  authOverlay.classList.remove('is-visible');
  authOverlay.setAttribute('aria-hidden', 'true');
  authMessage.textContent = '';
  authMessage.className = 'auth-message';
}

async function handleLogout() {
  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }

    setGuestMode(false);
    currentSession = null;
    updateAuthUi();
    setAuthMessage('You have been logged out.', 'success');
    closeAuthModal();
  } catch (error) {
    setAuthMessage(getReadableAuthError(error), 'error');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = loginForm.email.value.trim();
  const password = loginForm.password.value.trim();

  if (!email || !password) {
    setAuthMessage('Please enter both your email and password.', 'error');
    return;
  }

  setFormLoadingState(loginForm, true);

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    currentSession = data.session;
    setGuestMode(false);
    updateAuthUi(data.session);
    setAuthMessage('Logged in successfully.', 'success');
    closeAuthModal();
  } catch (error) {
    setAuthMessage(getReadableAuthError(error), 'error');
  } finally {
    setFormLoadingState(loginForm, false);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const email = signupForm.email.value.trim();
  const password = signupForm.password.value.trim();

  if (!email || !password) {
    setAuthMessage('Please enter both an email address and a password.', 'error');
    return;
  }

  if (password.length < 6) {
    setAuthMessage('Password must be at least 6 characters long.', 'error');
    return;
  }

  setFormLoadingState(signupForm, true);

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password
    });

    if (error) {
      throw error;
    }

    if (data.user && data.user.email_confirmed_at) {
      currentSession = data.session;
      setGuestMode(false);
      updateAuthUi(data.session);
      setAuthMessage('Account created. You are now signed in.', 'success');
      closeAuthModal();
      return;
    }

    signupForm.reset();
    switchAuthTab('login');
    setAuthMessage('Account created. Check your email to confirm your address before signing in.', 'success');
  } catch (error) {
    setAuthMessage(getReadableAuthError(error), 'error');
  } finally {
    setFormLoadingState(signupForm, false);
  }
}

async function handlePasswordReset() {
  const email = loginForm.email.value.trim() || signupForm.email.value.trim();

  if (!email) {
    setAuthMessage('Enter your email address first, then request a password reset.', 'error');
    return;
  }

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });

    if (error) {
      throw error;
    }

    setAuthMessage('A password reset email has been sent. Check your inbox.', 'success');
  } catch (error) {
    setAuthMessage(getReadableAuthError(error), 'error');
  }
}

function updateAuthUi(session = currentSession) {
  const guestMode = isGuestMode() && !session;

  if (session?.user) {
    authButton.textContent = 'Log out';
    authButton.setAttribute('aria-label', 'Log out of your account');
    userBadge.textContent = session.user.email || 'Signed in';
    authButton.dataset.state = 'logged-in';
    return;
  }

  if (guestMode) {
    authButton.textContent = 'Guest mode';
    authButton.setAttribute('aria-label', 'Guest mode enabled');
    userBadge.textContent = 'Guest';
    authButton.dataset.state = 'guest';
    return;
  }

  authButton.textContent = 'Log in';
  authButton.setAttribute('aria-label', 'Open the login dialog');
  userBadge.textContent = 'Guest';
  authButton.dataset.state = 'logged-out';
}

async function handleAuthButtonClick() {
  if (currentSession) {
    await handleLogout();
    return;
  }

  if (isGuestMode()) {
    setGuestMode(false);
    updateAuthUi();
    return;
  }

  openAuthModal('login');
}

function handleGuestContinue() {
  setGuestMode(true);
  currentSession = null;
  updateAuthUi();
  closeAuthModal();
}

function bindAuthEvents() {
  authButton.addEventListener('click', handleAuthButtonClick);
  closeAuthModalButton.addEventListener('click', closeAuthModal);
  guestContinueButton.addEventListener('click', handleGuestContinue);
  resetPasswordButton.addEventListener('click', handlePasswordReset);
  authTabs.forEach((tab) => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.authTab));
  });

  loginForm.addEventListener('submit', handleLogin);
  signupForm.addEventListener('submit', handleSignup);

  authOverlay.addEventListener('click', (event) => {
    if (event.target === authOverlay) {
      closeAuthModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && authOverlay.classList.contains('is-visible')) {
      closeAuthModal();
    }
  });
}

async function initializeAuth() {
  bindAuthEvents();

  const { data: { session }, error } = await supabaseClient.auth.getSession();

  if (error) {
    setAuthMessage('Session could not be loaded. Please refresh the page.', 'error');
  }

  currentSession = session;
  updateAuthUi(session);

  supabaseClient.auth.onAuthStateChange((event, sessionData) => {
    currentSession = sessionData;

    if (event === 'SIGNED_OUT') {
      setGuestMode(false);
    }

    updateAuthUi(sessionData);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
  initializeAuth();
}
