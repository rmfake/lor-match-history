let globalPlayerName, globalTagName, globalLoading;
resetGlobalVariables();

const localeInterface = getInterfaceLanguage();
const localeGame = getGameLanguage();
let interface = text[localeInterface];
renderForm();

function resetGlobalVariables(){
	globalPlayerName = '';
	globalTagName = '';
	globalLoading = false;
}

function getInterfaceLanguage(){
	let locale = navigator.language || navigator.userLanguage;
	if (!locale) return;

	const savedLocale = localStorage.getItem('localeInterface');
	locale = checkLocale(savedLocale ? savedLocale : locale, config.availableLanguagesInterface);

	if (!locale){
		locale = 'en';
	}

	loadLocale(locale);
	return locale;
}

function loadLocale(locale){
	if (!locale)	return;

	dayjs.locale(locale);
	localStorage.setItem('localeInterface', locale);
}

function checkLocale(locale, availableLanguages){
	if (availableLanguages.includes(locale))	return locale;
	if (locale.includes('-') || locale.includes('_')){
		locale = locale.split('-')[0].split('_')[0];
		if (availableLanguages.includes(locale)){
			return locale;
		}else{
			for (let i = 0; i < availableLanguages.length; ++i){
				if (availableLanguages[i].startsWith(locale)){
					return availableLanguages[i];
				}
			}
		}
	}
	return null;
}

function getGameLanguage(){
	let locale = navigator.language || navigator.userLanguage;
	if (!locale) return;

	locale = checkLocale(convertLocale(locale), config.availableLanguagesGame);

	if (!locale){
		locale = 'en_us';
	}

	return locale;
}

function convertLocale(locale){
	if (!locale)	return;
	
	return locale.toLowerCase().replace('-', '_');
}

function setInterfaceLanguage(locale){
	if (globalLoading)	return;

	if (!locale) return;

	locale = checkLocale(locale, config.availableLanguagesInterface);
	if (!locale) return;

	loadLocale(locale);
	refreshContent(locale);
}

function refreshContent(locale){
	localStorage.setItem('localeInterface', locale);
	location.reload();
}

function renderForm(){
	const formElement = document.querySelector('#form');
	let html = '';
	
	html += `<input type="text" id="name-input" ${globalPlayerName ? `value="${globalPlayerName}"` : ''} placeholder="${interface.player_name}"></input>`;
	html += `<input type="text" id="tag-input" ${globalTagName ? `value="${globalTagName}"` : ''} placeholder="${interface.player_tag}"></input>`;
	html += `<button id="search-match-history" onclick="renderContent();">${interface.search_match_history}</button>`;

	formElement.innerHTML = html;
}

async function renderContent(){
	const playerNameElement = document.getElementById('name-input');
	const playerTagElement = document.getElementById('tag-input');
	const currentPage = 1;
	const pageSize = 20;

	renderLoadingScreen(true);

	const start = getStart(currentPage, pageSize);
	const playerName = playerNameElement.value;
	const tagName = playerTagElement.value;

	globalPlayerName = playerName;
	globalTagName = tagName;

	try
	{
		const result = await getMatches(playerName, tagName, start, pageSize);

		if (result.status === 200){
			renderTitle(playerName);
			if (result.count !== 0)	renderNavigation(currentPage, pageSize, result.count);
			renderMatches(result.matches);
		}else{
			renderErrorMessage(result.title, result.message);
		}
	}
	catch(err)
	{
		console.error(err);
	}
	finally
	{
		finishLoadingScreen();
	}
}

function renderLoadingScreen(includesTitle){
	globalLoading = true;

	document.querySelector('#error').innerHTML = '';
	if (includesTitle)	document.querySelector('#title').innerHTML = '';
	document.querySelector('#navigation').innerHTML = '';
	document.querySelector('#matches').innerHTML = '';

	document.querySelector('#matches-loading').innerHTML = `<h1><i class="fa fa-spinner fa-spin fa-fw"></i> ${interface.loading}</h1>`;
}

function finishLoadingScreen(){
	globalLoading = false;
	document.querySelector('#matches-loading').innerHTML = '';
}

async function getMatches(name, tag, start, pageSize){
	const requestBody = {
		name,
		tag,
		interface: localeInterface,
		locale: localeGame,
		start,
		pageSize
	};

	try
	{
		const response = await fetch('https://escolaruneterra.herokuapp.com/match/history', {
			method: 'POST',
			cache: 'no-cache',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		});
		
		const jsonResponse = await response.json();

		if (!response.ok){
			globalMatches = [];
			return jsonResponse;
		}

		globalMatches = jsonResponse.matches;
		return jsonResponse;
	}
	catch(err)
	{
		globalMatches = [];
		console.error(`Ocorreu um erro durante a requisição das partidas: ${err}`);
	}
}

