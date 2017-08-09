
setup();

function setup() {
  $('#login').click(login);
  login(false);
}

function isAuthenticated() {
  return new Promise((resolve, reject) => {
    Trello.rest('GET', '/members/me', () => resolve(true), () => resolve(false));
  });
}

async function login(interactive = true) {
  const loggedIn = await trelloAuth(interactive);
  if(!loggedIn) {
    $('#login').show();
  } else {
    authenticationSuccess();
  }
}

function trelloAuth(interactive = true){
  return new Promise((resolve, reject) => {
    Trello.authorize({
      type: 'popup',
      name: 'FamilySearch Trello Tab',
      scope: {
        read: 'true',
        write: 'true'
      },
      interactive,
      expiration: 'never',
      success: () => resolve(true),
      error: () => resolve(false)
    });
  });
}

function authenticationSuccess() {
  $('#login').hide();
  document.write('<h2>Authenticated</h2>');
}