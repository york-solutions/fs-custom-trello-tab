
setup();

function setup() {
  
  // When the login is clicked we initiate interactive login meaning we use the popup
  $('#login').click(function(){
    login(true);
  });
  
  // Noninteractive login to check if an auth token already exists in storage
  login(false);
}

/**
 * Initiate the auth sequence and handle the result
 * 
 * @param {Boolean=} interactive Whether to use the popup or just try to authenticate with existing tokens stored locally.
 */
async function login(interactive = true) {
  const loggedIn = await trelloAuth(interactive);
  if(!loggedIn) {
    $('#login').show();
  } else {
    authenticationSuccess();
  }
}

/**
 * Initiate Authentication with Trello.
 * 
 * @param {Boolean=} interactive Whether to use the popup or just try to authenticate with existing tokens stored locally.
 * @return {Promise<boolean>} resolves to true (authenticated) or false (not authenticated)
 */
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