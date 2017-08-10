const BOARD_NAME = 'FamilySearch Research Tasks';
const BOARD_DESCRIPTION = 'Track your research tasks in Trello. Used by the FamilySearch Custom Trello Tab.';

setup();

function setup() {
  
  // When the login is clicked we initiate interactive login meaning we use the popup
  $('#login').click(function(){
    loading();
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
    notLoading();
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

async function begin() {
  loading();
  $('#login').hide();
  const boardId = await getBoardId();
  const listId = await getListId(boardId, getFSPersonId());
  await displayList(listId);
  notLoading();
}

function loading() {
  $('#loading').css('display', 'flex');
}
function notLoading() {
  $('#loading').hide();
}

/**
 * Display the Trello list
 * 
 * @param {String} listId
 */
async function displayList(listId) {
  const cards = await trelloRequest('GET', `/lists/${listId}/cards`);
  
  // Clear any existing content
  const $list = $('#list').html('');
  
  cards.forEach(c => {
    $list.append($(`<div class="card">${c.name}</div>`).click(() => {
      window.open(c.url, 'fstrello');
    }));
  });
}

/**
 * Get the ID of the Trello list for this person, or create a new one
 * 
 * @param {String} boardId Trello board ID
 * @param {String} pid FamilySearch person ID
 */
async function getListId(boardId, pid) {
  
  const nameRegex = new RegExp(`${pid}$`);
  
  // Get all lists for this board
  const existingList = await trelloRequest('GET', `/board/${boardId}/lists`, {
    filter: 'open'
  }).then((lists) => {
    return lists.find(l => nameRegex.test(l.name));
  });
  
  if(existingList) {
    return existingList.id;
  } 
  
  // Create a new board for this person
  else {
    const personsName = await getFSPersonsName(pid);
    const response = await trelloRequest('POST', `/board/${boardId}/lists`, {
      name: personsName ? `${personsName} - ${pid}` : pid,
      pos: 'bottom'
    });
    return response.id;
  }
}

/**
 * Get the ID of the FamilySearch board or create a new board and return its ID
 */
async function getBoardId() {
  
  // Get a list of open boards
  const existingFamilySearchBoard = await trelloRequest('GET', '/members/me/boards', {
    filter: 'open'
  })
  
  // Filter to just personal boards
  .then((boards) => {
    return boards.filter(b => b.idOrganization === null);
  })
  
  // Choose a FamilySearch board if one exists
  .then((boards) => {
    return boards.find(b => b.name === BOARD_NAME);
  });
  
  if(existingFamilySearchBoard) {
    return existingFamilySearchBoard.id;
  } 
  
  // Create a board if one doesn't exist
  else {
    const response = await trelloRequest('POST', '/boards', {
      name: BOARD_NAME,
      desc: BOARD_DESCRIPTION,
      defaultLists: false
    });
    return response.id;
  }
  
}

/**
 * Get the name of the FS person
 * 
 * @param {String} pid FamilySearch person ID
 */
async function getFSPersonsName(pid) {
  const response = await fetch(`https://familysearch.org/platform/tree/persons/${pid}`, {
    headers: new Headers({
      Accept: 'application/json',
      Authorization: `Bearer ${getFSToken()}`
    })
  });
  if(response.ok) {
    const json = await response.json();
    return json.persons[0].display.name;
  }
}

function getFSPersonId() {
  const params = (new URL(document.location.href)).searchParams;
  return params.get('pid');
}

function getFSToken() {
  const params = (new URL(document.location.href)).searchParams;
  return params.get('token');
}