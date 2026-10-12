const E=require('../src/engine.js');const assert=require('node:assert/strict');
const start=performance.now();E.scrub('a'.repeat(100404),{note:false});assert(performance.now()-start<2000,'Long unbroken prose must scrub without quadratic scanning');console.log('PASS long scrub performance');
