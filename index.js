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
    $('#login').css('display', 'flex');
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
  
  // Get/create Trello board and list
  
  const boardId = await getBoardId();
  const pid = getFSPersonId();
  const personsName = await getFSPersonsName(pid);
  const newCardDesc = `${personsName}'s profile: https://familysearch.org/tree/person/${pid}`;
  let list = await getList(boardId, pid);
  if(!list) {
    list = await createList(boardId, personsName ? `${personsName} - ${pid}` : pid)
  }
  const listId = list.id;
  $('#list-title').text(list.name);
  await displayList(listId);
  
  // Setup event listeners
  
  $('#new-card-link').click(function(e){
    $(this).hide();
    $('#new-card').show();
    $('#new-card-title').focus();
    e.preventDefault();
    e.stopPropagation();
  });
  
  $(document.body).click(() => {
    $('#new-card-link').show();
    $('#new-card').hide();
  });
  
  $('#new-card-button').click((e) => {
    addNewCard(listId, newCardDesc);
    e.stopPropagation();
  });
  $('#new-card-title').keypress(function(e) {
    if(e.which == 13) {
      addNewCard(listId, newCardDesc);
      e.stopPropagation();
      e.preventDefault();
    }
  });
  $('#content').show();
  
  // Now we're done loading
  notLoading();
}

function loading() {
  $('#loading').css('display', 'flex');
}
function notLoading() {
  $('#loading').hide();
}

/**
 * Add a new card to the list
 * 
 * @param {String} listId Trello list ID
 * @param {String} desc
 */
function addNewCard(listId, desc) {
  const $title = $('#new-card-title');
  const title = $title.val().trim();
  
  if(!title) {
    return;
  }
  
  trelloRequest('POST', `/cards`, {
    name: title,
    idList: listId,
    desc
  }).then(() => {
    $title.val('');
    $('#new-card-button').prop('disabled', false);
    $('#new-card-title').focus();
    loading();
    displayList(listId);
    notLoading();
  });
}

/**
 * Display the Trello list
 * 
 * @param {String} listId
 */
async function displayList(listId) {
  const cards = await trelloRequest('GET', `/lists/${listId}/cards`);
  
  // Clear any existing cards
  const $list = $('#list').html('');
  
  // Render cards
  if(cards.length) {
    cards.forEach(c => {
      $list.append(displayCard(c));
    });
  }
}

/**
 * Generate the DOM for a card
 * 
 * @param {Object} card card data from the Trello API
 * @return {jQuery Element}
 */
function displayCard(card) {
  const $card = $(`<div class="card"><div class="card-title">${card.name}</div></div>`).click(() => {
    window.open(card.url, 'fstrello');
  });
  if(card.desc){
    $card.append(`<div class="card-desc">&nbsp;</div>`);
  }
  return $card;
}

/**
 * Get the Trello list for this person, or create a new one
 * 
 * @param {String} boardId Trello board ID
 * @param {String} pid FamilySearch person ID
 */
async function getList(boardId, pid) {
  const nameRegex = new RegExp(`${pid}$`);
  return await trelloRequest('GET', `/board/${boardId}/lists`, {
    filter: 'open'
  }).then((lists) => {
    return lists.find(l => nameRegex.test(l.name));
  });
}

/**
 * Create a Trello list
 * 
 * @param {String} boardId Trello board ID
 * @param {String} name Name of the new Trello board
 * @return {Object} trello list
 */
async function createList(boardId, name) {
  return await trelloRequest('POST', `/board/${boardId}/lists`, {
    name,
    pos: 'bottom'
  });
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