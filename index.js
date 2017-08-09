
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
    begin();
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

/**
 * Promisify the Trello.rest() method provided by the client.js Trello library
 * 
 * @param {String} method
 * @param {String} url
 * @param {Object=} params
 * @return {Promise} resolves to response object
 */
function trelloRequest(method, url, params = {}) {
  return new Promise((resolve, reject) => {
    Trello.rest(method, url, params, resolve, reject);
  });
}

function begin() {
  $('#login').hide();
  document.write('<h2>Authenticated</h2>');
  chooseBoard();
}

/**
 * Choose an existing FamilySearch board or create a new one
 */
async function chooseBoard() {
  
  // Get a list of all personal (non-org boards)
  const personalBoards = await trelloRequest('GET', '/members/me/boards', {
    filter: 'open'
  }).then((boards) => {
    return boards.filter(b => b.idOrganization === null);
  });
  
  // Is there an existing FamilySearch board?
}