function renderTitle(name){
	const titleElement = document.querySelector('#title');

	titleElement.innerHTML = `<h1>${name}</h1>`;
	titleElement.style.borderBottom = '#484646 1px solid';
}

function renderNavigation(currentPage, pageSize, count){
	const navigationElement = document.querySelector('#navigation');
	const numberOfPages = Math.ceil(count/pageSize);

	globalCurrentPage = currentPage;
	globalPageSize = pageSize;

	let html = `<div id="navigation-selector"><button id="previous"${currentPage === 1 ? ' disabled' : ''} onClick="goTo(${currentPage - 1}, ${pageSize}, ${numberOfPages})"><i class="fa fa-arrow-left" aria-hidden="true"></i></button>`;
	html += `<select id="select-current-page" onChange="goTo(${pageSize}, ${numberOfPages});">`;
	for (let i = 1; i <= numberOfPages; ++i){
		html += `<option value=${i}${i == currentPage ? ' selected' : ''}>${i}</option>`;
	}
	html += '</select>';
	html += `<button id="next"${currentPage === numberOfPages ? ' disabled' : ''} onClick = "goTo(${currentPage + 1}, ${pageSize}, ${numberOfPages})"><i class="fa fa-arrow-right" aria-hidden="true"></i></button></div>`;
	html += `<select id="select-page-size" onChange="changePageSize(${currentPage}, ${pageSize});">`;
	config.availablePageSizes.map((option) => {
		html += `<option value=${option}${option == pageSize ? ' selected' : ''}>${option}</option>`
	});
	html += '</select>';

	navigationElement.innerHTML = html;
}

async function goTo(pageSize, numberOfPages){
	const selectCurrentPageElement = document.querySelector('#select-current-page');
	const newCurrentPage = selectCurrentPageElement.value;

	if (1 <= newCurrentPage && newCurrentPage <= numberOfPages){
		const start = getStart(newCurrentPage, pageSize);

		renderLoadingScreen(false);

		try
		{
			const result = await getMatches(globalPlayerName, globalTagName, start, pageSize);

			renderNavigation(newCurrentPage, pageSize, result.count);
			renderMatches(result.matches);
		}
		catch(err)
		{
			console.error(err);
		}
		finally
		{
			finishLoadingScreen();
		}
	}
}

function getStart(page, pageSize){
	return (page - 1) * pageSize;
}

async function changePageSize(currentPage, pageSize){
	const selectPageSizeElement = document.querySelector('#select-page-size');
	const newPageSize = selectPageSizeElement.value;
	const newCurrentPage = 1;
	console.log(newCurrentPage);
	const start = getStart(newCurrentPage, newPageSize);
	
	renderLoadingScreen(false);
	
	try
	{
		const result = await getMatches(globalPlayerName, globalTagName, start, newPageSize);

		renderNavigation(newCurrentPage, newPageSize, result.count);
		renderMatches(result.matches);
	}
	catch(err)
	{
		console.error(err);
	}
	finally
	{
		finishLoadingScreen();
	}
}

function renderMatches(matches){
	const matchesElement = document.querySelector('#matches');

	let html = '';

	if (matches.length === 0){
		html += `<span class="error-message">${interface.no_matches}</span>`;
	}else{
		matches.map((match, index) => {
			html += renderMatch(match, index);
		});
	}	

	matchesElement.innerHTML = html;
}

function renderMatch(data, index){
	let html = `<li class="match">`;

	html += renderDateTime(data.start_time_utc);
	html += renderMatchPreview(data.id, data.opponent, data.player_deck, data.opponent_deck, data.victory);
	html += renderMatchDetails(index, data.id, data.mode, data.type, data.player, data.opponent, data.player_deck, data.opponent_deck, data.first, data.total_turn_count);
	html += '</li>';

	return html;
}

function renderDateTime(dateTime){
	return `<span class="date-time">${dayjs(dateTime).format(`dddd ${interface.date_format} HH:mm:ss`)}</span>`;
}

function renderMatchPreview(matchId, opponentName, playerDeck, opponentDeck, victory){
	let html = `<div class="match-preview ${victory ? 'victory' : 'defeat'}" onClick="toggleDetails('${matchId}');">`;
	
	html += `<div class="player-regions-champions"><ul class="regions-champions"><ul class="regions">${renderRegions(playerDeck)}</ul><ul class="champions">${renderChampions(playerDeck)}</ul></ul></div>`;
	html += `<div class="outcome-opponent"><span class="outcome">${victory ? interface.victory : interface.defeat}</span><span class="opponent">${opponentName}</span></div>`;
	html += `<div class="player-regions-champions reverse-player-regions-champions"><ul class="regions-champions reverse-regions-champions"><ul class="regions reverse-regions">${renderRegions(opponentDeck)}</ul><ul class="champions">${renderChampions(opponentDeck)}</ul></ul></div>`;
	html += '</div>';

	return html;
}

