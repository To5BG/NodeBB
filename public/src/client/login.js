'use strict';

const encodeHTMLRules = { '&': '&#38;', '<': '&#60;', '>': '&#62;', '"': '&#34;', "'": '&#39;', '/': '&#47;' };
const matchHTML = /&(?!#?\w+;)|<|>|"|'|/;
function sanitize(str) {
	if (!str) return str;
	return str.replace(matchHTML, m => encodeHTMLRules[m] || m);
}

define('forum/login', ['hooks', 'translator', 'jquery-form'], function (hooks, translator) {
	const Login = {
		_capsState: false,
	};

	Login.init = function () {
		const errorEl = $('#login-error-notify');
		const submitEl = $('#login');
		const formEl = $('#login-form');

		formEl.append('<div class="iconcaptcha-holder" data-theme="light"></div>');
		formEl.append('<script src="assets/src/client/icon-captcha.min.js" type="text/javascript"></script>');
		var impl = `
		IconCaptcha.init('.iconcaptcha-holder', {
				general: {
					validationPath: './validateCaptcha', // required, change path according to your installation.
					fontFamily: 'Poppins',
					credits: 'show',
				},
				security: {
					clickDelay: 500,
					hoverDetection: true,
					enableInitialMessage: true,
					initializeDelay: 500,
					selectionResetDelay: 3000,
					loadingAnimationDelay: 1000,
					invalidateTime: 1000 * 60, // 1 minute, in milliseconds
				},
				messages: {
					initialization: {
						verify: 'Verify that you are human.',
						loading: 'Loading challenge...'
					},
					header: 'Select the image displayed the <u>least</u> amount of times',
					correct: 'Verification complete.',
					incorrect: {
						title: 'Uh oh.',
						subtitle: "You've selected the wrong image."
					},
					timeout: {
						title: 'Please wait 60 sec.',
						subtitle: 'You made too many incorrect selections.'
					}
				}
			});
		`;
		formEl.append('<script type="text/javascript">' + impl + '</script>');

		submitEl.on('click', async function (e) {
			e.preventDefault();
			const username = $('#username').val();
			const password = $('#password').val();
			if (!username || !password) {
				errorEl.find('p').translateText('[[error:invalid-username-or-password]]');
				errorEl.show();
			} else {
				errorEl.hide();
				if (submitEl.hasClass('disabled')) {
					return;
				}

				const icse = $("[name='ic-hf-se']").val();
				const icid = $("[name='ic-hf-id']").val();
				const ichp = $("[name='ic-hf-hp']").val();

				const captchaQuery = '?username=' + sanitize(username) + '&password=' + sanitize(password) +
				(icse ? '&ic-hf-se=' + sanitize(icse) : '') +
				(icid ? '&ic-hf-id=' + sanitize(icid) : '') +
				'&ic-hf-hp=' + (ichp ? sanitize(ichp) : '');
				const chain = `.then((res) => {
					document.querySelector('#username').setAttribute('stat', res.status);
				});`;
				formEl.append('<script class="cval">fetch("./validateCaptcha' + captchaQuery + '")' + chain + '</script>');
				setTimeout(() => $('.cval').remove(), 6000);
				var left = false;
				var tt = setInterval(async () => {
					if ($('#username').attr('stat')) {
						if ($('#username').attr('stat') === '400') {
							errorEl.find('p').translateText('Bad captcha');
							errorEl.show();
						} else {
							errorEl.hide();
							submitEl.addClass('disabled');

							try {
								const hookData = await hooks.fire('filter:app.login', {
									username,
									password,
									cancel: false,
								});
								if (hookData.cancel) {
									submitEl.removeClass('disabled');
									return;
								}
							} catch (err) {
								errorEl.find('p').translateText(err.message);
								errorEl.show();
								submitEl.removeClass('disabled');
								return;
							}

							hooks.fire('action:app.login');
							formEl.ajaxSubmit({
								headers: {
									'x-csrf-token': config.csrf_token,
								},
								beforeSend: function () {
									app.flags._login = true;
								},
								success: function (data) {
									hooks.fire('action:app.loggedIn', data);
									const pathname = utils.urlToLocation(data.next).pathname;
									const params = utils.params({ url: data.next });
									params.loggedin = true;
									delete params.register; // clear register message incase it exists
									const qs = decodeURIComponent($.param(params));

									window.location.href = pathname + '?' + qs;
								},
								error: function (data) {
									let message = data.responseText;
									const errInfo = data.responseJSON;
									if (data.status === 403 && data.responseText === 'Forbidden') {
										window.location.href = config.relative_path + '/login?error=csrf-invalid';
									} else if (errInfo && errInfo.hasOwnProperty('banned_until')) {
										message = errInfo.banned_until ?
											translator.compile('error:user-banned-reason-until', (new Date(errInfo.banned_until).toLocaleString()), errInfo.reason) :
											'[[error:user-banned-reason, ' + errInfo.reason + ']]';
									} else if (data.status === 503) {
										message = 'Too many login requests. Please try again later.';
									}
									errorEl.find('p').translateText(message);
									errorEl.show();
									const resetTrigger = '<script class="cres">IconCaptcha.reset();</script>';
									formEl.append(resetTrigger);
									submitEl.removeClass('disabled');
									setTimeout(() => $('.cres').remove(), 3000);

									// Select the entire password if that field has focus
									if ($('#password:focus').length) {
										$('#password').select();
									}
								},
							});
						}
						clearInterval(tt);
						left = true;
					}
				}, 500);
				setTimeout(() => {
					clearInterval(tt);
					if (!left) {
						errorEl.find('p').translateText('Bad captcha');
						errorEl.show();
					}
				}, 6000);
			}
		});

		// Guard against caps lock
		Login.capsLockCheck(document.querySelector('#password'), document.querySelector('#caps-lock-warning'));

		$('#login-error-notify button').on('click', function (e) {
			e.preventDefault();
			errorEl.hide();
			return false;
		});

		if ($('#content #username').val()) {
			$('#content #password').val('').focus();
		} else {
			$('#content #username').focus();
		}
		$('#content #noscript').val('false');
	};

	Login.capsLockCheck = (inputEl, warningEl) => {
		const toggle = (state) => {
			warningEl.classList[state ? 'remove' : 'add']('hidden');
			warningEl.parentNode.classList[state ? 'add' : 'remove']('has-warning');
		};
		if (!inputEl) {
			return;
		}
		inputEl.addEventListener('keyup', function (e) {
			if (Login._capsState && e.key === 'CapsLock') {
				toggle(false);
				Login._capsState = !Login._capsState;
				return;
			}
			Login._capsState = e.getModifierState && e.getModifierState('CapsLock');
			toggle(Login._capsState);
		});

		if (Login._capsState) {
			toggle(true);
		}
	};

	return Login;
});
