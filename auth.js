const AUTH_GUEST_KEY = 'ranked_guest_mode';

const authButton = document.getElementById('authButton');
const userBadge = document.getElementById('userBadge');
const authOverlay = document.getElementById('authOverlay');
const authModal = document.getElementById('authModal');
const closeAuthModalButton = document.getElementById('closeAuthModal');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const passwordRecoveryForm = document.getElementById('passwordRecoveryForm');
const authMessage = document.getElementById('authMessage');
const guestContinueButton = document.getElementById('guestContinueButton');
const resetPasswordButton = document.getElementById('resetPasswordBtn');
const authTabs = Array.from(document.querySelectorAll('.auth-tab'));

let currentSession = null;
let passwordRecoveryMode = false;
let hasNotifiedRankingAuthState = false;
let lastNotifiedRankingUserId = null;

function notifyRankingAuthChange(session) {
  const userId = session?.user?.id ?? null;
  if (hasNotifiedRankingAuthState && userId === lastNotifiedRankingUserId) return;

  hasNotifiedRankingAuthState = true;
  lastNotifiedRankingUserId = userId;
  window.dispatchEvent(new CustomEvent('ranked:auth-change', {
    detail: { user: session?.user ?? null }
  }));
}

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

  if (normalized.includes('otp_expired') || normalized.includes('expired') || normalized.includes('invalid or has expired')) {
    return 'This password reset link is invalid or has expired. Request a new reset email and use the newest link.';
  }

  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return 'Could not connect to the authentication service. Check your connection and try again.';
  }

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

  if (
    normalized.includes('invalid email')
    || normalized.includes('email is invalid')
    || normalized.includes('unable to validate email')
    || normalized.includes('email address is invalid')
    || normalized.includes('email address is not valid')
  ) {
    return 'Please enter a valid email address.';
  }

  if (
    normalized.includes('email rate limit')
    || normalized.includes('over_email_send_rate_limit')
    || normalized.includes('email rate limit exceeded')
  ) {
    return 'Supabase is limiting email delivery for this project. The built-in email provider allows 2 auth emails per hour across the project. Check Authentication > Rate Limits, or configure custom SMTP in Supabase.';
  }

  if (normalized.includes('rate limit')) {
    return 'Supabase temporarily rate-limited this request. The cooldown depends on the limit reached; check Authentication > Rate Limits in your Supabase dashboard before retrying.';
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
  passwordRecoveryMode = false;
  const isLogin = tabName === 'login';
  passwordRecoveryForm.classList.add('hidden');
  document.querySelector('.auth-tabs').classList.remove('hidden');
  guestContinueButton.classList.remove('hidden');

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

function openPasswordRecoveryModal() {
  passwordRecoveryMode = true;
  document.querySelector('.auth-tabs').classList.add('hidden');
  guestContinueButton.classList.add('hidden');
  loginForm.classList.add('hidden');
  signupForm.classList.add('hidden');
  passwordRecoveryForm.classList.remove('hidden');
  document.getElementById('authModalTitle').textContent = 'Reset your password';
  authOverlay.classList.add('is-visible');
  authOverlay.setAttribute('aria-hidden', 'false');
  setAuthMessage('Password reset link verified. Choose a new password.', 'info');
  setTimeout(() => document.getElementById('newPassword').focus(), 50);
}

function closeAuthModal() {
  authOverlay.classList.remove('is-visible');
  authOverlay.setAttribute('aria-hidden', 'true');
  passwordRecoveryMode = false;
  passwordRecoveryForm.reset();
  passwordRecoveryForm.classList.add('hidden');
  document.querySelector('.auth-tabs').classList.remove('hidden');
  guestContinueButton.classList.remove('hidden');
  switchAuthTab('login');
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
  const activeForm = loginForm.classList.contains('hidden') ? signupForm : loginForm;
  const activeEmail = activeForm.elements.email.value.trim();
  const email = (activeEmail || currentSession?.user?.email || '').trim();

  if (!email) {
    setAuthMessage('Enter your email address first, then request a password reset.', 'error');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setAuthMessage('Enter a valid email address, then request a password reset.', 'error');
    return;
  }

  resetPasswordButton.disabled = true;
  resetPasswordButton.textContent = 'Sending…';
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
  } finally {
    resetPasswordButton.disabled = false;
    resetPasswordButton.textContent = 'Forgot password?';
  }
}

async function handlePasswordRecovery(event) {
  event.preventDefault();
  const password = passwordRecoveryForm.elements.password.value;
  const confirmPassword = passwordRecoveryForm.elements.confirmPassword.value;

  if (password.length < 6) {
    setAuthMessage('Choose a password with at least 6 characters.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    setAuthMessage('The passwords do not match.', 'error');
    return;
  }

  setFormLoadingState(passwordRecoveryForm, true);
  try {
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw error;

    passwordRecoveryForm.reset();
    passwordRecoveryForm.classList.add('hidden');
    passwordRecoveryMode = false;
    document.getElementById('authModalTitle').textContent = 'Password updated';
    setAuthMessage('Your password has been updated. You are signed in.', 'success');
  } catch (error) {
    setAuthMessage(getReadableAuthError(error), 'error');
  } finally {
    setFormLoadingState(passwordRecoveryForm, false);
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
  passwordRecoveryForm.addEventListener('submit', handlePasswordRecovery);

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

  const callbackParams = new URLSearchParams(window.location.hash.slice(1));
  const callbackErrorCode = callbackParams.get('error_code');
  const callbackErrorDescription = callbackParams.get('error_description');
  const hasRecoveryError = callbackErrorCode === 'otp_expired'
    || callbackErrorCode === 'access_denied'
    || Boolean(callbackErrorDescription);

  if (hasRecoveryError) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  supabaseClient.auth.onAuthStateChange((event, sessionData) => {
    currentSession = sessionData;

    if (event === 'SIGNED_OUT') {
      setGuestMode(false);
    }

    updateAuthUi(sessionData);
    notifyRankingAuthChange(sessionData);

    if (event === 'PASSWORD_RECOVERY') {
      setGuestMode(false);
      openPasswordRecoveryModal();
    }
  });

  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    currentSession = data.session;
    updateAuthUi(data.session);
  } catch (error) {
    currentSession = null;
    updateAuthUi(null);
    setAuthMessage(`Session could not be loaded: ${getReadableAuthError(error)}`, 'error');
  } finally {
    notifyRankingAuthChange(currentSession);
  }

  if (hasRecoveryError) {
    openAuthModal('login');
    setAuthMessage(
      callbackErrorCode === 'otp_expired'
        ? 'This password reset link is expired or already used. Request a new email and open the newest link.'
        : callbackErrorDescription.replace(/\+/g, ' '),
      'error'
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
  initializeAuth();
}