function toggleDetails(match_id){
	const detailsElement = document.getElementById(match_id);

	detailsElement.classList.toggle("hide");
}

function renderRegions(deck){
	let html = '';

	deck.regions.map((region) => {
		html += `<li class="region"><img src="http://dd.b.pvp.net/latest/core/en_us/img/regions/icon-${region}.png" alt="${region}"></li>`;
	});

	return html;
}

function renderChampions(deck){
	let html = '';

	deck.champions.map((champion) => {
		html += `<li class="champion"><img src="http://ddragon.leagueoflegends.com/cdn/10.15.1/img/champion/${champion}.png" alt="${champion}"></li>`;
	});

	return html;
}

function renderMatchDetails(matchIndex, matchId, matchMode, matchType, playerName, opponentName, playerDeck, opponentDeck, first, totalTurnCount){
	let html = `<div id="${matchId}" class="match-details hide">`;

	html += renderMatchDetailsHeader(matchMode, matchType, totalTurnCount);
	html += renderCopyButtons(playerDeck, opponentDeck);
	html += '<div class="decks">';
	html += renderDeck(matchIndex, playerName, first, playerDeck, true);
	html += renderDeck(matchIndex, opponentName, !first, opponentDeck, false);
	html += '</div>';

	return html;
}

function renderMatchDetailsHeader(matchMode, matchType, totalTurnCount){
	return `<div class="mode-type-turn-count"><div class="mode-type"><span class="mode">${interface.game_mode} <strong>${matchMode}</strong></span><span class="type">${interface.game_type} <strong>${matchType}</strong></span></div><span class="turn-count">${interface.turn_count} <strong>${totalTurnCount}</strong> ${interface.turns} (${interface.estimated_time}: ${getEstimatedTime(totalTurnCount)} ${interface.minutes})</span></div>`;
}

function renderErrorMessage(title, message){
	const errorMessageElement = document.querySelector('#error');

	errorMessageElement.innerHTML = `<h1>${title}</h1><span class="error-message">${message}</span>`;
}

function getEstimatedTime(totalTurnCount){
	return totalTurnCount/2;
}

function renderCopyButtons(playerDeck, opponentDeck){
	let html = '<div class="copy-buttons">';

	html += `<div class="player-copy-button"><button class="copy-button" onClick="copyDeckCode('${playerDeck.code}', 'player-copy-msg');"><img src="./assets/copy_24px.svg"/></button><span id="player-copy-msg" class="message hide-text"></span></div>`;
	html += `<div class="player-copy-button reverse-player-copy-button"><button class="copy-button" onClick="copyDeckCode('${opponentDeck.code}', 'opponent-copy-msg');"><img src="./assets/copy_24px.svg"/></button><span id="opponent-copy-msg" class="message hide-text"></span></div>`;
	html += '</div>';

	return html;
}

function copyDeckCode(code, id_msg){
	var textArea = document.createElement('textarea');
	textArea.value = code;

	// Avoid scrolling to bottom
	textArea.style.top = "0";
	textArea.style.left = "0";
	textArea.style.position = "fixed";

	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();

	try
	{
		var successful = document.execCommand('copy');
		var msg = successful ? 'successful' : 'unsuccessful';
		console.log('Fallback: Copying text command was ' + msg);
		showFeedback(id_msg, interface.copied_deck);
	}
	catch(err)
	{
		console.error('Fallback: Oops, unable to copy', err);
		showFeedback(id_msg, interface.copied_deck_error);
	}

	document.body.removeChild(textArea);
}

function showFeedback(id_msg, feedback){
	const element = document.getElementById(id_msg);

	element.classList.remove('hide-text');
	element.innerHTML = feedback;

	setTimeout(() => {
		element.classList.add('hide-text');
	}, 1000);

	setTimeout(() => {
		element.innerHTML = '';
	}, 1500);
}

