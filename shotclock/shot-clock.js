const MODULE_NAME = 'Shot Clock';
const SETTING_NAME = 'shotClock';
let CONFIG_TURNLENGTH = 120;

let lastCombatantId = '';
let currentTimer = DEFAULT_TURN_LENGTH;
let myInterval;

const asMinutesSeconds = function(timer) {
  var minutes = Math.floor(timer / 60);
  var seconds = timer - (minutes * 60);
  if(seconds < 10) {seconds = "0" + seconds};
  return minutes + ":" + seconds;
}

const timerTracker = '<h2 class="shotClock">Time Remaining: <span class="timerTracker"></span></h2>';

/**
 * Shortcut to localize.
 *
 * @param key
 * @returns {string}
 */
const i18n = key => game.i18n.localize(key);

/**
 * Sets the settings or returns the current value.
 *
 * @param key
 * @param setting
 * @returns {*}
 */
const initSetting = (key, setting) => {
  let config;

  try {
    config = game.settings.get(MODULE_NAME, key);
  } catch (e) {
    if (e.message !== 'This is not a registered game setting') {
      throw e;
    }

    game.settings.register(MODULE_NAME, key, setting);
    config = game.settings.get(MODULE_NAME, key);
  }

  return config;
};

Hooks.on('renderCombatTrackerConfig', async (ctc, html) => {
  const data = {
    turnLength: DEFAULT_TURN_LENGTH,
  };

  const newOption = await renderTemplate(
    'modules/shot-clock/templates/combat-config.html',
    data
  );

  html.css({height: 'auto'}).find('button[name=submit]').before(newOption);
});

/**
 * Save the setting when closing the combat tracker config.
 */
Hooks.on('closeCombatTrackerConfig', async ({form}) => {
    CONFIG_TURNLENGTH = form.querySelector('#turnLength').value;
  // Save the setting when closing the combat tracker setting.
  await game.settings.set(MODULE_NAME, SETTING_NAME, CONFIG_TURNLENGTH);
});

Hooks.on('updateCombat', async (combat, update) => {
    if (combat.combatant) {
        if (update && lastCombatantId != combat.combatant._id) {
          currentTimer = CONFIG_TURNLENGTH;
          if (myInterval) {
            clearInterval(myInterval);
          }
          $('h2.shotClock').remove();
            lastCombatantId = combat.combatant._id;
            setTimeout(() => {
              $('li.combatant.active').each((idx, item) => { $(item).after(timerTracker)})
              myInterval = setInterval(() => {
                currentTimer = currentTimer -1;
                const display = asMinutesSeconds(currentTimer);
                $('span.timerTracker').html(display);
                if (currentTimer <= 0) {
                  clearInterval(myInterval);
                }
              }, 1000);
            }, 1500);
        }
    }
});

/**
 * Init the settings.
 */
Hooks.once('init', () => {
    CONFIG_TURNLENGTH = initSetting(SETTING_NAME, {
      name: i18n('COMBAT.RollGroupInitiative'),
      hint: i18n('COMBAT.RollGroupInitiativeHint'),
      default: CONFIG_TURNLENGTH,
      type: Number,
      scope: 'world',
      config: false,
    });
  });
