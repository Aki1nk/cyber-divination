import test from 'node:test'; import assert from 'node:assert/strict'; import { castExternal } from '../../src/domain/casting/external.js';
test('external casting uses confirmed inputs',()=>assert.deepEqual(castExternal({objectTrigram:4,directionTrigram:3,count:'2',hourBranchNumber:7,confirmed:true}),{profileId:'external-object-direction-v1',upperNumber:4,lowerNumber:3,movingLine:6,rawTotal:'12'}));
test('mapping requires confirmation',()=>assert.throws(()=>castExternal({objectTrigram:4,directionTrigram:3,count:'2',hourBranchNumber:7,confirmed:false}),/确认物象映射/));