function renderDeck(index, name, first, deck, isPlayer){
	let html = '<div class="name-token-deck">';

	html += renderNameToken(name, first, isPlayer);

	let champions = [];
	let followers = [];
	let spells = [];
	let landmarks = [];

	deck.cards.map((card) => {
		if (card.type === 'champion'){
			champions.push(card);
		} else if (card.type === 'follower'){
			followers.push(card);
		} else if (card.type === 'spell'){
			spells.push(card);
		} else if (card.type === 'landmark'){
			landmarks.push(card);
		}
	});

	html += `<ul id="${index}-${isPlayer ? 'player' : 'opponent'}-deck" class="deck">`;
	html += renderCards('champion', interface.champions, champions, index, isPlayer);
	html += renderCards('follower', interface.followers, followers, index, isPlayer);
	html += renderCards('spell', interface.spells, spells, index, isPlayer);
	html += renderCards('landmark', interface.landmarks, landmarks, index, isPlayer);
	html += '</ul></div>';

	return html;
}

function renderNameToken(name, first, isPlayer){
	return `<div class="name-token${!isPlayer ? ' reverse-name-token': ''}"><span class="name">${name}</span>${first ? '<img class="token" src="./assets/attack_token.png"/>': ''}</div>`;
}

function renderCards(iconName, title, cards, index, isPlayer){
	let sum = 0;
	cards.map((card) => {
		sum += card.qty;
	});
	let html = `<li class="category"><img src="./assets/${iconName}.svg"/><h3>${title}</h3><span class="sum-qties">${sum}</span></li>`;

	cards.map((card) => {
		html += renderCard(card, index, isPlayer);
	});

	return html;
}

function renderCard(card, index, isPlayer){
	let html = `<li id="${index}-${isPlayer ? 'player': 'opponent'}-${card.cardCode}" class="card ${card.region}" ${getBackground(card.region, card.cardCode)} onMouseOver="renderCardImages('${card.cardCode}', ${vectorToString(card.associatedCards)}, ${index}, ${isPlayer});" onMouseOut="hideCardImages('${card.cardCode}', ${index}, ${isPlayer});">`;
	html += `<div class="mana-name"><span class="mana">${card.mana}</span><span class="card-name">${card.name}</span></div><span class="qty">x${card.qty}</span>`;
	html += '</li>';

	return html;
}

function getBackground(region, cardCode){
	let color = '';
	
	if (region == 'demacia'){
		color = '#dfcda2';
	} else if (region == 'freljord'){
		color = '#6bd3f7';
	} else if (region == 'noxus'){
		color = '#741514';
	} else if (region == 'ionia'){
		color = '#c05679';
	} else if (region == 'piltoverzaun'){
		color = '#eba857';
	} else if (region == 'shadowisles'){
		color = '#088c66';
	} else if (region == 'bilgewater'){
		color = '#822f20';
	} else if (region == 'targon'){
		color = '#3c26da';
	}

	return `style = "background: linear-gradient(90deg, ${color} 30%, #00000000 50%), url('https://cdn-lor.mobalytics.gg/production/images/cards-preview/${cardCode}.webp') no-repeat right top"`;
}

function vectorToString(vector){
	vector.map((item, index) => {
		vector[index] = `'${item}'`;
	});

	return `[${vector.join(',')}]`;
}

function renderCardImages(mainCardCode, associatedCardCodes, index, isPlayer){
	const deckElement = document.getElementById(`${index}-${isPlayer ? 'player' : 'opponent'}-deck`);
	const cardElement = document.getElementById(`${index}-${isPlayer ? 'player' : 'opponent'}-${mainCardCode}`);

	const associatedCardsElement = document.createElement('li');
	associatedCardsElement.id = `${index}-${isPlayer ? 'player' : 'opponent'}-${mainCardCode}-associated`;
	associatedCardsElement.classList.add('card-images');
	if (!isPlayer)	associatedCardsElement.classList.add('reverse-card-images');

	/* Tenho que trocar os endereços das imagens acrescentando o idioma do jogo */
	const mainImageElement = document.createElement('img');
	mainImageElement.src = `https://escolaruneterra.com.br/wp-content/uploads/cards/img/${localeGame}/${mainCardCode}.png`;
	associatedCardsElement.appendChild(mainImageElement);

	associatedCardCodes.map((code) => {
		const tempCardElement = document.createElement('img');
		tempCardElement.src = `https://escolaruneterra.com.br/wp-content/uploads/cards/img/${localeGame}/${code}.png`;
		associatedCardsElement.appendChild(tempCardElement);
	})

	deckElement.insertBefore(associatedCardsElement, cardElement);
}

function hideCardImages(mainCardCode, index, isPlayer){
	const deckElement = document.getElementById(`${index}-${isPlayer ? 'player' : 'opponent'}-deck`);
	const associatedCardsElement = document.getElementById(`${index}-${isPlayer ? 'player' : 'opponent'}-${mainCardCode}-associated`);
	
	deckElement.removeChild(associatedCardsElement);
}