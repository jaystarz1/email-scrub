const E=require('../src/engine.js');const assert=require('node:assert/strict');
const start=performance.now();assert.deepEqual(E.reviewFlags('a'.repeat(100404),[],[],[]),[]);assert(performance.now()-start<2000,'Long unbroken prose must not trigger quadratic review scanning');console.log('PASS long review performance');
