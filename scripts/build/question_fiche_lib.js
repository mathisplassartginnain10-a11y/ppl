/**
 * Wrapper build Node — délègue à question_fiche_core.js
 */
'use strict';

const path = require('path');

module.exports = require(path.join(__dirname, '..', '..', 'assets', 'js', 'question_fiche_core.js'));
